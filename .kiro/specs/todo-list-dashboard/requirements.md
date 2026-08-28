# Requirements Document

## Introduction

The Todo List Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides a single-page dashboard experience that combines four productivity widgets: a time-aware greeting, a Pomodoro-style focus timer, a persistent to-do list, and a quick-access links panel. All data is stored entirely in the browser's Local Storage — no backend server is required. The application must work in modern browsers (Chrome, Firefox, Edge, Safari) and can be used as a standalone web page or browser extension.

---

## Glossary

- **Dashboard**: The single HTML page containing all four widgets.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The UI component that implements a 25-minute countdown timer with Start, Stop, and Reset controls.
- **Todo_List**: The UI component that manages a collection of task items with add, edit, complete, and delete operations.
- **Task**: A single to-do item with a text description and a completion state (done/not done).
- **Quick_Links**: The UI component that displays a set of user-defined shortcut buttons, each of which opens a URL in a new browser tab.
- **Link**: A single quick-link entry consisting of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used as the sole persistence layer for all user data.
- **Storage_Manager**: The JavaScript module responsible for reading and writing data to Local_Storage.
- **Timer_State**: The runtime state of the Focus_Timer, which is one of: `idle`, `running`, `stopped`, or `completed`.

---

## Requirements

---

### Requirement 1: Display Current Time and Date

**User Story:** As a user, I want to see the current time and date on the dashboard, so that I always have a quick reference without switching tabs.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM:SS format (24-hour or 12-hour with AM/PM indicator).
2. THE Greeting_Widget SHALL display the current date in a human-readable format that includes the weekday name, day, month, and year (e.g., "Thursday, 28 August 2026").
3. WHEN the Dashboard is opened, THE Greeting_Widget SHALL begin updating the displayed time once every second within 1 second of the Dashboard becoming visible.
4. WHILE the Dashboard is open, THE Greeting_Widget SHALL maintain the displayed time within a deviation of no more than 1 second from the device's local clock.
5. IF the device clock is unavailable, THEN THE Greeting_Widget SHALL display a fallback indicator (e.g., "--:--:--") instead of a time value and shall not throw an unhandled exception.

---

### Requirement 2: Display Time-of-Day Greeting

**User Story:** As a user, I want to see a greeting that changes based on the time of day, so that the dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. WHEN the current hour is between 05:00 and 11:59 (inclusive), THE Greeting_Widget SHALL display the message "Good Morning".
2. WHEN the current hour is between 12:00 and 17:59 (inclusive), THE Greeting_Widget SHALL display the message "Good Afternoon".
3. WHEN the current hour is between 18:00 and 21:59 (inclusive), THE Greeting_Widget SHALL display the message "Good Evening".
4. WHEN the current hour is between 22:00 and 04:59 (inclusive), THE Greeting_Widget SHALL display the message "Good Night".
5. WHILE the Dashboard is open, THE Greeting_Widget SHALL re-evaluate the current hour once per second and update the displayed greeting message immediately when the current hour crosses a time-of-day boundary.
6. WHEN the Dashboard is first opened, THE Greeting_Widget SHALL evaluate the current local device time and display the corresponding greeting message within 1 second of the Dashboard becoming visible.
7. IF the Greeting_Widget cannot retrieve the current local device time, THEN THE Greeting_Widget SHALL display no greeting message and shall not display a fallback or placeholder text.

---

### Requirement 3: Focus Timer — Countdown

**User Story:** As a user, I want a 25-minute countdown timer, so that I can time focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with a countdown duration of exactly 25 minutes (1500 seconds) and display "25:00" when in the `idle` Timer_State.
2. WHEN the Focus_Timer is in the `idle` Timer_State and the user activates the Start control, THE Focus_Timer SHALL begin decrementing the remaining time by one second on each elapsed second.
3. WHILE the Focus_Timer is in the `running` Timer_State, THE Focus_Timer SHALL display the remaining time in MM:SS format, updating the display once per second.
4. WHEN the remaining time reaches 00:00, THE Focus_Timer SHALL stop decrementing and display 00:00.
5. WHEN the remaining time reaches 00:00, THE Focus_Timer SHALL transition to the `completed` Timer_State, display a visible on-screen indicator that the session has ended, and play a notification sound for at least 1 second.
6. IF the Focus_Timer is in the `running` Timer_State and the user activates the Start control, THEN THE Focus_Timer SHALL ignore that activation and continue decrementing uninterrupted.
7. WHILE the Focus_Timer is in the `completed` Timer_State, THE Focus_Timer SHALL continue to display 00:00 and the session-end indicator until the user activates the Reset control.

