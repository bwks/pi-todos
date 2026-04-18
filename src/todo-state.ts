export const TODO_STATUSES = [
	"unassigned",
	"assigned",
	"in_progress",
	"blocked",
	"done",
	"cancelled",
] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

export interface Todo {
	id: number;
	text: string;
	status: TodoStatus;
	assignee?: string;
}

export interface TodoState {
	todos: Todo[];
	nextId: number;
}

export interface TodoDetails {
	action: "list" | "add" | "toggle" | "set_status" | "workon" | "clear";
	todos: Todo[];
	nextId: number;
	error?: string;
}

export type TodoAction =
	| { action: "list" }
	| { action: "add"; text?: string; status?: TodoStatus }
	| { action: "toggle"; id?: number }
	| { action: "set_status"; id?: number; status?: TodoStatus }
	| { action: "workon"; id?: number; assignee?: string }
	| { action: "clear" };

export const initialTodoState = (): TodoState => ({ todos: [], nextId: 1 });

export function isTodoStatus(value: unknown): value is TodoStatus {
	return typeof value === "string" && TODO_STATUSES.includes(value as TodoStatus);
}

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

function formatTodo(todo: Todo): string {
	const assignee = todo.assignee ? ` @${todo.assignee}` : "";
	return `[${todo.status}] #${todo.id}: ${todo.text}${assignee}`;
}

function findTodo(state: TodoState, id?: number) {
	if (id === undefined || !Number.isInteger(id)) {
		return { error: "id required" as const };
	}
	const todo = state.todos.find((item) => item.id === id);
	if (!todo) {
		return { error: `#${id} not found` as const };
	}
	return { todo };
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
				text: state.todos.length ? state.todos.map(formatTodo).join("\n") : "No todos",
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
			const status = input.status && isTodoStatus(input.status) ? input.status : "unassigned";

			const nextState: TodoState = {
				todos: [...cloneTodos(state.todos), { id: state.nextId, text, status }],
				nextId: state.nextId + 1,
			};
			const added = nextState.todos[nextState.todos.length - 1];
			return {
				state: nextState,
				details: snapshot(nextState, "add"),
				text: `Added todo #${added.id}: ${added.text} [${added.status}]`,
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

			todo.status = todo.status === "done" ? "unassigned" : "done";
			if (todo.status === "unassigned") delete todo.assignee;
			const nextState: TodoState = { todos: nextTodos, nextId: state.nextId };
			return {
				state: nextState,
				details: snapshot(nextState, "toggle"),
				text: `Todo #${todo.id} marked ${todo.status}`,
			};
		}

		case "set_status": {
			if (input.id === undefined || !Number.isInteger(input.id)) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "set_status", "id required"),
					text: "Error: integer id required for set_status",
				};
			}
			if (!input.status || !isTodoStatus(input.status)) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "set_status", "status required"),
					text: "Error: valid status required for set_status",
				};
			}

			const nextTodos = cloneTodos(state.todos);
			const todo = nextTodos.find((item) => item.id === input.id);
			if (!todo) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "set_status", `#${input.id} not found`),
					text: `Todo #${input.id} not found`,
				};
			}

			todo.status = input.status;
			if (input.status === "unassigned") delete todo.assignee;
			const nextState: TodoState = { todos: nextTodos, nextId: state.nextId };
			return {
				state: nextState,
				details: snapshot(nextState, "set_status"),
				text: `Todo #${todo.id} set to ${todo.status}`,
			};
		}

		case "workon": {
			if (input.id === undefined || !Number.isInteger(input.id)) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "workon", "id required"),
					text: "Error: integer id required for workon",
				};
			}
			const assignee = input.assignee?.trim();
			if (!assignee) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "workon", "assignee required"),
					text: "Error: assignee required for workon",
				};
			}

			const nextTodos = cloneTodos(state.todos);
			const todo = nextTodos.find((item) => item.id === input.id);
			if (!todo) {
				return {
					state: cloneTodoState(state),
					details: snapshot(state, "workon", `#${input.id} not found`),
					text: `Todo #${input.id} not found`,
				};
			}

			todo.assignee = assignee;
			todo.status = "in_progress";
			const nextState: TodoState = { todos: nextTodos, nextId: state.nextId };
			return {
				state: nextState,
				details: snapshot(nextState, "workon"),
				text: `Todo #${todo.id} assigned to ${assignee} and marked in_progress`,
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
