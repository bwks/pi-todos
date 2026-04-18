import path from "node:path";

export function isTodoStatePath(cwd: string, filePath: string): boolean {
	const normalized = filePath.startsWith("@") ? filePath.slice(1) : filePath;
	return path.resolve(cwd, normalized) === path.resolve(cwd, ".pi/todos.json");
}

export function shouldAllowTodoJsonInspection(prompt: string): boolean {
	const text = prompt.toLowerCase();
	return (
		text.includes(".pi/todos.json") &&
		(text.includes("inspect") || text.includes("show") || text.includes("raw") || text.includes("file"))
	);
}