---

### Requirement 4: Focus Timer — Start, Stop, and Reset Controls

**User Story:** As a user, I want Start, Stop, and Reset buttons for the focus timer, so that I can control my work sessions flexibly.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display three controls labelled "Start", "Stop", and "Reset".
2. WHEN the user activates the Start control and the Focus_Timer is in the `idle` or `stopped` Timer_State, THE Focus_Timer SHALL transition to the `running` Timer_State within 200 milliseconds.
3. WHEN the user activates the Stop control and the Focus_Timer is in the `running` Timer_State, THE Focus_Timer SHALL pause the countdown and transition to the `stopped` Timer_State, preserving the remaining time to the nearest second.
4. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop the countdown, reset the remaining time to 1500 seconds, and transition to the `idle` Timer_State within 200 milliseconds.
5. WHILE the Focus_Timer is in the `running` Timer_State, THE Focus_Timer SHALL disable the Start control to prevent duplicate activation.
6. WHILE the Focus_Timer is in the `idle` Timer_State, THE Focus_Timer SHALL disable the Stop control.
7. IF the user activates the Start control and the Focus_Timer is not in the `idle` or `stopped` Timer_State, THEN THE Focus_Timer SHALL ignore the activation and preserve the current Timer_State unchanged.
8. WHILE the Focus_Timer is in the `stopped` Timer_State, THE Focus_Timer SHALL disable the Stop control.

---

### Requirement 5: To-Do List — Add Tasks

**User Story:** As a user, I want to add tasks to the to-do list, so that I can track what I need to do.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input field with a maximum capacity of 500 characters and an "Add" control for creating new tasks.
2. WHEN the user submits a non-empty task description (after trimming leading and trailing whitespace) via the Add control or by pressing the Enter key in the input field, THE Todo_List SHALL append a new Task with the trimmed description and a completion state of `not done` to the task collection.
3. WHEN a new Task is appended, THE Todo_List SHALL persist the updated task collection to Local_Storage via the Storage_Manager within 500 milliseconds.
4. WHEN a new Task is appended, THE Todo_List SHALL clear the text input field.
5. IF the user submits an empty or whitespace-only task description, THEN THE Todo_List SHALL not create a new Task, SHALL not modify the task collection, and SHALL display an error message indicating that the task description cannot be empty.
6. IF the task collection already contains 100 tasks, THEN THE Todo_List SHALL not create a new Task and SHALL display an error message indicating that the maximum number of tasks has been reached.
7. IF the Storage_Manager fails to persist the updated task collection, THEN THE Todo_List SHALL retain the new Task in the current session's task collection and SHALL display an error message indicating that the task could not be saved.

---

### Requirement 6: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit existing tasks, so that I can correct or update task descriptions.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an "Edit" control for each rendered Task.
2. WHEN the user activates the Edit control for a Task, THE Todo_List SHALL replace the Task's displayed text with an editable input field pre-populated with the current task description, and the input field SHALL receive focus immediately.
3. WHEN the user confirms the edit (by pressing Enter or activating a "Save" control) and the input contains at least one non-whitespace character, THE Todo_List SHALL update the Task's description to the trimmed input value and restore the non-editing display.
4. WHEN the Task description is updated, THE Todo_List SHALL persist the updated task collection to Local_Storage via the Storage_Manager.
5. IF the user confirms an edit with an empty or whitespace-only value, THEN THE Todo_List SHALL not update the Task description and SHALL restore the non-editing display showing the original description.
6. WHEN the user cancels the edit (by pressing Escape), THE Todo_List SHALL discard the change and restore the non-editing display showing the original task description.
7. WHILE a Task is in the editing state, THE Todo_List SHALL not allow any other Task to enter the editing state simultaneously; activating an Edit control on another Task SHALL have no effect.

---

### Requirement 7: To-Do List — Mark Tasks as Done

**User Story:** As a user, I want to mark tasks as done, so that I can track my progress.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a checkbox or toggle control for each rendered Task to toggle its completion state.
2. WHEN the user activates the completion control for a Task in the `not done` state, THE Todo_List SHALL update the Task's completion state to `done` and apply a strikethrough style to the task description text.
3. WHEN the user activates the completion control for a Task in the `done` state, THE Todo_List SHALL update the Task's completion state to `not done` and remove the strikethrough style from the task description text.
4. WHEN a Task's completion state is changed, THE Todo_List SHALL persist the updated task collection to Local_Storage via the Storage_Manager within 500 milliseconds.
5. IF the Storage_Manager fails to persist the updated task collection, THEN THE Todo_List SHALL revert the Task's completion state to its previous value, restore the corresponding visual display, and display an error message indicating that the change could not be saved.

