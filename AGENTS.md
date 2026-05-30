# InterceptPilot Agent Guide

## Product overview

InterceptPilot is a Chrome/Edge Manifest V3 extension for frontend development and QA. It helps capture, inspect, mock, and control HTTP requests while testing applications.

The product has two main UIs:

- Sidepanel: compact, fast access to rules, network, logs, and the active collection.
- Full App: complete workspace for dashboard, rules, collections, network, logs, import, diagnostics, and settings.

InterceptPilot supports two capture modes:

- Full capture
- Light capture

## Repository path

Current repository path:

`D:\Biblioteca\Development\GitHub\Anderson\intercept-pilot`

Do not use the old path:

`D:\Biblioteca\Development\GitHub\Anderson\InterceptPilot`

## Stack

- Vanilla JavaScript, HTML, and CSS.
- No React or Vue.
- No bundler.
- Chrome/Edge Manifest V3.
- Background service worker.
- UI surfaces in Sidepanel and Full App.
- Shared helpers live in `src/shared`.

## Architecture map

`src/background/`

- `src/background/background.js`: main service worker orchestration, message handling, capture lifecycle, broadcasts.
- `debugger.js`: Chrome debugger/CDP integration for full capture.
- `runtime-state.js`: in-memory runtime state.
- `rule-engine.js`: rule matching and response behavior.
- `logger.js`: extension/runtime logging helpers.

`src/shared/`

- Storage and messaging helpers.
- i18n and locale files.
- General utilities.
- `src/shared/ui/` primitives.
- Shared models and validators.

`src/sidepanel/`

- Compact UI for daily workflows.
- Should stay dense, readable, and careful with long URLs/logs.

`src/fullapp/`

- Full UI workspace.
- Uses Data Panels for data-heavy screens.

## Capture modes

Official UI terminology:

- Auto
- Full capture
- Light capture

Technical mapping:

- Full capture = CDP / `chrome.debugger`.
- Light capture = fetch interception plus basic page logs without debugger.

Full capture sees more request types, but can conflict with DevTools or other debugger-based extensions.

Light capture is more compatible because it avoids the debugger, but network interception is currently limited to fetch.

Use these UI labels:

- Activate capture
- Restart capture
- Stop capture
- Reload
- Capture new tab

Avoid these terms in the main UI:

- Attach
- Detach
- Reattach
- Anexar
- Desanexar
- Reanexar
- Compatibility Mode
- CDP Mode
- Mockar

## UI terminology

Official PT terms:

- Captura ativa
- Captura inativa
- Captura completa
- Captura leve
- Criar regra
- Limpar rede
- Limpar logs
- Automático

Official EN terms:

- Capture active
- Capture inactive
- Full capture
- Light capture
- Create rule
- Clear network
- Clear logs
- Auto

Official ES terms:

- Captura activa
- Captura inactiva
- Captura completa
- Captura ligera
- Crear regla
- Limpiar red
- Limpiar logs
- Automático

## Shared UI primitives

Shared UI helpers already exist in `src/shared/ui/`:

- `dom`
- `empty-state`
- `badge`
- `button`
- `icon-button`
- `pagination`
- `rule-status`
- `form`
- `select`
- `toggle`
- `modal-shell`
- `data-panel`
- `count`
- `log-detail`

Rules for shared UI helpers:

- Keep helpers pure.
- Return HTML strings.
- Do not use Chrome APIs.
- Do not call `sendMessage`.
- Do not know Full App or Sidepanel state.
- Preserve `escapeHtml`, i18n, ARIA attributes, ids, handlers, and `data-*` attributes.

## UI layout rules

Full App data-heavy screens use Data Panels:

- Actions live in the header.
- Filters live in the filters area.
- Body/list/table may have internal scroll.
- Footer/count/pagination stays outside the scroll area.
- Preserve spacing near scrollbars, especially beside action columns.

Sidepanel rules:

- Keep UI compact.
- Long URLs and logs must be truncated in lists/cards.
- Full content should be available in details or tooltip/title when appropriate.

## Coding conventions

- Use 2 spaces.
- Use single quotes.
- Do not add semicolons unless the surrounding file already requires them.
- Preserve the existing lint/style.
- Do not use inline `onclick`.
- Use event delegation when it fits the existing pattern.
- Preserve ids, `data-*` attributes, and handlers.
- Use i18n for visible text.
- Use `escapeHtml` for dynamic data in templates.

## Validation

Common validation:

- `node --check` on changed JavaScript files.
- `git diff --check`.
- Manual UI validation when changing UI behavior or layout.

## Do not do without asking

- Do not migrate the stack.
- Do not add a framework.
- Do not add a bundler.
- Do not change runtime/capture behavior without explicit scope.
- Do not touch rules/hit state without clear scope.
- Do not commit without an explicit request.
- Do not rewrite historical docs only to replace old audit terminology.

## Current known caveats

- `docs/internal/plans` and `docs/internal/audits` can contain old terms because they are historical.
- Light capture network interception is currently limited to fetch; it also captures basic page logs.
- XHR support in light capture can be a future improvement.
- Some temporary docs may be discarded later.
