# pi-todos

A session-based todo extension for [pi](https://github.com/mariozechner/pi-coding-agent).

It adds a `todo` tool for the agent and a `/todos` command for you. Todos are stored in pi session history, so they follow the current branch of the conversation instead of living in a shared project file.

## Features

- session-backed todos
- branch-aware state via pi session history
- `todo` tool for list/add/toggle/clear
- `/todos` command with a simple interactive view
- lightweight, no file-based todo database

## Install

Install from GitHub:

```bash
pi install git:github.com/bwks/pi-todos
```

Install for just one run:

```bash
pi -e git:github.com/bwks/pi-todos
```

## Usage

After installing, reload pi if needed:

```text
/reload
```

Then you can ask pi things like:

- add a todo to implement auth
- list todos
- mark todo #1 done
- clear todos

Open the todo list directly with:

```text
/todos
```

## How it works

This extension keeps todo state in tool result details inside the pi session. That means:

- todos survive reloads
- todos reconstruct correctly from session history
- todos follow forks and tree navigation
- different branches can have different todo states

This is intentionally different from a file-based todo system shared across sessions.

## Development

Run directly from this repo:

```bash
pi -e ./extensions/todos.ts
```

## Repository layout

- `extensions/todos.ts` — extension source
- `package.json` — pi package manifest
- `README.md` — documentation
- `LICENSE` — MIT license
