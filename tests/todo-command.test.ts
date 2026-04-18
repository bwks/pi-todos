import assert from "node:assert/strict";
import test from "node:test";

import { parseTodoCommandArgs } from "../src/todo-command";

test("parseTodoCommandArgs uses UI mode for empty input", () => {
	assert.deepEqual(parseTodoCommandArgs(undefined), {
		ok: true,
		mode: "ui",
	});
});

test("parseTodoCommandArgs parses add command", () => {
	const parsed = parseTodoCommandArgs("add write docs");
	assert.deepEqual(parsed, {
		ok: true,
		mode: "action",
		action: {
			action: "add",
			text: "write docs",
		},
	});
});

test("parseTodoCommandArgs parses list command", () => {
	assert.deepEqual(parseTodoCommandArgs("list"), {
		ok: true,
		mode: "action",
		action: { action: "list" },
	});
});

test("parseTodoCommandArgs parses assign command", () => {
	assert.deepEqual(parseTodoCommandArgs("assign 3 reviewer-agent"), {
		ok: true,
		mode: "action",
		action: {
			action: "workon",
			id: 3,
			assignee: "reviewer-agent",
		},
	});
});

test("parseTodoCommandArgs parses status command", () => {
	assert.deepEqual(parseTodoCommandArgs("status 2 blocked"), {
		ok: true,
		mode: "action",
		action: {
			action: "set_status",
			id: 2,
			status: "blocked",
		},
	});
});

test("parseTodoCommandArgs parses done command", () => {
	assert.deepEqual(parseTodoCommandArgs("done 2"), {
		ok: true,
		mode: "action",
		action: {
			action: "set_status",
			id: 2,
			status: "done",
		},
	});
});

test("parseTodoCommandArgs parses clear command", () => {
	assert.deepEqual(parseTodoCommandArgs("clear"), {
		ok: true,
		mode: "action",
		action: { action: "clear" },
	});
});

test("parseTodoCommandArgs rejects unsupported actions", () => {
	assert.deepEqual(parseTodoCommandArgs("bogus"), {
		ok: false,
		error: "Unknown /todo action: bogus",
	});
});

test("parseTodoCommandArgs rejects add without text", () => {
	assert.deepEqual(parseTodoCommandArgs("add   "), {
		ok: false,
		error: "Usage: /todo add <description>",
	});
});

test("parseTodoCommandArgs allows assign without agent", () => {
	assert.deepEqual(parseTodoCommandArgs("assign 3"), {
		ok: true,
		mode: "action",
		action: {
			action: "workon",
			id: 3,
		},
	});
});
