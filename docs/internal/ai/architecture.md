# InterceptPilot Architecture Notes

## Overview

InterceptPilot is a Manifest V3 browser extension with a background service worker, shared domain helpers, and two UI surfaces: Sidepanel and Full App.

The codebase intentionally uses vanilla JavaScript, HTML templates, and CSS. There is no framework and no bundler.

## Main areas

`src/background/`

- Owns capture lifecycle, debugger integration, rule matching, runtime state, and broadcasts.
- `src/background/background.js` is the main orchestration file.
- `debugger.js` handles CDP / `chrome.debugger` work for Full capture.
- `runtime-state.js` stores in-memory capture/network/log/rule state.
- `rule-engine.js` evaluates rules against requests.
- `logger.js` records extension and page logs.

`src/shared/`

- Shared utilities, i18n, storage, messaging, models, validators, display helpers, and UI primitives.
- UI helpers in `src/shared/ui/` should remain pure HTML-string render helpers.

`src/sidepanel/`

- Compact UI for rules, network, logs, collection switching, and capture controls.
- Prioritizes density and truncation for long content.

`src/fullapp/`

- Larger workspace with dashboard, rules, collections, network, logs, import, diagnostics, and settings.
- Data-heavy pages use the Data Panel layout pattern.

## Capture flows

### Full capture

Full capture uses CDP through `chrome.debugger`.

General flow:

1. User activates capture.
2. Background attaches debugger to the active target tab.
3. Network/debugger events are collected and normalized.
4. Rule engine evaluates matching requests.
5. Runtime state is updated.
6. UI receives state broadcasts and renders visible Network/Logs for the active capture context.

Full capture can see more request types, but may conflict with DevTools or other debugger-based extensions.

### Light capture

Light capture avoids `chrome.debugger` and uses fetch interception plus basic page-log capture.

General flow:

1. User activates capture.
2. Background enables the lightweight interception path.
3. Fetch activity is collected with less coverage than Full capture.
4. Basic console/error activity is bridged from the page context into web logs.
5. Rule matching and UI updates follow the same high-level runtime state path.

Light capture is more compatible, but network interception is currently limited to fetch and page-log capture is not CDP-equivalent.

## Network flow

Network entries are created in the background and tagged with capture context where available, including active tab/cycle/session metadata.

UI code should use the shared capture-context helpers instead of showing raw historical entries directly. Network views must only show entries belonging to the active capture context.

Important UI files:

- `src/fullapp/components/network-page.js`
- `src/fullapp/components/network-inspector-modal.js`
- `src/sidepanel/components/network-quick-panel.js`

## Rules flow

Rules live in shared storage and are evaluated by the background rule engine.

UI pages should not change hit-state logic unless explicitly scoped. Preserve:

- rule enable/disable behavior;
- action badges;
- state badges/dots;
- hit counters;
- diagnostics fields used by rule state.

Important files:

- `src/background/rule-engine.js`
- `src/shared/rule-state.js`
- `src/fullapp/components/rules-page.js`
- `src/sidepanel/components/rules-quick-panel.js`

## Logs flow

Logs can come from page/web context or extension/internal context.

The main Logs UI should show logs for the active capture context. Internal diagnostics can remain visible in Diagnostics when appropriate.

Important files:

- `src/background/logger.js`
- `src/fullapp/components/logs-page.js`
- `src/sidepanel/components/logs-quick-panel.js`
- `src/shared/ui/log-detail.js`

## Sidepanel vs Full App

Sidepanel:

- Compact.
- Fast actions.
- Cards and short controls.
- Aggressive truncation for long URLs/logs.

Full App:

- Data Panels.
- Larger tables/lists.
- Header actions separated from filters.
- Footer counts/pagination outside scrollable bodies.

## Storage and state

Use shared storage helpers for persisted settings, collections, and rules. Runtime-only capture state should remain in the background runtime state unless there is a clear reason to persist it.

Avoid storage migrations unless explicitly scoped.

## Messaging and broadcasts

The background sends state updates to UIs. UI code should avoid direct runtime assumptions and should render from received state plus shared display/context helpers.

When changing message names or payloads, update both Full App and Sidepanel paths.

## Shared helpers

Shared helper locations:

- `src/shared/ui/`: HTML render primitives.
- `src/shared/capture-context.js`: active capture visibility filtering.
- `src/shared/network-display.js`: network display formatting.
- `src/shared/log-display.js`: log display formatting.
- `src/shared/i18n.js` and `src/shared/locales/`: visible labels.

Keep helpers small, explicit, and easy to validate.
