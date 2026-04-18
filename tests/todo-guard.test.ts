import assert from "node:assert/strict";
import test from "node:test";

import { isTodoStatePath, shouldAllowTodoJsonInspection } from "../src/todo-guard";

test("isTodoStatePath matches direct and @-prefixed todo state paths", () => {
	const cwd = "/tmp/project";
	assert.equal(isTodoStatePath(cwd, ".pi/todos.json"), true);
	assert.equal(isTodoStatePath(cwd, "@.pi/todos.json"), true);
	assert.equal(isTodoStatePath(cwd, "src/index.ts"), false);
});

test("shouldAllowTodoJsonInspection only when user explicitly asks to inspect the file", () => {
	assert.equal(shouldAllowTodoJsonInspection("Inspect .pi/todos.json"), true);
	assert.equal(shouldAllowTodoJsonInspection("show raw .pi/todos.json file"), true);
	assert.equal(shouldAllowTodoJsonInspection("what todos are done?"), false);
	assert.equal(shouldAllowTodoJsonInspection("summarize todo status from the project"), false);
});
