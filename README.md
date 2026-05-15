# MockPilot

MockPilot is a Chrome/Edge MV3 extension to intercept HTTP requests and mock responses for frontend testing.

## Project structure

- `src/background/*`: debugger runtime, rule engine, logger, service worker entrypoint.
- `src/shared/*`: constants, models, storage, messaging, validators, utils.
- `src/sidepanel/*`: compact operational UI.
- `src/fullapp/*`: full management UI in dedicated extension tab.

## Load unpacked

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this folder.

## How to use

### Sidepanel (compact)
- Attach/Reattach/Detach/Reload.
- Select active collection and enable/disable it.
- Quick rule create/edit and quick toggles.
- Quick network and logs.
- Open Full App for advanced editing.

### Full App (advanced)
- Collections management.
- Advanced rule editor (headers, resource type, priority, diagnostics state).
- Network table and create rule from request.
- Logs, diagnostics, import/export and settings.

## Notes

- Storage source of truth: `chrome.storage.local`.
- Default safety: `applyResponseBody = true`, `applyResponseHeaders = false`.
- Background keeps interception running even when sidepanel/full app is closed.
