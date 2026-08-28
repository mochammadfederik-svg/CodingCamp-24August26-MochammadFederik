# Implementation Plan: Todo List Dashboard

## Overview

Build a self-contained, single-page productivity dashboard in plain HTML, CSS, and Vanilla JavaScript. All logic lives in three files: `index.html`, `css/style.css`, and `js/main.js`. The implementation is broken into sequential steps that follow the module dependency order: project skeleton → StorageManager → GreetingModule → TimerModule → TodoModule → QuickLinksModule → integration wiring → styling.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - [x] 1.1 Create `index.html` at the project root with the full page structure
    - Include a single `<link>` to `css/style.css` and a single `<script src="js/main.js">` (no inline styles, no inline scripts, no CDN links)
    - Add semantic landmark elements for each widget: `#greeting-widget`, `#timer-widget`, `#todo-widget`, `#quicklinks-widget`
    - Add all static sub-elements needed by each module: clock display (`#clock`, `#date`, `#greeting-message`), timer display (`#timer-display`, `#timer-complete-banner`), timer buttons (`#btn-start`, `#btn-stop`, `#btn-reset`), todo form (`#todo-input`, `#btn-add-todo`), todo list (`<ul id="todo-list">`), todo error banner (`#todo-error`), links form (`#link-label-input`, `#link-url-input`, `#btn-add-link`), links panel (`<div id="links-panel">`), links error banner (`#links-error`)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 1.2 Create `css/style.css` with base layout styles
    - CSS Grid or Flexbox dashboard grid that arranges the four widgets
    - Placeholder rules for widget containers, error banners (hidden by default with `display:none`), timer complete banner (hidden by default), and task strikethrough (`text-decoration: line-through` for `.completed`)
    - _Requirements: 13.2, 7.2, 7.3_

  - [x] 1.3 Create `js/main.js` with the top-level IIFE scaffold
    - Empty IIFE shell with clearly labelled sections for each module: `StorageManager`, `GreetingModule`, `TimerModule`, `TodoModule`, `QuickLinksModule`, and a `DOMContentLoaded` bootstrap block
    - Define the `generateId()` utility function using `crypto.randomUUID()` with the `Date.now` + `Math.random` fallback
    - _Requirements: 13.3, 13.4, 9.3_

