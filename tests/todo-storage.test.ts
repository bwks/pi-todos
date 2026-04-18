import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getTodoStoragePath, loadTodoState, saveTodoState } from "../src/todo-storage";
import { initialTodoState, type TodoState } from "../src/todo-state";

async function makeTempProject(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), "pi-todos-"));
}

test("getTodoStoragePath stores todos in .pi/todos.json", () => {
	assert.equal(getTodoStoragePath("/tmp/project"), path.join("/tmp/project", ".pi", "todos.json"));
});

test("loadTodoState returns null when storage file does not exist", async () => {
	const projectDir = await makeTempProject();
	const state = await loadTodoState(projectDir);
	assert.equal(state, null);
});

test("saveTodoState persists and loadTodoState restores todo state", async () => {
	const projectDir = await makeTempProject();
	const state: TodoState = {
		todos: [{ id: 1, text: "persist me", status: "done" }],
		nextId: 2,
	};

	await saveTodoState(projectDir, state);
	const restored = await loadTodoState(projectDir);

	assert.deepEqual(restored, state);
	assert.notStrictEqual(restored?.todos[0], state.todos[0]);
});

test("loadTodoState normalizes invalid nextId and ignores malformed todos", async () => {
	const projectDir = await makeTempProject();
	const storagePath = getTodoStoragePath(projectDir);
	await mkdir(path.dirname(storagePath), { recursive: true });
	await writeFile(
		storagePath,
		JSON.stringify({
			todos: [
				{ id: 3, text: "valid", done: false },
				{ id: 4, text: "already migrated", status: "assigned" },
				{ id: "bad", text: "oops", done: false },
			],
			nextId: 1,
		}),
		"utf8",
	);

	const restored = await loadTodoState(projectDir);
	assert.deepEqual(restored, {
		todos: [
			{ id: 3, text: "valid", status: "unassigned" },
			{ id: 4, text: "already migrated", status: "assigned" },
		],
		nextId: 5,
	});
});

test("saveTodoState writes a readable JSON file", async () => {
	const projectDir = await makeTempProject();
	await saveTodoState(projectDir, initialTodoState());

	const raw = await readFile(getTodoStoragePath(projectDir), "utf8");
	assert.match(raw, /"todos": \[\]/);
	assert.match(raw, /"nextId": 1/);
});
