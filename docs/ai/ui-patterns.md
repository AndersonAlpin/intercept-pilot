# InterceptPilot UI Patterns

## Capture terminology

Use official capture terminology in the main UI.

Correct labels:

- PT: Captura ativa, Captura inativa, Captura completa, Captura leve, Ativar captura, Reiniciar captura, Parar captura, Capturar nova aba.
- EN: Capture active, Capture inactive, Full capture, Light capture, Activate capture, Restart capture, Stop capture, Capture new tab.
- ES: Captura activa, Captura inactiva, Captura completa, Captura ligera, Activar captura, Reiniciar captura, Parar captura, Capturar nueva pestaña.

Avoid in the main UI:

- Attach / Detach / Reattach.
- Anexar / Desanexar / Reanexar.
- Compatibility Mode.
- CDP Mode.
- Mockar.

Technical docs and old audit docs may mention old terms when describing history.

## Button variants

Use semantic variants consistently:

- `primary`: create, save, activate main flow.
- `secondary`: common supporting action such as reload, import, choose file, copy.
- `neutral` / base: cancel, close, low-emphasis default action.
- `danger`: destructive or stop action, such as delete or stop capture.
- `warning`: reset/clear/restart action, such as restart capture, clear network, clear logs.
- `info`: details, inspect, diagnostics.
- `ghost`: lightweight toolbar/inline action.

Examples:

- Correct: `Criar regra` = primary or secondary depending on context.
- Correct: `Limpar rede` = warning.
- Correct: `Limpar logs` = warning.
- Correct: `Inspecionar` = info.
- Incorrect: generic `Limpar` when the action clears data.

## Data Panel pattern

Full App data screens should use a Data Panel structure:

- Header: title, optional description, panel actions.
- Filters: inputs, selects, toggles, checkboxes.
- Body: list/table/content.
- Footer: count and/or pagination.

Rules:

- Actions that affect panel data belong in the header.
- Filters area should contain only filters.
- Footer stays outside the scrollable body.
- Use contextual count labels, not bare values like `1/1`.

## Scroll and spacing

Scrollable Data Panel bodies must keep action columns away from the scrollbar.

Guidelines:

- Use internal scroll for long tables/lists.
- Avoid page-level scroll when a panel body should scroll.
- Apply right-side gutter only when needed.
- Avoid horizontal scroll unless the table is genuinely wide.
- Keep footer/pagination stable.

## Sidepanel compactness

The Sidepanel should be compact and readable:

- Cards should not grow huge because of long URLs or log messages.
- Use line clamp / truncation in lists.
- Keep full content available in details or tooltip/title when appropriate.
- Use compact pagination.
- Avoid primary buttons repeated in every row/card unless truly needed.

## Modal shell

Modals should use the shared modal shell pattern when practical:

- Header fixed.
- Body scrollable.
- Footer/actions fixed.
- Actions aligned to the right.
- Preserve Escape/backdrop behavior when it already exists.
- Preserve ids, handlers, and dirty/pristine state.

## Network and logs truncation

Network:

- Compact cards should summarize data URLs.
- Long query strings should truncate visually.
- Inspector must preserve and show the real full URL.

Logs:

- Lists/cards should truncate long messages and URLs.
- Clicking a log should open full details.
- Details should wrap long content safely and avoid horizontal overflow.

## Empty states

Use contextual empty states:

- No active capture: ask the user to activate capture to see requests/logs.
- Active capture with no data: say there are no requests/logs yet.
- Empty states should not imply old data belongs to the current capture.

## i18n

Visible text should use `src/shared/i18n.js` and `src/shared/locales/`.

When adding labels:

- Add PT, EN, and ES.
- Keep terms consistent with `AGENTS.md`.
- Do not hardcode user-visible text in components unless the file already uses a local-only constant and there is a clear reason.

## Label examples

Correct:

- PT: `Criar regra`, `Limpar rede`, `Limpar logs`, `Automático`.
- EN: `Create rule`, `Clear network`, `Clear logs`, `Auto`.
- ES: `Crear regla`, `Limpiar red`, `Limpiar logs`, `Automático`.

Incorrect:

- `Mockar`
- `Attach`
- `Detach`
- `Compatibility Mode`
- `CDP Mode`
- generic `Limpar` for a data-clearing action.
