# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.3] - 2026-04-18

### Added
- `/todo workon <id> [agent]` as a separate command from `/todo assign`

### Changed
- `/todo assign` now handles assignment without implicitly starting work
- `/todo workon` now starts work on an already-assigned todo, or assigns it first when needed
- `/todo workon` now triggers an actual follow-up work prompt when the todo is assigned to the current session
- the extension now injects prompt guidance to treat `.pi/todos.json` as internal state and avoid surfacing raw storage details
- runtime guards now block direct `read`/`write`/`edit` access to `.pi/todos.json` unless the user explicitly asks to inspect that file

## [0.3.2] - 2026-04-18

### Fixed
- `/todo` now refreshes from `.pi/todos.json` every time the command runs so the UI and subcommands use the latest persisted state
- added integration-style coverage for preferring persisted `.pi/todos.json` state over fallback session state

## [0.3.1] - 2026-04-18

### Fixed
- renamed the slash command from `/todo workon` to `/todo assign` for clearer task ownership semantics and to avoid confusion about assignment vs. active work state

## [0.3.0] - 2026-04-18

### Added
- `/todo` subcommands for `list`, `status`, `done`, `workon`, and `clear`
- assignee tracking for delegated todo work
- command parser tests in `tests/todo-command.test.ts`

### Changed
- consolidated the user-facing slash commands under `/todo`
- `/todo` with no arguments now opens the todo UI
- removed the separate `/todos` command
- `/todo assign <id> [agent]` now records the agent name and defaults to the current session when no agent is provided

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
