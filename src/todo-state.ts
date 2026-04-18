export interface Todo {
	id: number;
	text: string;
	done: boolean;
}

export interface TodoState {
	todos: Todo[];
	nextId: number;
}

export interface TodoDetails {
	action: "list" | "add" | "toggle" | "clear";
	todos: Todo[];
	nextId: number;
	error?: string;
}

export type TodoAction =
	| { action: "list" }
	| { action: "add"; text?: string }
	| { action: "toggle"; id?: number }
	| { action: "clear" };

export const initialTodoState = (): TodoState => ({ todos: [], nextId: 1 });

export function cloneTodos(todos: Todo[]): Todo[] {
	return todos.map((todo) => ({ ...todo }));
}

export function cloneTodoState(state: TodoState): TodoState {
	return {
		todos: cloneTodos(state.todos),
		nextId: state.nextId,
	};
}

export function restoreTodoState(history: Array<TodoDetails | undefined>): TodoState {
	let state = initialTodoState();

	for (const details of history) {
		if (!details) continue;
		state = {
			todos: cloneTodos(details.todos),
			nextId: details.nextId,
		};
	}

	return state;
}

function snapshot(state: TodoState, action: TodoDetails["action"], error?: string): TodoDetails {
	return {
		action,
		todos: cloneTodos(state.todos),
		nextId: state.nextId,
		...(error ? { error } : {}),
	};
}

export function applyTodoAction(
	state: TodoState,
	input: TodoAction,
): { state: TodoState; details: TodoDetails; text: string } {
	switch (input.action) {
		case "list":
			return {
				state: cloneTodoState(state),
				details: snapshot(state, "list"),
				text: state.todos.length
					? state.todos.map((todo) => `[${todo.done ? "x" : " "}] #${todo.id}: ${todo.text}`).join("\n")
					: "No todos",
			};

		case "add": {
			const text = input.text?.trim();
			if (!text) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "add", "text required"),
					text: "Error: non-empty text required for add",
				};
			}

			const nextState: TodoState = {
				todos: [...cloneTodos(state.todos), { id: state.nextId, text, done: false }],
				nextId: state.nextId + 1,
			};
			const added = nextState.todos[nextState.todos.length - 1];
			return {
				state: nextState,
				details: snapshot(nextState, "add"),
				text: `Added todo #${added.id}: ${added.text}`,
			};
		}

		case "toggle": {
			if (input.id === undefined || !Number.isInteger(input.id)) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "toggle", "id required"),
					text: "Error: integer id required for toggle",
				};
			}

			const nextTodos = cloneTodos(state.todos);
			const todo = nextTodos.find((item) => item.id === input.id);
			if (!todo) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "toggle", `#${input.id} not found`),
					text: `Todo #${input.id} not found`,
				};
			}

			todo.done = !todo.done;
			const nextState: TodoState = { todos: nextTodos, nextId: state.nextId };
			return {
				state: nextState,
				details: snapshot(nextState, "toggle"),
				text: `Todo #${todo.id} ${todo.done ? "completed" : "uncompleted"}`,
			};
		}

		case "clear": {
			const count = state.todos.length;
			const nextState = initialTodoState();
			return {
				state: nextState,
				details: snapshot(nextState, "clear"),
				text: `Cleared ${count} todos`,
			};
		}
	}
}