- [ ] 2. Implement StorageManager
  - [x] 2.1 Implement `StorageManager.saveTasks` and `StorageManager.loadTasks`
    - `saveTasks(tasks)`: serialise to JSON, write to `localStorage` key `"tld_tasks"`; on `DOMException` re-throw a `StorageError` so the caller can roll back
    - `loadTasks()`: read from `"tld_tasks"`, `JSON.parse`, validate each entry against the Task schema (`id` string, `title` string, `completed` boolean, `createdAt` ISO 8601 string), silently discard invalid entries; swallow `SyntaxError` / missing key and return `[]`
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 2.2 Write property test for StorageManager task persistence round-trip (P5)
    - **Property 5: Task persistence round-trip**
    - For any array of valid Task objects, `saveTasks` then `loadTasks` returns a structurally equivalent array (same ids, titles, completed flags, createdAt values, no entries added or dropped)
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 5`
    - **Validates: Requirements 9.3, 9.4, 9.6**

  - [ ]* 2.3 Write property test for StorageManager discarding invalid entries (P6)
    - **Property 6: StorageManager discards invalid entries silently**
    - For any JSON array with some entries missing required fields or containing wrong types, `loadTasks` returns only the valid entries and throws no exception
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 6`
    - **Validates: Requirements 9.4, 9.5**

  - [ ] 2.4 Implement `StorageManager.saveLinks` and `StorageManager.loadLinks`
    - `saveLinks(links)`: serialise to JSON, write to `localStorage` key `"tld_links"`; re-throw `DOMException` as `StorageError`
    - `loadLinks()`: read from `"tld_links"`, validate each entry against the Link schema (`id` string, `label` string, `url` string starting with `http://` or `https://`), silently discard invalid entries; return `[]` on any error
    - _Requirements: 10.3, 10.5, 11.3_

  - [ ]* 2.5 Write property test for StorageManager link persistence round-trip (P11)
    - **Property 11: Link persistence round-trip**
    - For any array of valid Link objects, `saveLinks` then `loadLinks` returns a structurally equivalent array
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 11`
    - **Validates: Requirements 10.3, 11.3**

- [x] 3. Implement GreetingModule
  - [~] 3.1 Implement `GreetingModule.init` and `GreetingModule._tick`
    - `init()`: call `_tick()` immediately, then start a `setInterval` at 1 000 ms
    - `_tick()`: call `new Date()`; if it throws or returns `Invalid Date`, write `--:--:--` to `#clock`, empty `#date`, empty `#greeting-message`, and return
    - Otherwise: format and write HH:MM:SS (or 12-hour with AM/PM) to `#clock`; write the weekday/day/month/year string to `#date`; compute the greeting from the lookup table and write it to `#greeting-message`
    - Expose a pure `getGreeting(hour)` helper function (needed by property tests)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Write property test for greeting covering all hours (P1)
    - **Property 1: Greeting message covers all hours**
    - For any integer 0–23, `getGreeting(h)` returns exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"} and never returns an empty string or undefined
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 1`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 3.3 Write property test for greeting boundary round-trip (P2)
    - **Property 2: Greeting boundary round-trip**
    - For each boundary hour (5, 12, 18, 22), `getGreeting(boundary)` returns a different message than `getGreeting(boundary - 1)`, confirming lower-inclusive, upper-exclusive semantics
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 2`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 4. Implement TimerModule
  - [x] 4.1 Implement TimerModule state machine and display
    - Internal state: `{ state: TimerState, remaining: number, intervalId: null|number }`
    - `init()`: set state to `idle`, remaining to 1500, render display, bind click handlers for `#btn-start`, `#btn-stop`, `#btn-reset`
    - `start()`: only acts when state is `idle` or `stopped`; sets state to `running`, starts `setInterval(_tick, 1000)`, updates button disabled states
    - `stop()`: only acts when state is `running`; clears interval, sets state to `stopped`, updates button disabled states
    - `reset()`: clears interval, sets state to `idle`, remaining to 1500, hides `#timer-complete-banner`, updates display and button states
    - `_tick()`: decrement remaining; if remaining reaches 0, clear interval, set state to `completed`, show `#timer-complete-banner`, attempt `Audio.play()` (catch and log on rejection); update display
    - Button disabled rules: Start disabled when `running` or `completed`; Stop disabled when `idle`, `stopped`, or `completed`; Reset always enabled
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 4.2 Write property test for timer state machine validity (P12)
    - **Property 12: Timer state machine — valid transitions only**
    - For any arbitrary sequence of Start, Stop, and Reset calls, the timer state is always one of the four valid values and `remaining` is always in [0, 1500]
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 12`
    - **Validates: Requirements 3.1, 3.2, 3.4, 4.2, 4.3, 4.4**

  - [ ]* 4.3 Write property test for timer countdown monotonicity (P13)
    - **Property 13: Timer countdown monotonicity**
    - Simulating N ticks while running decreases `remaining` by exactly 1 per tick until 0, then holds at 0 with no further decrement
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 13`
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [ ] 5. Checkpoint — StorageManager, GreetingModule, and TimerModule
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement TodoModule
  - [x] 6.1 Implement `TodoModule.init` and `TodoModule._renderList`
    - `init(tasks)`: store the task array in-memory, call `_renderList()`, bind the `#btn-add-todo` click and `#todo-input` Enter-key events
    - `_renderList()`: clear `<ul id="todo-list">`, then for each task render a `<li>` containing: a checkbox input (checked when `completed`), a `<span>` with the task title (add class `completed` when done to trigger strikethrough), an Edit button, and a Delete button
    - _Requirements: 5.1, 7.1, 8.1, 9.1, 9.2_

  - [ ] 6.2 Implement `TodoModule.addTask`
    - Read and trim `#todo-input` value; if empty show `#todo-error` with "Task description cannot be empty." and return
    - If task count ≥ 100 show `#todo-error` with "Maximum number of tasks reached." and return
    - Create a Task object `{ id: generateId(), title, completed: false, createdAt: new Date().toISOString() }`, push to in-memory array, call `_renderList()`, clear input
    - Call `StorageManager.saveTasks`; on `StorageError` pop the task, re-render, show error banner "Task could not be saved."
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.3 Write property test for whitespace task rejection (P3)
    - **Property 3: Whitespace-only task descriptions are always rejected**
    - For any string composed entirely of whitespace characters, calling `addTask` leaves the task collection unchanged
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 3`
    - **Validates: Requirements 5.5**

  - [ ]* 6.4 Write property test for valid task addition round-trip (P4)
    - **Property 4: Valid task addition round-trip**
    - For any non-whitespace string of 1–500 characters, `addTask` results in exactly one more task with correct structure (`title` trimmed, `completed` false, non-empty `id`, valid ISO 8601 `createdAt`)
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 4`
    - **Validates: Requirements 5.2, 5.3, 9.3**

  - [ ] 6.5 Implement `TodoModule.toggleTask`
    - Find task by id, flip `completed`, call `_renderList()`
    - Call `StorageManager.saveTasks`; on `StorageError` re-flip `completed`, re-render, show error banner "Change could not be saved."
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 6.6 Write property test for task toggle involution (P7)
    - **Property 7: Task toggle is an involution**
    - For any Task, toggling twice returns the task to its original `completed` value
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 7`
    - **Validates: Requirements 7.2, 7.3**

  - [ ] 6.7 Implement `TodoModule._enterEditMode` and `TodoModule._exitEditMode`
    - `_enterEditMode(id)`: if any task is already in edit mode, do nothing and return; replace the task's `<span>` with an `<input>` pre-populated with the current title and focused; hide the Edit button
    - `_exitEditMode(id, save)`: if `save` is true and input is non-whitespace, update title to trimmed value; if `save` is true but input is whitespace-only, discard and restore; if `save` is false (Escape), discard; call `_renderList()` after
    - Bind Edit button click → `_enterEditMode`; bind input Enter → `_exitEditMode(id, true)`; bind input Escape → `_exitEditMode(id, false)`
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

  - [ ] 6.8 Implement `TodoModule.editTask` (persistence after edit)
    - After a confirmed edit, call `StorageManager.saveTasks`; on `StorageError` revert title, re-render, show error banner
    - _Requirements: 6.4_

  - [ ]* 6.9 Write property test for task edit preserving identity (P8)
    - **Property 8: Task edit preserves identity**
    - For any Task and any valid replacement description, editing leaves `id` and `createdAt` unchanged and updates only `title` to the trimmed value
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 8`
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 6.10 Implement `TodoModule.deleteTask`
    - Remove task from in-memory array by id, call `_renderList()`
    - Call `StorageManager.saveTasks`; on `StorageError` restore the task, re-render, show error banner "Deletion could not be saved."
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.11 Write property test for task cap enforcement (P9)
    - **Property 9: Task cap enforcement**
    - For any task collection at exactly 100 tasks, calling `addTask` leaves the collection unchanged at exactly 100
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 9`
    - **Validates: Requirements 5.6**

- [ ] 7. Implement QuickLinksModule
  - [x] 7.1 Implement `QuickLinksModule.init` and `QuickLinksModule._renderPanel`
    - `init(links)`: store the link array in-memory, call `_renderPanel()`, bind the `#btn-add-link` click event
    - `_renderPanel()`: clear `#links-panel`; for each link render a button with the label text (truncated to 100 chars for display, full URL preserved for `href`), plus a Delete control; the button opens the URL in a new tab via `window.open(url, '_blank')`; skip any link with a missing/malformed URL
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 7.2 Implement `QuickLinksModule.addLink`
    - Read and trim `#link-label-input` and `#link-url-input`; validate: label non-empty, URL non-empty and starts with `http://` or `https://`; show field-specific inline errors on failure
    - If link count ≥ 50, show "Maximum number of links reached." and return
    - Create `{ id: generateId(), label, url }`, push to in-memory array, call `_renderPanel()`, clear input fields
    - Call `StorageManager.saveLinks`; on `StorageError` pop the link, re-render, show error banner
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 7.3 Write property test for invalid URL rejection (P10)
    - **Property 10: Invalid URL is always rejected**
    - For any string that does not begin with `http://` or `https://`, calling `addLink` leaves the link collection unchanged
    - Use fast-check; tag comment: `// Feature: todo-list-dashboard, Property 10`
    - **Validates: Requirements 11.6**

  - [ ] 7.4 Implement `QuickLinksModule.deleteLink`
    - Remove link from in-memory array by id, call `_renderPanel()`
    - Call `StorageManager.saveLinks`; on `StorageError` restore the link, re-render, show error banner "Deletion could not be saved."
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 8. Wire up bootstrap and cross-module integration
  - [x] 8.1 Implement the `DOMContentLoaded` bootstrap block
    - Load tasks via `StorageManager.loadTasks()`, load links via `StorageManager.loadLinks()`
    - Call `TodoModule.init(tasks)`, `QuickLinksModule.init(links)`, `GreetingModule.init()`, `TimerModule.init()`
    - Ensure all four widgets are visible and interactive within 2 seconds of `DOMContentLoaded`
    - _Requirements: 9.1, 9.2, 10.3, 10.4, 14.1, 14.2_

  - [ ] 8.2 Implement the audio notification for timer completion
    - Embed a short beep as a base64-encoded data URI (`new Audio('data:audio/...')`) so it works under `file://` protocol
    - Call `audio.play()` inside `TimerModule._tick` on completion; wrap in `try/catch`, log warning on autoplay rejection, ensure `#timer-complete-banner` still shows
    - _Requirements: 3.5, 15.2_

  - [ ] 8.3 Implement auto-dismissing error banners
    - Each widget's error banner element auto-dismisses after 5 seconds (`setTimeout` → `style.display = 'none'`) or immediately on user dismiss (click ×)
    - _Requirements: (Error Handling section in design)_

