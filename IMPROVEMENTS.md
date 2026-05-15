# MockPilot Improvements Backlog (Prioritized)

## P0 - Immediate (next iterations)

### 1) Rich Network Inspector
Goal: when clicking a request row in Network, open a detailed inspector panel similar to DevTools, but with better readability and mock-focused actions.

Proposed scope:
- Request overview: method, URL, status, duration, resource type, matched rule, applied action.
- Request headers: full list with search and copy actions.
- Request payload/body: raw + pretty JSON (when possible).
- Query params parser: key/value table.
- Response headers: full list with search and copy actions.
- Response body preview: raw + pretty JSON + fallback for non-JSON.
- Timing block: start/end/duration and optional phases (if available).
- Error block: network error reason/details when request fails.
- Quick actions: "Create rule from this request", "Replay", "Copy as fetch", "Copy cURL".

UX direction:
- Open as side drawer or expandable details under the selected row.
- Keep keyboard navigation and preserve filter/input focus.
- Maintain live updates without collapsing the open details panel.

Technical notes:
- Expand data capture using CDP events:
  - `Network.requestWillBeSent` / `requestWillBeSentExtraInfo`
  - `Network.responseReceived` / `responseReceivedExtraInfo`
  - `Network.loadingFinished` / `loadingFailed`
  - `Network.getResponseBody` (on-demand when details open)
  - optionally `Fetch.requestPaused` request body handling when available
- Store richer network model per entry (headers, postData, response metadata, timings).
- Add lightweight memory limits and lazy body loading to avoid performance issues.

Acceptance criteria:
- Clicking a request always opens details with at least URL/method/status/headers.
- JSON request/response bodies are prettified when valid JSON.
- Non-JSON content is still viewable as raw text.
- Inspector works while new requests continue streaming.

### 2) Rule Presets (Quick Scenarios)
- Quick template presets for common scenarios: success, 401, 403, 429, 500, timeout, offline.
- One-click apply for fast QA loops.

### 3) Rule Hit Counter + Live State
- Show `applied N times` per rule.
- Improve current visual highlight with explicit states: `matching`, `not matching`, `inactive`.

### 4) Rules Actions Layout Cleanup
- Reorganize action buttons inside each rule card for better scanability and reduced clutter.
- Define a clear action hierarchy (primary, secondary, destructive).
- Consider compact overflow for less-used actions on small sidepanel widths.
- Keep badge and actions visually separated and aligned across cards.

### 5) Header Actions Consistency
- Standardize spacing, compact button sizes, and alignment in all card headers.

## P1 - High value (after P0)

### 6) Extension Full-Page Mode (New Tab)
- Add an option to open MockPilot in a dedicated extension page/tab (for richer UI).
- Keep sidepanel as quick-access mode; use full-page for advanced flows.
- Candidate entrypoints: `chrome.tabs.create({ url: chrome.runtime.getURL('...') })` from sidepanel action.
- Benefits: more room for inspector, rule management, scenarios, and diagnostics.

### 7) Auto-attach for Multi-Branch Testing
- Add optional auto-attach to the currently active HTTP(S) tab.
- Useful for environments with many branch URLs (like Panda staging links).
- Preserve safe behavior when switching tabs/windows (detach previous, attach new target).
- Show clear status in UI when auto-attach is enabled/disabled.
- Consider optional host filter (for example only `*.pandavideo.com*`) to avoid attaching on unrelated sites.

### 8) One-Rule Mode
- Optional mode to keep only one rule enabled at a time.
- Reduces conflicts and improves test predictability.

### 9) Persist Network Filters
- Save current filters (text, exclude terms, method, status, toggles) in storage.
- Restore filters on extension reopen.

### 10) Import/Export Bundle
- Export/import a bundle of rules (not only one rule JSON).
- Support feature-based scenario packages.

## P2 - Nice to have

### 11) Attach Diagnostics Panel
- Add explicit diagnostics card showing attach strategy used (`tabId` vs `targetId`) and latest attach attempts.

### 12) Auto-dismiss Notice Modals
- For informational-only modals (success/info notices), add optional auto-close timeout.
- Keep confirm/input modals persistent (no timeout) to avoid accidental dismiss.
- Allow a small default timeout (for example 2.5s to 4s) with manual close fallback.
- Ensure timeout is accessible (pause on hover/focus, keep keyboard close support).

### 13) Optional Host/Project Profiles
- Save host-specific profiles (example: Panda staging, production-like, local).
- Quickly switch rule sets and attach preferences by profile.
