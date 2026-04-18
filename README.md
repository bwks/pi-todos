# pi-todos

A project-based todo extension for [pi](https://github.com/mariozechner/pi-coding-agent).

It adds a `todo` tool for the agent and a `/todos` command for you. Todos are stored in a project-local file so they can be reused across pi sessions in the same repository.

## Features

- project-local persistent todos stored in `.pi/todos.json`
- reusable across pi sessions in the same repo
- migration fallback from older session-only todo history
- `todo` tool for list/add/toggle/set_status/clear
- `/todos` command with a simple interactive view

## Install

Install from GitHub:

```bash
pi install git:github.com/bwks/pi-todos
```

Install this local repo into the current project while developing:

```bash
pi install -l .
```

Install for just one run:

```bash
pi -e git:github.com/bwks/pi-todos
```

### Development install options

- `pi install -l .`
  - installs this repo into the current project's pi settings
  - good when you want to run pi normally in this repo while developing

- `pi -e .`
  - loads this repo as a temporary extension/package for a single run
  - good for quick testing without changing settings

- `pi -e ./extensions/todos.ts`
  - loads just the extension file for a single run
  - useful for focused extension development

## Usage

After installing, reload pi if needed:

```text
/reload
```

Then you can ask pi things like:

- add a todo to implement auth
- list todos
- mark todo #1 done
- set todo #2 to blocked
- clear todos

Open the todo list directly with:

```text
/todos
```

## How it works

This extension stores todos in `.pi/todos.json` in the current project. That means:

- todos survive reloads
- todos are shared across pi sessions in the same repo
- todo changes persist even after exiting pi
- todos support statuses like `unassigned`, `assigned`, `in_progress`, `blocked`, `done`, and `cancelled`
- tool result details are still used for rendering and session history

If you used an older session-only version of this extension, it will fall back to session history the first time and write the restored state into `.pi/todos.json`.

## Development

Run directly from this repo:

```bash
pi -e ./extensions/todos.ts
```

## Repository layout

- `extensions/todos.ts` — extension source
- `src/todo-state.ts` — pure todo state logic
- `src/todo-storage.ts` — project-local persistence helpers
- `tests/` — unit tests
- `package.json` — pi package manifest
- `README.md` — documentation
- `LICENSE` — MIT license
