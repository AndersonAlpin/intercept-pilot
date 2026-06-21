# InterceptPilot

InterceptPilot is a Chrome/Edge MV3 extension for frontend development and QA. It can capture a browser tab, intercept HTTP(S) requests, mock responses, inspect captured traffic, and turn real requests into reusable rules.

The extension is built with vanilla JS/HTML/CSS and runs as an MV3 service worker with a compact Sidepanel UI plus a larger Full App UI.

## Project structure

- `src/background/*`: debugger runtime, rule engine, logger, service worker entrypoint.
- `src/shared/*`: constants, models, storage, messaging, validators, i18n, release notes, utils, and shared UI helpers.
- `src/sidepanel/*`: compact operational UI.
- `src/fullapp/*`: full management UI in dedicated extension tab.
- `packages/interceptpilot-mcp/*`: local MCP adapter and shared daemon for AI Bridge.
- `icons/*`: extension icons.
- `tools/*`: packaging and release helpers that do not ship inside the extension.
- `site/dist/*`: public static privacy policy site for Chrome Web Store and future product web presence.
- `docs/internal/*`: internal architecture and UI notes.
- `docs/plans/*`: implementation and investigation plans.
- `docs/releases/*`: release notes and publication copy.

## Load unpacked

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this folder.

## How to use

### Sidepanel (compact)

- Activate, restart, stop, and reload capture.
- Select the active collection and enable/disable it.
- Quick rule create/edit, bulk-friendly rule actions, and compact toggles.
- Quick Network view with local filters, request inspection, and create-rule actions.
- Quick Logs view with details.
- Open Full App for advanced editing.

### Full App (advanced)

- Collections management.
- Advanced rule editor (headers, resource type, priority, diagnostics state).
- Network table with filters, pagination, request inspector, copy as Fetch/cURL, and create rule from request.
- Logs, diagnostics, import/export, AI Bridge, settings, and update notes.

## AI Bridge / MCP

AI Bridge connects InterceptPilot to local AI agents through MCP. It exposes sanitized context, request/rule/log queries, match diagnostics, import proposals, assisted rule/collection actions, and captured-tab reload proposals through the local `packages/interceptpilot-mcp` adapter and shared daemon.

Detailed architecture and UI guidance live in `docs/internal/ai/architecture.md` and `docs/internal/ai/ui-patterns.md`. Package usage and local/dev configuration live in `packages/interceptpilot-mcp/README.md`.

## Network behavior

- Captured requests are kept in runtime for the current captured-tab load cycle.
- When the captured tab starts a real new page load/reload, Network is cleared once and a new cycle begins.
- Manual **Clear Network** still clears immediately.
- Network updates are batched to reduce UI churn during request bursts.
- Sidepanel and Full App apply filters before pagination.
- `maxNetworkEntries` is kept for settings compatibility, but it is not used as a destructive runtime trim.
- Reloads triggered by InterceptPilot first ensure the Full capture domains are ready when Full capture is active.

## Network ignore patterns

Network ignore patterns are user-configurable in **Settings** under **Hide requests containing**.

- The default list is empty.
- Patterns are visual filters only; matching requests are not discarded from runtime capture.
- Sidepanel and Full App share the same `settings.networkIgnorePatterns` array.
- Add patterns with Enter in the chips input, remove them with the chip close button.

## Updates

- Full App exposes update notes through the **Updates** sidebar item.
- The item shows an unread indicator until the current version is viewed.
- After the current version is viewed, the item remains available for a short window and then hides automatically.
- Update notes do not open automatically on app entry.

## Notes

- Storage source of truth: `chrome.storage.local`.
- Full capture session metadata is rehydrated from `chrome.storage.session` when possible.
- Default safety: `applyResponseBody = true`, `applyResponseHeaders = false`.
- Background keeps interception running even when sidepanel/full app is closed.
