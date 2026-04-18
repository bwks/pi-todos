import { StringEnum } from "@mariozechner/pi-ai";
import {
	type ExtensionAPI,
	type ExtensionContext,
	type Theme,
	type ToolExecutionMode,
	withFileMutationQueue,
} from "@mariozechner/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
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
	action: StringEnum(["list", "add", "toggle", "set_status", "clear"] as const),
	text: Type.Optional(Type.String({ description: "Todo text (for add)" })),
	id: Type.Optional(Type.Number({ description: "Todo ID (for toggle/set_status)" })),
	status: Type.Optional(
		StringEnum([...TODO_STATUSES] as TodoStatus[], { description: "Todo status (for add/set_status)" }),
	),
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
				lines.push(truncateToWidth(`  ${marker} ${id} ${status} ${text}`, width));
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
		const storedState = await loadTodoState(ctx.cwd);
		if (storedState) {
			todos = storedState.todos;
			nextId = storedState.nextId;
			return;
		}

		const restored = reconstructSessionState(ctx);
		todos = restored.todos;
		nextId = restored.nextId;
		if (restored.todos.length > 0 || restored.nextId > 1) {
			await saveTodoState(ctx.cwd, restored);
		}
	};

	pi.on("session_start", async (_event, ctx) => syncState(ctx));
	pi.on("session_tree", async (_event, ctx) => syncState(ctx));

	pi.registerTool({
		name: "todo",
		label: "Todo",
		description: "Manage a todo list. Actions: list, add (text/status), toggle (id), set_status (id/status), clear",
		promptSnippet: "Manage project todos (list/add/toggle/set_status/clear)",
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
						listText += `\n${marker} ${theme.fg("accent", `#${t.id}`)} ${status} ${itemText}`;
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
							theme.fg(getStatusColor(added.status), `[${formatStatus(added.status)}]`),
						0,
						0,
					);
				}
				case "toggle":
				case "set_status": {
					const text = result.content[0];
					const msg = text?.type === "text" ? text.text : "";
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", msg), 0, 0);
				}
				case "clear":
					return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Cleared all todos"), 0, 0);
			}
		},
	});

	pi.registerCommand("todos", {
		description: "Show all todos for the current project",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/todos requires interactive mode", "error");
				return;
			}

			await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
				return new TodoListComponent(todos, theme, () => done());
			});
		},
	});
}