- [x] 9. Checkpoint — full integration
  - Ensure all tests pass and all four widgets are functional end-to-end, ask the user if questions arise.

- [x] 10. Apply full CSS styling
  - [x] 10.1 Style the dashboard grid and widget cards
    - Responsive two-column grid that collapses to one column on narrow viewports
    - Consistent card appearance: border, padding, background, shadow
    - _Requirements: 14.1, 15.1_

  - [x] 10.2 Style the Greeting Widget
    - Large clock font, subdued date line, prominent greeting message
    - Fallback `--:--:--` styled the same as normal clock output
    - _Requirements: 1.1, 1.2_

  - [x] 10.3 Style the Timer Widget
    - Large MM:SS display, clearly labelled Start/Stop/Reset buttons with disabled state (reduced opacity, `cursor: not-allowed`)
    - Visible `#timer-complete-banner` with distinct colour when shown
    - _Requirements: 3.3, 3.5, 4.1, 4.5, 4.6, 4.8_

  - [x] 10.4 Style the Todo List Widget
    - Input + button inline row, task items with checkbox, text, edit/delete controls
    - `.completed` class applies `text-decoration: line-through` and muted colour
    - Edit-mode input replacing the text span, inline Save/Cancel affordance
    - Error banner styled as a dismissible alert
    - _Requirements: 7.2, 7.3, 6.2_

  - [x] 10.5 Style the Quick Links Widget
    - Grid of pill/button link entries, each with a label and a delete icon
    - Hover state on link buttons; label truncated with `text-overflow: ellipsis` when exceeding 100 characters
    - _Requirements: 10.1, 10.6, 12.1_

- [x] 11. Final checkpoint — structural validation and cross-browser check
  - Verify `index.html` references exactly one CSS file and one JS file (no inline styles, no inline scripts, no CDN links)
  - Open via `file://` in Chrome, Firefox, Edge, and Safari; confirm all four widgets load and no console errors appear
  - Ensure all automated tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** in the test environment only — it must never be referenced from `index.html`
- Each property test file should tag tests with `// Feature: todo-list-dashboard, Property N`
- All five modules live inside a single top-level IIFE in `js/main.js`; no global variables leak outside the IIFE
- The timer state is runtime-only and intentionally not persisted to `localStorage`
- `crypto.randomUUID()` is the primary ID generator; the `Date.now + Math.random` fallback covers older environments
- Error banners auto-dismiss after 5 seconds; all banners start hidden (`display: none`) in CSS

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["6.3", "6.4", "6.5", "7.2"] },
    { "id": 7, "tasks": ["6.6", "6.7", "7.3", "7.4"] },
    { "id": 8, "tasks": ["6.8", "6.9", "6.10"] },
    { "id": 9, "tasks": ["6.11", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5"] }
  ]
}
```
