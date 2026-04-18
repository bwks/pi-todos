import assert from "node:assert/strict";
import test from "node:test";

import { buildTodoFrameLine, getTodoOverlayOptions } from "../src/todo-ui";

test("getTodoOverlayOptions centers the todo popover with bounded size", () => {
	assert.deepEqual(getTodoOverlayOptions(), {
		anchor: "center",
		width: "70%",
		minWidth: 40,
		maxWidth: 96,
		maxHeight: "80%",
		margin: 1,
	});
});

test("buildTodoFrameLine pads ANSI-styled content to the full panel width", () => {
	const line = buildTodoFrameLine(20, "\u001b[31mhello\u001b[0m", (value) => `<${value}>`);
	assert.equal(line, "<│>\u001b[31mhello\u001b[0m             <│>");
});
