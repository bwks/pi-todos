import assert from "node:assert/strict";
import test from "node:test";

import { applyTodoAction, initialTodoState, restoreTodoState } from "../src/todo-state";

test("add trims text and assigns ids", () => {
	let state = initialTodoState();

	const first = applyTodoAction(state, { action: "add", text: "  write tests  " });
	state = first.state;
	assert.equal(first.text, "Added todo #1: write tests");
	assert.deepEqual(first.details.todos, [{ id: 1, text: "write tests", done: false }]);

	const second = applyTodoAction(state, { action: "add", text: "ship it" });
	assert.equal(second.text, "Added todo #2: ship it");
	assert.deepEqual(second.details.todos, [
		{ id: 1, text: "write tests", done: false },
		{ id: 2, text: "ship it", done: false },
	]);
});

test("add rejects empty text", () => {
	const result = applyTodoAction(initialTodoState(), { action: "add", text: "   " });
	assert.equal(result.text, "Error: non-empty text required for add");
	assert.equal(result.details.error, "text required");
	assert.deepEqual(result.state, initialTodoState());
});

test("toggle updates current state without mutating older snapshots", () => {
	const added = applyTodoAction(initialTodoState(), { action: "add", text: "keep snapshot stable" });
	const addedSnapshot = added.details.todos;

	const toggled = applyTodoAction(added.state, { action: "toggle", id: 1 });

	assert.equal(addedSnapshot[0].done, false);
	assert.equal(toggled.details.todos[0].done, true);
	assert.notStrictEqual(addedSnapshot[0], toggled.details.todos[0]);
});

test("toggle rejects missing or non-integer ids", () => {
	const base = applyTodoAction(initialTodoState(), { action: "add", text: "task" }).state;

	const missing = applyTodoAction(base, { action: "toggle" });
	assert.equal(missing.text, "Error: integer id required for toggle");
	assert.equal(missing.details.error, "id required");

	const fractional = applyTodoAction(base, { action: "toggle", id: 1.5 });
	assert.equal(fractional.text, "Error: integer id required for toggle");
	assert.equal(fractional.details.error, "id required");
});

test("clear resets todos and next id", () => {
	let state = initialTodoState();
	state = applyTodoAction(state, { action: "add", text: "one" }).state;
	state = applyTodoAction(state, { action: "add", text: "two" }).state;

	const cleared = applyTodoAction(state, { action: "clear" });
	assert.equal(cleared.text, "Cleared 2 todos");
	assert.deepEqual(cleared.state, initialTodoState());

	const addedAgain = applyTodoAction(cleared.state, { action: "add", text: "fresh" });
	assert.equal(addedAgain.details.todos[0].id, 1);
});

test("restoreTodoState rebuilds from the latest stored snapshot and clones it", () => {
	const first = applyTodoAction(initialTodoState(), { action: "add", text: "first" });
	const second = applyTodoAction(first.state, { action: "toggle", id: 1 });

	const restored = restoreTodoState([undefined, first.details, second.details]);
	assert.deepEqual(restored, second.state);
	assert.notStrictEqual(restored.todos[0], second.details.todos[0]);

	second.details.todos[0].done = false;
	assert.equal(restored.todos[0].done, true);
});
