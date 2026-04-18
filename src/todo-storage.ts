import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Todo, TodoState } from "./todo-state";
import { cloneTodoState, initialTodoState, isTodoStatus } from "./todo-state";

interface LegacyTodo {
	id?: unknown;
	text?: unknown;
	done?: unknown;
	status?: unknown;
	assignee?: unknown;
}

interface PersistedTodoState {
	todos?: unknown;
	nextId?: unknown;
}

const TODO_STORAGE_DIR = ".pi";
const TODO_STORAGE_FILE = "todos.json";

function normalizeTodo(value: unknown): Todo | null {
	if (!value || typeof value !== "object") return null;
	const todo = value as LegacyTodo;
	if (typeof todo.id !== "number" || typeof todo.text !== "string") return null;

	const status = isTodoStatus(todo.status)
		? todo.status
		: typeof todo.done === "boolean"
			? todo.done
				? "done"
				: "unassigned"
			: "unassigned";
	const assignee = typeof todo.assignee === "string" && todo.assignee.trim() ? todo.assignee.trim() : undefined;
	return { id: todo.id, text: todo.text, status, ...(assignee ? { assignee } : {}) };
}

function normalizeTodoState(raw: PersistedTodoState | null | undefined): TodoState {
	if (!raw || typeof raw !== "object") return initialTodoState();

	const todos = Array.isArray(raw.todos) ? raw.todos.map(normalizeTodo).filter((todo): todo is Todo => todo !== null) : [];
	const highestId = todos.reduce((max, todo) => Math.max(max, todo.id), 0);
	const nextId =
		typeof raw.nextId === "number" && Number.isInteger(raw.nextId) && raw.nextId > highestId ? raw.nextId : highestId + 1;
	return { todos, nextId };
}

export function getTodoStoragePath(cwd: string): string {
	return path.join(cwd, TODO_STORAGE_DIR, TODO_STORAGE_FILE);
}

export async function loadTodoState(cwd: string): Promise<TodoState | null> {
	const storagePath = getTodoStoragePath(cwd);
	try {
		const content = await readFile(storagePath, "utf8");
		const parsed = JSON.parse(content) as PersistedTodoState;
		return normalizeTodoState(parsed);
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === "ENOENT") return null;
		throw error;
	}
}

export async function saveTodoState(cwd: string, state: TodoState): Promise<void> {
	const storagePath = getTodoStoragePath(cwd);
	await mkdir(path.dirname(storagePath), { recursive: true });
	await writeFile(storagePath, JSON.stringify(cloneTodoState(state), null, 2) + "\n", "utf8");
}
