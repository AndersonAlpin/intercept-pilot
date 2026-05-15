# MockPilot Improvements Backlog

## 1) Rich Network Inspector (priority)
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

## 2) Persist Network Filters
- Save current filters (text, exclude terms, method, status, toggles) in storage.
- Restore filters on extension reopen.

## 3) Header Actions Consistency
- Standardize spacing, compact button sizes, and alignment in all card headers.

## 4) Attach Diagnostics Panel
- Add explicit diagnostics card showing attach strategy used (`tabId` vs `targetId`) and latest attach attempts.

## 5) Rule Templates
- Quick template presets for common scenarios: success, 401, 403, 429, 500, timeout, offline.

## 6) Rules Actions Layout Cleanup
- Reorganize action buttons inside each rule card for better scanability and reduced clutter.
- Define a clear action hierarchy (primary, secondary, destructive).
- Consider compact overflow for less-used actions on small sidepanel widths.
- Keep badge and actions visually separated and aligned across cards.

## 7) Auto-dismiss Notice Modals
- For informational-only modals (success/info notices), add optional auto-close timeout.
- Keep confirm/input modals persistent (no timeout) to avoid accidental dismiss.
- Allow a small default timeout (for example 2.5s to 4s) with manual close fallback.
- Ensure timeout is accessible (pause on hover/focus, keep keyboard close support).
