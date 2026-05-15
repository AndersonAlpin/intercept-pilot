# MockPilot MVP

MockPilot is a Chrome extension MVP for mocking HTTP responses from a side panel.

## Included in this MVP

- Manifest V3 extension
- Side panel UI
- Folder and rule management
- Rule toggles and folder toggles
- Network request list for the attached tab
- Create rule from a captured request
- Mock response with custom status, status text, body, headers and content-type
- Fail request with a configurable CDP fail reason
- Delay before continuing a request
- Basic logs

## How to load

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `MockPilot` folder
5. Click the extension icon and open the side panel
6. Press **Attach** in the extension UI
7. Reload the page you want to inspect

## Notes

- This MVP uses `chrome.debugger` and DevTools Protocol `Fetch`/`Network`
- Some browser/internal requests may not be ideal candidates for mocking
- Request body editing is not implemented yet
- Import/export is not implemented yet
- Logs and network entries are intentionally capped to avoid unbounded growth