---

### Requirement 8: To-Do List — Delete Tasks

**User Story:** As a user, I want to delete tasks, so that I can remove items that are no longer relevant.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a "Delete" control for each rendered Task.
2. WHEN the user activates the Delete control for a Task, THE Todo_List SHALL immediately remove that Task from the task collection and remove the corresponding item from the rendered list without requiring additional confirmation.
3. WHEN a Task is deleted, THE Todo_List SHALL persist the updated task collection to Local_Storage via the Storage_Manager.
4. IF the Storage_Manager fails to persist the updated task collection, THEN THE Todo_List SHALL restore the deleted Task to the task collection and to the rendered list, and display an error message indicating that the deletion could not be saved.
5. WHEN the last remaining Task is deleted, THE Todo_List SHALL render the task list as empty with no Task items displayed.

---

### Requirement 9: To-Do List — Persistence

**User Story:** As a user, I want my tasks to persist between browser sessions, so that I do not lose my task list when I close and reopen the tab.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Todo_List SHALL read the task collection from Local_Storage via the Storage_Manager and render all stored Tasks.
2. IF no task data exists in Local_Storage when the Dashboard loads, THEN THE Todo_List SHALL render an empty task collection without error.
3. THE Storage_Manager SHALL serialise the task collection as a JSON string containing an array of objects, each with the fields: `id` (string), `title` (string), `completed` (boolean), and `createdAt` (ISO 8601 date string), when writing to Local_Storage.
4. THE Storage_Manager SHALL deserialise the JSON string when reading from Local_Storage, validate that each entry contains the required fields with the correct types, and return an array containing only the valid task objects; any entry missing required fields or containing incorrect types SHALL be discarded silently.
5. IF Local_Storage data is malformed or cannot be parsed, THEN THE Storage_Manager SHALL return an empty task collection array and SHALL not throw an unhandled exception.
6. WHEN the user adds, edits, or deletes a Task, THE Storage_Manager SHALL write the updated task collection to Local_Storage within 500 milliseconds of the triggering action.
7. IF the Storage_Manager fails to write the updated task collection (e.g., quota exceeded), THEN THE Storage_Manager SHALL propagate the error to the calling component and SHALL not partially overwrite existing Local_Storage data.

---

### Requirement 10: Quick Links — Display and Open Links

**User Story:** As a user, I want quick-access buttons that open my favourite websites, so that I can navigate to frequently used sites without typing URLs.

#### Acceptance Criteria

1. THE Quick_Links SHALL render each stored Link as a button displaying the Link's label text (1–100 characters).
2. WHEN the user activates a Link button, THE Quick_Links SHALL open the Link's URL in a new browser tab without navigating away from the current tab.
3. WHEN the Dashboard loads, THE Quick_Links SHALL read the link collection from Local_Storage via the Storage_Manager and render all stored Links within 500 milliseconds.
4. IF no link data exists in Local_Storage when the Dashboard loads, THEN THE Quick_Links SHALL render an empty link collection without error and display no Link buttons.
5. IF a stored Link contains a missing or malformed URL when the Dashboard loads, THEN THE Quick_Links SHALL skip that Link and render the remaining valid Links without error.
6. IF a stored Link contains a label exceeding 100 characters, THEN THE Quick_Links SHALL truncate the displayed label to 100 characters while preserving the full URL for navigation.

---

### Requirement 11: Quick Links — Add Links

**User Story:** As a user, I want to add new quick links to the dashboard, so that I can customise my shortcuts.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a text input field for a link label with a maximum of 100 characters, a text input field for a link URL with a maximum of 2048 characters, and an "Add Link" control.
2. WHEN the user provides a non-empty label of at most 100 characters and a non-empty URL that begins with "http://" or "https://" and activates the Add Link control, THE Quick_Links SHALL append a new Link to the link collection and render a new button for that Link in the order it was added.
3. WHEN a new Link is appended, THE Quick_Links SHALL persist the updated link collection to Local_Storage via the Storage_Manager within 500 milliseconds.
4. WHEN a new Link is appended, THE Quick_Links SHALL clear the label and URL input fields.
5. IF the user activates the Add Link control with an empty label or an empty URL, THEN THE Quick_Links SHALL not create a new Link, SHALL not modify the link collection, and SHALL display an inline error message indicating which field is empty.
6. IF the user activates the Add Link control with a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL not create a new Link and SHALL display an inline error message indicating the URL format is invalid.
7. IF the link collection already contains 50 Links and the user activates the Add Link control, THEN THE Quick_Links SHALL not create a new Link and SHALL display an inline error message indicating the maximum number of links has been reached.

