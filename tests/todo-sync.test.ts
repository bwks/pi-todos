import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveTodoState } from "../src/todo-sync";
import { loadTodoState } from "../src/todo-storage";
import type { TodoState } from "../src/todo-state";

async function makeTempProject(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), "pi-todos-sync-"));
}

test("resolveTodoState prefers the persisted json file over fallback state", async () => {
	const projectDir = await makeTempProject();
	const fallback: TodoState = {
		todos: [{ id: 1, text: "from fallback", status: "unassigned" }],
		nextId: 2,
	};
	const persisted: TodoState = {
		todos: [{ id: 7, text: "from disk", status: "done", assignee: "agent-a" }],
		nextId: 8,
	};

	const first = await resolveTodoState(projectDir, fallback);
	assert.deepEqual(first, fallback);

	const second = await resolveTodoState(projectDir, persisted);
	assert.deepEqual(second, fallback);
	assert.notDeepEqual(second, persisted);
	const onDisk = await loadTodoState(projectDir);
	assert.deepEqual(onDisk, fallback);
});

test("resolveTodoState persists fallback state when no json file exists", async () => {
	const projectDir = await makeTempProject();
	const fallback: TodoState = {
		todos: [{ id: 2, text: "seed from session", status: "assigned", assignee: "session-a" }],
		nextId: 3,
	};

	const resolved = await resolveTodoState(projectDir, fallback);
	assert.deepEqual(resolved, fallback);

	const persisted = await loadTodoState(projectDir);
	assert.deepEqual(persisted, fallback);
});
