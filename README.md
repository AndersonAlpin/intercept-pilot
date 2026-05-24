# InterceptPilot

InterceptPilot is a Chrome/Edge MV3 extension for frontend development and QA. It can attach to a browser tab, intercept HTTP(S) requests through the Chrome Debugger Protocol, mock responses, inspect captured traffic, and turn real requests into reusable rules.

The extension is built with vanilla JS/HTML/CSS and runs as an MV3 service worker with a compact Sidepanel UI plus a larger Full App UI.

## Project structure

- `src/background/*`: debugger runtime, rule engine, logger, service worker entrypoint.
- `src/shared/*`: constants, models, storage, messaging, validators, utils.
- `src/sidepanel/*`: compact operational UI.
- `src/fullapp/*`: full management UI in dedicated extension tab.
- `icons/*`: extension icons.

## Load unpacked

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this folder.

## How to use

### Sidepanel (compact)

- Attach/Reattach/Detach/Reload.
- Select active collection and enable/disable it.
- Quick rule create/edit and quick toggles.
- Quick Network view with local filters, compact pagination, request inspection, and create-rule actions.
- Quick logs.
- Open Full App for advanced editing.

### Full App (advanced)

- Collections management.
- Advanced rule editor (headers, resource type, priority, diagnostics state).
- Network table with filters, pagination, request inspector, copy as Fetch/cURL, and create rule from request.
- Logs, diagnostics, import/export and settings.

## Network behavior

- Captured requests are kept in runtime for the current attached-tab load cycle.
- When the attached tab starts a real new page load/reload, Network is cleared once and a new cycle begins.
- Manual **Clear Network** still clears immediately.
- Network updates are batched to reduce UI churn during request bursts.
- Sidepanel and Full App apply filters before pagination.
- `maxNetworkEntries` is kept for settings compatibility, but it is not used as a destructive runtime trim.
- Reloads triggered by InterceptPilot first ensure the debugger is attached and `Network`, `Runtime`, and `Fetch` domains are enabled.

## Network ignore patterns

Network ignore patterns are user-configurable in **Settings** under **Hide requests containing**.

- The default list is empty.
- Patterns are visual filters only; matching requests are not discarded from runtime capture.
- Sidepanel and Full App share the same `settings.networkIgnorePatterns` array.
- Add patterns with Enter in the chips input, remove them with the chip close button.

## Notes

- Storage source of truth: `chrome.storage.local`.
- Attached debugger session metadata is rehydrated from `chrome.storage.session` when possible.
- Default safety: `applyResponseBody = true`, `applyResponseHeaders = false`.
- Background keeps interception running even when sidepanel/full app is closed.
