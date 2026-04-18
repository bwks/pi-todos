import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { transform } from "esbuild";

test("todos extension source parses as valid TypeScript", async () => {
	const extensionPath = path.resolve(process.cwd(), "extensions/todos.ts");
	const source = await readFile(extensionPath, "utf8");

	await assert.doesNotReject(async () => {
		await transform(source, { loader: "ts", format: "esm" });
	});
});
