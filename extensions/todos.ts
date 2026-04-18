import path from "node:path";

import { StringEnum } from "@mariozechner/pi-ai";
import {
	type ExtensionAPI,
	type ExtensionContext,
	isToolCallEventType,
	type Theme,
	type ToolExecutionMode,
	withFileMutationQueue,
} from "@mariozechner/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { buildWorkonPrompt, parseTodoCommandArgs } from "../src/todo-command";
import { resolveTodoState } from "../src/todo-sync";
import { getTodoStoragePath, loadTodoState, saveTodoState } from "../src/todo-storage";
import {
	applyTodoAction,
	restoreTodoState,
	TODO_STATUSES,
	type Todo,
	type TodoDetails,
	type TodoStatus,
} from "../src/todo-state";

const TodoParams = Type.Object({
	action: StringEnum(["list", "add", "toggle", "set_status", "assign", "workon", "clear"] as const),
	text: Type.Optional(Type.String({ description: "Todo text (for add)" })),
	id: Type.Optional(Type.Number({ description: "Todo ID (for toggle/set_status/assign/workon)" })),
	status: Type.Optional(
		StringEnum([...TODO_STATUSES] as TodoStatus[], { description: "Todo status (for add/set_status)" }),
	),
	assignee: Type.Optional(Type.String({ description: "Agent/session responsible for the todo (for assign/workon)" })),
});

function formatStatus(status: TodoStatus): string {
	return status.replace(/_/g, " ");
}

function isClosedStatus(status: TodoStatus): boolean {
	return status === "done" || status === "cancelled";
}

function getStatusColor(status: TodoStatus): "dim" | "warning" | "success" | "accent" | "error" | "muted" {
	switch (status) {
		case "unassigned":
			return "muted";
		case "assigned":
			return "accent";
		case "in_progress":
			return "success";
		case "blocked":
			return "warning";
		case "done":
			return "dim";
		case "cancelled":
			return "error";
	}
}

function getStatusMarker(theme: Theme, status: TodoStatus): string {
	switch (status) {
		case "done":
			return theme.fg("success", "✓");
		case "cancelled":
			return theme.fg("error", "✕");
		case "blocked":
			return theme.fg("warning", "!");
		case "in_progress":
			return theme.fg("success", "▶");
		case "assigned":
			return theme.fg("accent", "•");
		case "unassigned":
			return theme.fg("dim", "○");
	}
}

function formatAssignee(assignee?: string): string {
	return assignee ? ` @${assignee}` : "";
}

class TodoListComponent {
	private todos: Todo[];
	private theme: Theme;
	private onClose: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(todos: Todo[], theme: Theme, onClose: () => void) {
		this.todos = todos;
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines: string[] = [];
		const th = this.theme;

		lines.push("");
		const title = th.fg("accent", " Todos ");
		const headerLine =
			th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
		lines.push(truncateToWidth(headerLine, width));
		lines.push("");

		if (this.todos.length === 0) {
			lines.push(truncateToWidth(`  ${th.fg("dim", "No todos yet. Ask the agent to add some!")}`, width));
		} else {
			const done = this.todos.filter((t) => t.status === "done").length;
			const total = this.todos.length;
			lines.push(truncateToWidth(`  ${th.fg("muted", `${done}/${total} done`)}`, width));
			lines.push("");

			for (const todo of this.todos) {
				const marker = getStatusMarker(th, todo.status);
				const id = th.fg("accent", `#${todo.id}`);
				const status = th.fg(getStatusColor(todo.status), `[${formatStatus(todo.status)}]`);
				const text = isClosedStatus(todo.status) ? th.fg("dim", todo.text) : th.fg("text", todo.text);
				const assignee = todo.assignee ? th.fg("accent", formatAssignee(todo.assignee)) : "";
				lines.push(truncateToWidth(`  ${marker} ${id} ${status} ${text}${assignee}`, width));
			}
		}

		lines.push("");
		lines.push(truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width));
		lines.push("");

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}
}

