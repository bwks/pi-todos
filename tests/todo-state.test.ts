import assert from "node:assert/strict";
import test from "node:test";

import { applyTodoAction, initialTodoState, restoreTodoState } from "../src/todo-state";

test("add trims text, assigns ids, and defaults to unassigned status", () => {
	let state = initialTodoState();

	const first = applyTodoAction(state, { action: "add", text: "  write tests  " });
	state = first.state;
	assert.equal(first.text, "Added todo #1: write tests [unassigned]");
	assert.deepEqual(first.details.todos, [{ id: 1, text: "write tests", status: "unassigned" }]);

	const second = applyTodoAction(state, { action: "add", text: "ship it", status: "assigned" });
	assert.equal(second.text, "Added todo #2: ship it [assigned]");
	assert.deepEqual(second.details.todos, [
		{ id: 1, text: "write tests", status: "unassigned" },
		{ id: 2, text: "ship it", status: "assigned" },
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

	assert.equal(addedSnapshot[0].status, "unassigned");
	assert.equal(toggled.details.todos[0].status, "done");
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

test("set_status changes todo status explicitly", () => {
	const added = applyTodoAction(initialTodoState(), { action: "add", text: "task" });
	const updated = applyTodoAction(added.state, { action: "set_status", id: 1, status: "blocked" });

	assert.equal(updated.text, "Todo #1 set to blocked");
	assert.equal(updated.state.todos[0].status, "blocked");
});

test("set_status validates id and status", () => {
	const base = applyTodoAction(initialTodoState(), { action: "add", text: "task" }).state;

	const missingId = applyTodoAction(base, { action: "set_status", status: "assigned" });
	assert.equal(missingId.details.error, "id required");

	const missingStatus = applyTodoAction(base, { action: "set_status", id: 1 });
	assert.equal(missingStatus.details.error, "status required");
});

test("assign sets assignee and marks assigned when todo was unassigned", () => {
	const added = applyTodoAction(initialTodoState(), { action: "add", text: "delegate work" });
	const updated = applyTodoAction(added.state, { action: "assign", id: 1, assignee: "frontend-agent" });

	assert.equal(updated.text, "Todo #1 assigned to frontend-agent");
	assert.deepEqual(updated.state.todos[0], {
		id: 1,
		text: "delegate work",
		status: "assigned",
		assignee: "frontend-agent",
	});
});

test("assign without assignee keeps todo unchanged and reports error", () => {
	const base = applyTodoAction(initialTodoState(), { action: "add", text: "task" }).state;
	const result = applyTodoAction(base, { action: "assign", id: 1 });
	assert.equal(result.details.error, "assignee required");
});

test("workon assigns when unassigned and starts work", () => {
	const added = applyTodoAction(initialTodoState(), { action: "add", text: "delegate work" });
	const updated = applyTodoAction(added.state, { action: "workon", id: 1, assignee: "frontend-agent" });

	assert.equal(updated.text, "Todo #1 assigned to frontend-agent and marked in_progress");
	assert.deepEqual(updated.state.todos[0], {
		id: 1,
		text: "delegate work",
		status: "in_progress",
		assignee: "frontend-agent",
	});
});

test("workon on already assigned todo preserves assignee and just starts work", () => {
	const added = applyTodoAction(initialTodoState(), { action: "add", text: "task" });
	const assigned = applyTodoAction(added.state, { action: "assign", id: 1, assignee: "agent-a" });
	const working = applyTodoAction(assigned.state, { action: "workon", id: 1 });

	assert.equal(working.text, "Todo #1 started by agent-a");
	assert.deepEqual(working.state.todos[0], {
		id: 1,
		text: "task",
		status: "in_progress",
		assignee: "agent-a",
	});
});

test("workon validates id and requires assignee only when todo is unassigned", () => {
	const base = applyTodoAction(initialTodoState(), { action: "add", text: "task" }).state;

	const missingId = applyTodoAction(base, { action: "workon", assignee: "agent-a" });
	assert.equal(missingId.details.error, "id required");

	const missingAssignee = applyTodoAction(base, { action: "workon", id: 1 });
	assert.equal(missingAssignee.details.error, "assignee required");
});

test("clear resets todos and next id", () => {
	let state = initialTodoState();
	state = applyTodoAction(state, { action: "add", text: "one" }).state;
	state = applyTodoAction(state, { action: "add", text: "two", status: "in_progress" }).state;

	const cleared = applyTodoAction(state, { action: "clear" });
	assert.equal(cleared.text, "Cleared 2 todos");
	assert.deepEqual(cleared.state, initialTodoState());

	const addedAgain = applyTodoAction(cleared.state, { action: "add", text: "fresh" });
	assert.equal(addedAgain.details.todos[0].id, 1);
	assert.equal(addedAgain.details.todos[0].status, "unassigned");
});

test("restoreTodoState rebuilds from the latest stored snapshot and clones it", () => {
	const first = applyTodoAction(initialTodoState(), { action: "add", text: "first" });
	const second = applyTodoAction(first.state, { action: "workon", id: 1, assignee: "qa-agent" });

	const restored = restoreTodoState([undefined, first.details, second.details]);
	assert.deepEqual(restored, second.state);
	assert.notStrictEqual(restored.todos[0], second.details.todos[0]);

	second.details.todos[0].status = "cancelled";
	assert.equal(restored.todos[0].status, "in_progress");
});
