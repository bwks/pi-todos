import type { TodoAction, TodoStatus } from "./todo-state";
import { isTodoStatus } from "./todo-state";

export type ParsedTodoCommand =
	| { ok: true; mode: "ui" }
	| { ok: true; mode: "action"; action: TodoAction }
	| { ok: false; error: string };

function parseId(value: string | undefined, usage: string): number | ParsedTodoCommand {
	if (!value) return { ok: false, error: usage };
	const id = Number(value);
	if (!Number.isInteger(id)) return { ok: false, error: usage };
	return id;
}

function parseStatus(value: string | undefined, usage: string): TodoStatus | ParsedTodoCommand {
	if (!value || !isTodoStatus(value)) return { ok: false, error: usage };
	return value;
}

export function parseTodoCommandArgs(args: string | undefined): ParsedTodoCommand {
	const input = args?.trim() ?? "";
	if (!input) {
		return { ok: true, mode: "ui" };
	}

	const [command, ...rest] = input.split(/\s+/);

	switch (command) {
		case "add": {
			const text = rest.join(" ").trim();
			if (!text) return { ok: false, error: "Usage: /todo add <description>" };
			return { ok: true, mode: "action", action: { action: "add", text } };
		}

		case "list":
			return { ok: true, mode: "action", action: { action: "list" } };

		case "assign": {
			const id = parseId(rest[0], "Usage: /todo assign <id> [agent]");
			if (typeof id !== "number") return id;
			const assignee = rest.slice(1).join(" ").trim();
			return { ok: true, mode: "action", action: { action: "workon", id, ...(assignee ? { assignee } : {}) } };
		}

		case "status": {
			const id = parseId(rest[0], "Usage: /todo status <id> <status>");
			if (typeof id !== "number") return id;
			const status = parseStatus(rest[1], "Usage: /todo status <id> <status>");
			if (typeof status !== "string") return status;
			return { ok: true, mode: "action", action: { action: "set_status", id, status } };
		}

		case "done": {
			const id = parseId(rest[0], "Usage: /todo done <id>");
			if (typeof id !== "number") return id;
			return { ok: true, mode: "action", action: { action: "set_status", id, status: "done" } };
		}

		case "clear":
			return { ok: true, mode: "action", action: { action: "clear" } };

		default:
			return { ok: false, error: `Unknown /todo action: ${command}` };
	}
}