export default function (pi: ExtensionAPI) {
	let todos: Todo[] = [];
	let nextId = 1;
	let allowTodoJsonInspection = false;

	const isTodoStatePath = (cwd: string, filePath: string) => {
		const normalized = filePath.startsWith("@") ? filePath.slice(1) : filePath;
		return path.resolve(cwd, normalized) === getTodoStoragePath(cwd);
	};

	const reconstructSessionState = (ctx: ExtensionContext) => {
		const history: Array<TodoDetails | undefined> = [];
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			const msg = entry.message;
			if (msg.role !== "toolResult" || msg.toolName !== "todo") continue;
			history.push(msg.details as TodoDetails | undefined);
		}
		return restoreTodoState(history);
	};

	const syncState = async (ctx: ExtensionContext) => {
		const restored = reconstructSessionState(ctx);
		const resolved = await resolveTodoState(ctx.cwd, restored);
		todos = resolved.todos;
		nextId = resolved.nextId;
	};

	pi.on("session_start", async (_event, ctx) => syncState(ctx));
	pi.on("session_tree", async (_event, ctx) => syncState(ctx));
	pi.on("before_agent_start", async (event) => {
		const prompt = event.prompt.toLowerCase();
		allowTodoJsonInspection =
			prompt.includes(".pi/todos.json") &&
			(prompt.includes("inspect") || prompt.includes("show") || prompt.includes("raw") || prompt.includes("file"));
		
		return {
		return {
			systemPrompt:
				event.systemPrompt +
				"\n\nTodo extension guidance:\n- Treat .pi/todos.json as internal state for the todo system.\n- Do not expose raw contents, diffs, or direct read/write operations involving .pi/todos.json unless the user explicitly asks to inspect that file.\n- When reading or updating todos, summarize changes in user-facing language instead of showing storage-level details.",
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (allowTodoJsonInspection) return;

		if (isToolCallEventType("read", event) && isTodoStatePath(ctx.cwd, event.input.path)) {
			return { block: true, reason: "Use the todo system instead of reading .pi/todos.json directly." };
		}

		if (isToolCallEventType("write", event) && isTodoStatePath(ctx.cwd, event.input.path)) {
			return { block: true, reason: "Use the todo system instead of writing .pi/todos.json directly." };
		}

		if (isToolCallEventType("edit", event) && event.input.path && isTodoStatePath(ctx.cwd, event.input.path)) {
			return { block: true, reason: "Use the todo system instead of editing .pi/todos.json directly." };
		}
	});

	pi.registerTool({
		name: "todo",
		label: "Todo",
		description:
			"Manage a todo list. Actions: list, add (text/status), toggle (id), set_status (id/status), assign (id/assignee), workon (id/assignee), clear",
		promptSnippet: "Manage project todos (list/add/toggle/set_status/assign/workon/clear)",
		promptGuidelines: [
			"Treat .pi/todos.json as internal state for this extension; do not show raw file contents or diffs unless the user explicitly asks to inspect that file.",
			"When reporting todo changes, summarize them in user-facing language such as started, assigned, done, or blocked instead of describing storage operations.",
		],
		parameters: TodoParams,
		executionMode: "sequential" as ToolExecutionMode,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const storagePath = getTodoStoragePath(ctx.cwd);
			return withFileMutationQueue(storagePath, async () => {
				const baseState = (await loadTodoState(ctx.cwd)) ?? { todos, nextId };
				const result = applyTodoAction(baseState, params);
				await saveTodoState(ctx.cwd, result.state);
				todos = result.state.todos;
				nextId = result.state.nextId;
				return {
					content: [{ type: "text", text: result.text }],
					details: result.details,
				};
			});
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
			if (args.text) text += ` ${theme.fg("dim", `"${args.text}"`)}`;
			if (args.id !== undefined) text += ` ${theme.fg("accent", `#${args.id}`)}`;
			if (args.status) text += ` ${theme.fg(getStatusColor(args.status), `[${formatStatus(args.status)}]`)}`;
			if (args.assignee) text += ` ${theme.fg("accent", `@${args.assignee}`)}`;
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme) {
			const details = result.details as TodoDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			const todoList = details.todos;
			switch (details.action) {
				case "list": {
					if (todoList.length === 0) {
						return new Text(theme.fg("dim", "No todos"), 0, 0);
					}
					let listText = theme.fg("muted", `${todoList.length} todo(s):`);
					const display = expanded ? todoList : todoList.slice(0, 5);
					for (const t of display) {
						const marker = getStatusMarker(theme, t.status);
						const status = theme.fg(getStatusColor(t.status), `[${formatStatus(t.status)}]`);
						const itemText = isClosedStatus(t.status) ? theme.fg("dim", t.text) : theme.fg("muted", t.text);
						const assignee = t.assignee ? theme.fg("accent", formatAssignee(t.assignee)) : "";
						listText += `\n${marker} ${theme.fg("accent", `#${t.id}`)} ${status} ${itemText}${assignee}`;
					}
					if (!expanded && todoList.length > 5) {
						listText += `\n${theme.fg("dim", `... ${todoList.length - 5} more`)}`;
					}
					return new Text(listText, 0, 0);
				}
				case "add": {
					const added = todoList[todoList.length - 1];
					if (!added) {
						return new Text(theme.fg("muted", "Added todo"), 0, 0);
					}
					return new Text(
						theme.fg("success", "✓ Added ") +
							theme.fg("accent", `#${added.id}`) +
							" " +
							theme.fg("muted", added.text) +
							" " +
							theme.fg(getStatusColor(added.status), `[${formatStatus(added.status)}]`) +
							(added.assignee ? ` ${theme.fg("accent", `@${added.assignee}`)}` : ""),
						0,
						0,
					);
				}
				case "toggle":
				case "set_status":
				case "assign":
				case "workon": {
					const text = result.content[0];
					const msg = text?.type === "text" ? text.text : "";
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", msg), 0, 0);
				}
				case "clear":
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Cleared all todos"), 0, 0);
			}
		},
	});

	pi.registerCommand("todo", {
		description: "Open the todo UI or run a subcommand like /todo add <description>",
		handler: async (args, ctx) => {
			await syncState(ctx);
			const parsed = parseTodoCommandArgs(args);
			if (!parsed.ok) {
				if (ctx.hasUI) ctx.ui.notify(parsed.error, "error");
				else console.log(parsed.error);
				return;
			}

			if (parsed.mode === "ui") {
				if (!ctx.hasUI) {
					console.log("/todo requires interactive mode or a subcommand like /todo add <description>");
					return;
				}

				await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
					return new TodoListComponent(todos, theme, () => done());
				});
				return;
			}

			const action =
				(parsed.action.action === "assign" || parsed.action.action === "workon") && !parsed.action.assignee
					? { ...parsed.action, assignee: ctx.sessionManager.getSessionId() }
					: parsed.action;

			const storagePath = getTodoStoragePath(ctx.cwd);
			const result = await withFileMutationQueue(storagePath, async () => {
				const baseState = (await loadTodoState(ctx.cwd)) ?? { todos, nextId };
				const next = applyTodoAction(baseState, action);
				await saveTodoState(ctx.cwd, next.state);
				todos = next.state.todos;
				nextId = next.state.nextId;
				return next;
			});

			if (result.details.error) {
				if (ctx.hasUI) ctx.ui.notify(result.text, "error");
				else console.log(result.text);
				return;
			}

			if (action.action === "list") {
				if (ctx.hasUI) {
					await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
						return new TodoListComponent(todos, theme, () => done());
					});
				} else {
					console.log(result.text);
				}
				return;
			}

			if (action.action === "workon") {
				const updatedTodo = result.state.todos.find((todo) => todo.id === action.id);
				const currentSessionId = ctx.sessionManager.getSessionId();
				if (updatedTodo?.assignee === currentSessionId) {
					pi.sendUserMessage(buildWorkonPrompt(updatedTodo));
					if (ctx.hasUI) ctx.ui.notify(`Started work on #${updatedTodo.id}`, "success");
					return;
				}
			}

			if (ctx.hasUI) ctx.ui.notify(result.text, "success");
			else console.log(result.text);
		},
	});
}
