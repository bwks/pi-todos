# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.0] - 2026-04-18

### Added
- `/todo` subcommands for `list`, `status`, `done`, `workon`, and `clear`
- assignee tracking for delegated todo work
- command parser tests in `tests/todo-command.test.ts`

### Changed
- consolidated the user-facing slash commands under `/todo`
- `/todo` with no arguments now opens the todo UI
- removed the separate `/todos` command
- `/todo workon <id> [agent]` now marks a todo `in_progress`, records the agent name, and defaults to the current session when no agent is provided

## [0.2.0] - 2026-04-18

### Added
- project-local todo persistence in `.pi/todos.json`
- richer todo statuses: `unassigned`, `assigned`, `in_progress`, `blocked`, `done`, `cancelled`
- `set_status` todo action
- storage tests in `tests/todo-storage.test.ts`
- `CHANGELOG.md`

### Changed
- todo storage now persists across pi sessions in the same repo
- `toggle` now switches between `unassigned` and `done`
- todo UI and tool rendering now display status labels and status-specific markers/colors
- README updated with local install/dev instructions and persistence/status documentation

### Compatibility
- existing stored/session todos using legacy `done: boolean` are migrated automatically to status-based todos

## [0.1.0] - 2026-04-18

### Added
- initial pi package structure for GitHub distribution
- `todo` tool and `/todos` command
- session-backed todo state reconstruction
- unit tests for todo state logic
- MIT license, README, and package metadata