---

### Requirement 12: Quick Links — Delete Links

**User Story:** As a user, I want to remove quick links I no longer need, so that the panel stays relevant.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a "Delete" control for each rendered Link button, visible without requiring additional interaction with the Link button.
2. WHEN the user activates the Delete control for a Link, THE Quick_Links SHALL remove that Link from the link collection and remove the corresponding button from the rendered panel within 300 milliseconds.
3. WHEN a Link is deleted, THE Quick_Links SHALL persist the updated link collection to Local_Storage via the Storage_Manager before the deletion is considered complete.
4. IF the Storage_Manager fails to persist the updated link collection, THEN THE Quick_Links SHALL retain the deleted Link in the link collection and restore the corresponding button in the rendered panel, and display an error message indicating the deletion could not be saved.

---

### Requirement 13: Single-File Structure

**User Story:** As a developer, I want the project to follow a strict single-file-per-type folder structure, so that the codebase stays clean and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL be served from exactly one HTML file located at the project root directory (not within any subdirectory).
2. THE Dashboard SHALL reference exactly one CSS file located in the `css/` directory, and that CSS file SHALL contain all styles required by the Dashboard with no inline `<style>` blocks or `style` attributes present in the HTML file.
3. THE Dashboard SHALL reference exactly one JavaScript file located in the `js/` directory, and that JavaScript file SHALL contain all scripts required by the Dashboard with no inline `<script>` blocks present in the HTML file.
4. THE Dashboard SHALL not reference any external JavaScript frameworks or libraries via `<script>` tags, module imports, or CDN links (e.g., React, Vue, jQuery).
5. IF the HTML file references more than one CSS file or more than one JavaScript file, THEN the Dashboard SHALL fail a structural validation check and the violation SHALL be reported as a named list of extra file references.

---

### Requirement 14: Performance and Responsiveness

**User Story:** As a user, I want the dashboard to load quickly and respond instantly to interactions, so that using it never feels sluggish.

#### Acceptance Criteria

1. THE Dashboard SHALL complete initial render and display all widgets within 2 seconds on a standard desktop or laptop machine running a modern browser (Chrome, Firefox, Edge, or Safari released within the last 2 years) with an unthrottled network connection and a cold cache.
2. WHEN the user interacts with any control (add, edit, delete, toggle, or timer button), THE Dashboard SHALL reflect the updated UI state within 100 milliseconds, measured from the moment of user input (click or keypress) to the moment the visual change is visible in the DOM.
3. WHILE the Focus_Timer is in the `running` Timer_State, THE Dashboard SHALL maintain timer accuracy within ±1 second per minute of elapsed time, measured against the wall-clock time at the start of the session.
4. IF the Dashboard fails to complete initial render within 2 seconds, THEN THE Dashboard SHALL display a loading indicator within 500 milliseconds of page load and continue rendering until all widgets are displayed or a 10-second timeout is reached, at which point an error message indicating a load failure shall be shown.
5. WHEN the user session has been active for 60 or more continuous minutes, THE Dashboard SHALL maintain the same UI interaction response time of within 100 milliseconds as defined in criterion 2, with no degradation due to accumulated state or event listeners.

---

### Requirement 15: Browser Compatibility

**User Story:** As a user, I want the dashboard to work correctly in all modern browsers, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE Dashboard SHALL render and function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari at the time of development, where "render and function correctly" means all UI components are visible, interactive controls respond to user input, and no JavaScript errors are thrown in the browser console.
2. THE Dashboard SHALL function as a standalone web page opened directly from the filesystem (via `file://` protocol) without requiring a local server, where "function" means all widgets load, all data displays render, and all interactive elements respond to user input within 5 seconds of the page opening.
3. IF the Dashboard is opened via the `file://` protocol and a browser security restriction blocks a required resource from loading, THEN the Dashboard SHALL display an inline warning message indicating which feature is unavailable due to browser security restrictions, while all other features that are not affected by the restriction SHALL remain functional.
