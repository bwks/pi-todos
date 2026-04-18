import { loadTodoState, saveTodoState } from "./todo-storage";
import type { TodoState } from "./todo-state";
import { cloneTodoState } from "./todo-state";

export async function resolveTodoState(cwd: string, fallbackState: TodoState): Promise<TodoState> {
	const storedState = await loadTodoState(cwd);
	if (storedState) {
		return storedState;
	}

	const nextState = cloneTodoState(fallbackState);
	if (nextState.todos.length > 0 || nextState.nextId > 1) {
		await saveTodoState(cwd, nextState);
	}
	return nextState;
}
