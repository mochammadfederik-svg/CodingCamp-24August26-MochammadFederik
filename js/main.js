/**
 * Todo List Dashboard â€” js/main.js
 *
 * All application logic is enclosed in a single top-level IIFE so that no
 * symbols leak into the global scope (Requirements 13.3, 13.4).
 *
 * Module layout:
 *   1. Utility helpers  (generateId)
 *   2. StorageManager   (localStorage read/write)
 *   3. GreetingModule   (clock + greeting)
 *   4. TimerModule      (Pomodoro state machine)
 *   5. TodoModule       (task CRUD)
 *   6. QuickLinksModule (link CRUD)
 *   7. Bootstrap        (DOMContentLoaded wiring)
 */

(function () {
  'use strict';

  /* =========================================================
   * 1. UTILITY HELPERS
   * ======================================================= */

  /**
   * generateId() â€” Returns a unique string identifier.
   *
   * Uses `crypto.randomUUID()` (available in Chrome 92+, Firefox 95+,
   * Safari 15.4+, including file:// contexts).  Falls back to a
   * Date.now + Math.random composite for older environments.
   *
   * Requirement 9.3: each Task must have a unique `id` string.
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback: timestamp base-36 + random base-36 suffix
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }


  /* =========================================================
   * 2. STORAGE MANAGER
   * ======================================================= */

  /**
   * StorageManager â€” sole interface to localStorage.
   *
   * No other module reads from or writes to localStorage directly.
   *
   * Public API:
   *   .loadTasks()          â†’ Task[]
   *   .saveTasks(tasks)     â†’ void  (throws StorageError on quota exceeded)
   *   .loadLinks()          â†’ Link[]
   *   .saveLinks(links)     â†’ void  (throws StorageError on quota exceeded)
   */
  var StorageManager = (function () {

    var TASKS_KEY = 'tld_tasks';
    var LINKS_KEY = 'tld_links';

    // â”€â”€ Task schema validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Returns true when `entry` satisfies the Task schema:
     *   id        â€” non-empty string
     *   title     â€” non-empty string
     *   completed â€” boolean
     *   createdAt â€” string (ISO 8601 validated loosely)
     */
    function isValidTask(entry) {
      return (
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' && entry.id.length > 0 &&
        typeof entry.title === 'string' && entry.title.length > 0 &&
        typeof entry.completed === 'boolean' &&
        typeof entry.createdAt === 'string' && entry.createdAt.length > 0 &&
        !isNaN(Date.parse(entry.createdAt))
      );
    }

    // â”€â”€ Link schema validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Returns true when `entry` satisfies the Link schema:
     *   id    â€” non-empty string
     *   label â€” non-empty string, â‰¤ 100 characters
     *   url   â€” non-empty string, starts with http:// or https://
     */
    function isValidLink(entry) {
      return (
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' && entry.id.length > 0 &&
        typeof entry.label === 'string' && entry.label.length > 0 &&
        typeof entry.url === 'string' &&
        (entry.url.startsWith('http://') || entry.url.startsWith('https://'))
      );
    }

    // â”€â”€ Task persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * loadTasks() â†’ Task[]
     *
     * Reads "tld_tasks" from localStorage, parses the JSON, validates each
     * entry against the Task schema, and returns only valid entries.
     * Returns [] and never throws on missing key, null value, or malformed JSON.
     *
     * Requirements: 9.3, 9.4, 9.5
     */
    function loadTasks() {
      try {
        var raw = localStorage.getItem(TASKS_KEY);
        if (raw === null) { return []; }
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) { return []; }
        return parsed.filter(isValidTask);
      } catch (_err) {
        // SyntaxError from JSON.parse or any unexpected error â†’ safe default
        return [];
      }
    }

    /**
     * saveTasks(tasks) â†’ void
     *
     * Serialises `tasks` to JSON and writes to "tld_tasks".
     * Re-throws any DOMException (quota exceeded) as a plain Error so the
     * caller can roll back in-memory state.
     *
     * Requirements: 9.3, 9.6, 9.7
     *
     * @param {Array} tasks
     */
    function saveTasks(tasks) {
      try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      } catch (err) {
        // Re-throw so TodoModule can roll back and show an error banner
        throw new Error('StorageError: ' + (err.message || 'Could not save tasks.'));
      }
    }

    // â”€â”€ Link persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * loadLinks() â†’ Link[]
     *
     * Reads "tld_links" from localStorage, parses the JSON, validates each
     * entry against the Link schema, and returns only valid entries.
     * Returns [] and never throws on missing key, null value, or malformed JSON.
     *
     * Requirements: 10.3, 10.5
     */
    function loadLinks() {
      try {
        var raw = localStorage.getItem(LINKS_KEY);
        if (raw === null) { return []; }
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) { return []; }
        return parsed.filter(isValidLink);
      } catch (_err) {
        return [];
      }
    }

    /**
     * saveLinks(links) â†’ void
     *
     * Serialises `links` to JSON and writes to "tld_links".
     * Re-throws any DOMException (quota exceeded) as a plain Error.
     *
     * Requirements: 11.3
     *
     * @param {Array} links
     */
    function saveLinks(links) {
      try {
        localStorage.setItem(LINKS_KEY, JSON.stringify(links));
      } catch (err) {
        throw new Error('StorageError: ' + (err.message || 'Could not save links.'));
      }
    }

    // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return {
      loadTasks:  loadTasks,
      saveTasks:  saveTasks,
      loadLinks:  loadLinks,
      saveLinks:  saveLinks
    };

  })();


  /* =========================================================
   * 3. GREETING MODULE
   * ======================================================= */

  /**
   * GreetingModule â€” live clock and time-of-day greeting.
   *
   * Public API:
   *   .init()         â†’ void  (starts 1-second interval)
   *   .getGreeting(h) â†’ string  (pure helper, also used by property tests)
   */
  var GreetingModule = (function () {

    var intervalId = null;

    // â”€â”€ Greeting lookup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * getGreeting(hour) â†’ string
     *
     * Returns the appropriate time-of-day greeting for the given 24-hour
     * clock hour (0â€“23).  Exported so property tests can call it directly
     * without needing a running DOM.
     *
     * Boundaries (inclusive lower, exclusive upper in plain English):
     *   05â€“11 â†’ "Good Morning"
     *   12â€“17 â†’ "Good Afternoon"
     *   18â€“21 â†’ "Good Evening"
     *   22â€“23 and 00â€“04 â†’ "Good Night"
     *
     * Requirements: 2.1, 2.2, 2.3, 2.4
     *
     * @param {number} hour â€” integer 0â€“23
     * @returns {string}
     */
    function getGreeting(hour) {
      if (hour >= 5 && hour <= 11)  { return 'Good Morning'; }
      if (hour >= 12 && hour <= 17) { return 'Good Afternoon'; }
      if (hour >= 18 && hour <= 21) { return 'Good Evening'; }
      return 'Good Night'; // 22â€“23, 00â€“04
    }

    // â”€â”€ Tick (private) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * _tick() â€” updates clock, date, and greeting DOM elements.
     *
     * If `new Date()` throws or produces an Invalid Date, writes "--:--:--"
     * to #clock, clears #date and #greeting-message, and returns without
     * throwing (Requirement 1.5, 2.7).
     */
    function _tick() {
      var elClock    = document.getElementById('clock');
      var elDate     = document.getElementById('date');
      var elGreeting = document.getElementById('greeting-message');

      var now;
      try {
        now = new Date();
        // Guard against an Invalid Date (isNaN check on the time value)
        if (isNaN(now.getTime())) { throw new RangeError('Invalid Date'); }
      } catch (_err) {
        // Fallback display â€” Requirements 1.5, 2.7
        if (elClock)    { elClock.textContent    = '--:--:--'; }
        if (elDate)     { elDate.textContent     = ''; }
        if (elGreeting) { elGreeting.textContent = ''; }
        return;
      }

      // â”€â”€ Clock (HH:MM:SS, 24-hour) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      var ss = String(now.getSeconds()).padStart(2, '0');
      if (elClock) { elClock.textContent = hh + ':' + mm + ':' + ss; }

      // â”€â”€ Date (e.g. "Thursday, 28 August 2026") â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      var dateStr = now.toLocaleDateString('en-GB', {
        weekday: 'long',
        day:     'numeric',
        month:   'long',
        year:    'numeric'
      });
      if (elDate) { elDate.textContent = dateStr; }

      // â”€â”€ Greeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (elGreeting) { elGreeting.textContent = getGreeting(now.getHours()); }
    }

    // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * init() â€” immediately runs the first tick, then schedules one every
     * 1 000 ms for the lifetime of the page.
     *
     * Requirements: 1.3, 2.6
     */
    function init() {
      _tick();
      intervalId = setInterval(_tick, 1000);
    }

    return {
      init:        init,
      getGreeting: getGreeting   // exposed for property tests
    };

  })();


  /* =========================================================
   * 4. TIMER MODULE
   * ======================================================= */

  /**
   * TimerModule â€” Pomodoro-style 25-minute countdown.
   *
   * State machine: idle â†’ running â†’ stopped â†’ running â†’ â€¦ â†’ completed â†’ idle
   *
   * Public API:
   *   .init()   â†’ void
   *   .start()  â†’ void
   *   .stop()   â†’ void
   *   .reset()  â†’ void
   */
  var TimerModule = (function () {

    var INITIAL_SECONDS = 1500; // 25 minutes

    // Runtime state (not persisted â€” Requirements 3.x design note)
    var state      = 'idle';   // TimerState: idle | running | stopped | completed
    var remaining  = INITIAL_SECONDS;
    var intervalId = null;
    var audio      = null;

    // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** Format seconds as MM:SS string. */
    function formatTime(seconds) {
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    /** Push the current remaining value into #timer-display. */
    function _updateDisplay() {
      var el = document.getElementById('timer-display');
      if (el) { el.textContent = formatTime(remaining); }
    }

    /**
     * Sync the disabled state of the three buttons to the current state.
     *
     * Control availability per state (design doc table):
     *   idle      â†’ Start: enabled   Stop: disabled  Reset: enabled
     *   running   â†’ Start: disabled  Stop: enabled   Reset: enabled
     *   stopped   â†’ Start: enabled   Stop: disabled  Reset: enabled
     *   completed â†’ Start: disabled  Stop: disabled  Reset: enabled
     *
     * Requirements: 4.5, 4.6, 4.8
     */
    function _updateButtons() {
      var btnStart = document.getElementById('btn-start');
      var btnStop  = document.getElementById('btn-stop');
      var btnReset = document.getElementById('btn-reset');

      if (btnStart) { btnStart.disabled = (state === 'running' || state === 'completed'); }
      if (btnStop)  { btnStop.disabled  = (state !== 'running'); }
      if (btnReset) { btnReset.disabled = false; }
    }

    /**
     * Show or hide the completion banner.
     *
     * The CSS rule `#timer-complete-banner { display: none; }` controls the
     * default hidden state; toggling the `hidden` attribute alone would not
     * override it because the CSS specificity wins.  We therefore drive
     * visibility with an inline `style.display` override, which takes
     * precedence over the stylesheet rule (Requirement 3.5).
     */
    function _setBanner(visible) {
      var banner = document.getElementById('timer-complete-banner');
      if (!banner) { return; }
      banner.style.display = visible ? 'block' : 'none';
    }

    // â”€â”€ Tick (private) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * _tick() â€” called by setInterval every 1 000 ms while running.
     *
     * Decrements remaining; when it reaches 0, clears the interval,
     * transitions to 'completed', shows the banner, and attempts audio play.
     *
     * Requirements: 3.2, 3.3, 3.4, 3.5
     */
    function _tick() {
      if (remaining > 0) { remaining -= 1; }
      _updateDisplay();

      if (remaining === 0) {
        clearInterval(intervalId);
        intervalId = null;
        state = 'completed';
        _updateButtons();
        _setBanner(true);

        // Audio notification â€” Requirements 3.5, 15.2
        if (audio) {
          audio.play().catch(function (err) {
            // Autoplay may be blocked (e.g. user hasn't interacted with page)
            console.warn('TimerModule: audio play blocked â€”', err.message);
          });
        }
      }
    }

    // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * init() â€” set up initial idle state and bind button event handlers.
     * Requirements: 3.1, 4.1
     */
    function init() {
      state     = 'idle';
      remaining = INITIAL_SECONDS;

      _updateDisplay();
      _updateButtons();
      _setBanner(false);

      // Audio will be wired during the bootstrap phase (task 8.2)
      // â€” left as null here so _tick() degrades gracefully.

      var btnStart = document.getElementById('btn-start');
      var btnStop  = document.getElementById('btn-stop');
      var btnReset = document.getElementById('btn-reset');

      if (btnStart) { btnStart.addEventListener('click', start); }
      if (btnStop)  { btnStop.addEventListener('click', stop); }
      if (btnReset) { btnReset.addEventListener('click', reset); }
    }

    /**
     * start() â€” transition idle|stopped â†’ running.
     * Silently ignored in any other state (Requirements 3.6, 4.7).
     */
    function start() {
      if (state !== 'idle' && state !== 'stopped') { return; }
      state = 'running';
      _updateButtons();
      intervalId = setInterval(_tick, 1000);
    }

    /**
     * stop() â€” transition running â†’ stopped, preserving remaining.
     * Silently ignored in any other state (Requirement 4.3).
     */
    function stop() {
      if (state !== 'running') { return; }
      clearInterval(intervalId);
      intervalId = null;
      state = 'stopped';
      _updateButtons();
    }

    /**
     * reset() â€” transition any â†’ idle, restore 1500 s.
     * Requirements: 4.4
     */
    function reset() {
      clearInterval(intervalId);
      intervalId = null;
      state     = 'idle';
      remaining = INITIAL_SECONDS;
      _updateDisplay();
      _updateButtons();
      _setBanner(false);
    }

    /**
     * setAudio(audioObj) â€” called by bootstrap to inject the beep Audio
     * instance (keeps AudioContext creation out of init so it can run
     * after user interaction).
     */
    function setAudio(audioObj) {
      audio = audioObj;
    }

    return {
      init:     init,
      start:    start,
      stop:     stop,
      reset:    reset,
      setAudio: setAudio
    };

  })();


  /* =========================================================
   * 5. TODO MODULE
   * ======================================================= */

  /**
   * TodoModule â€” task CRUD, rendering, and edit-mode management.
   *
   * Public API:
   *   .init(tasks)
   *   .addTask(description)
   *   .toggleTask(id)
   *   .editTask(id, newTitle)      â† persistence wrapper called by _exitEditMode
   *   .deleteTask(id)
   */
  var TodoModule = (function () {

    var tasks       = [];       // in-memory Task[]
    var editingId   = null;     // id of the task currently in edit mode (or null)

    // â”€â”€ Error banner helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    var _todoDismissTimer = null;

    /**
     * _showError(msg) â€” writes `msg` to #todo-error, makes it visible, and
     * schedules auto-dismiss after 5 seconds.
     */
    function _showError(msg) {
      var el = document.getElementById('todo-error');
      if (!el) { return; }
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(_todoDismissTimer);
      _todoDismissTimer = setTimeout(function () {
        el.style.display = 'none';
        el.textContent = '';
      }, 5000);
    }

    function _hideError() {
      var el = document.getElementById('todo-error');
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    }

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * _renderList() â€” full re-render of <ul id="todo-list">.
     *
     * For each task renders:
     *   checkbox (toggles completion) | span.task-title | Edit btn | Delete btn
     *
     * Requirements: 7.1, 7.2, 7.3, 8.1, 9.1
     */
    function _renderList() {
      var ul = document.getElementById('todo-list');
      if (!ul) { return; }
      ul.innerHTML = '';

      tasks.forEach(function (task) {
        var li = document.createElement('li');
        li.className  = 'todo-item' + (task.completed ? ' completed' : '');
        li.dataset.id = task.id;

        // Checkbox
        var checkbox = document.createElement('input');
        checkbox.type    = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label', 'Mark "' + task.title + '" as ' +
          (task.completed ? 'not done' : 'done'));
        checkbox.addEventListener('change', function () {
          TodoModule.toggleTask(task.id);
        });

        // Title span
        var span = document.createElement('span');
        span.className   = 'task-title' + (task.completed ? ' completed' : '');
        span.textContent = task.title;

        // Edit button
        var btnEdit = document.createElement('button');
        btnEdit.type        = 'button';
        btnEdit.className   = 'btn-edit';
        btnEdit.textContent = 'Edit';
        btnEdit.setAttribute('aria-label', 'Edit task: ' + task.title);
        btnEdit.addEventListener('click', function () {
          _enterEditMode(task.id);
        });

        // Delete button
        var btnDelete = document.createElement('button');
        btnDelete.type        = 'button';
        btnDelete.className   = 'btn-delete';
        btnDelete.textContent = 'Delete';
        btnDelete.setAttribute('aria-label', 'Delete task: ' + task.title);
        btnDelete.addEventListener('click', function () {
          TodoModule.deleteTask(task.id);
        });

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(btnEdit);
        li.appendChild(btnDelete);
        ul.appendChild(li);
      });
    }

    // â”€â”€ Edit mode (private) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * _enterEditMode(id) â€” replaces the title span with an editable input.
     * If another task is already in edit mode, does nothing (Requirement 6.7).
     */
    function _enterEditMode(id) {
      if (editingId !== null) { return; }

      var li = document.querySelector('[data-id="' + id + '"]');
      if (!li) { return; }

      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) { return; }

      editingId = id;

      var span    = li.querySelector('.task-title');
      var btnEdit = li.querySelector('.btn-edit');

      // Replace span with an input field pre-populated with the current title
      var input = document.createElement('input');
      input.type      = 'text';
      input.className = 'task-edit-input';
      input.value     = task.title;
      input.maxLength = 500;
      input.setAttribute('aria-label', 'Editing task: ' + task.title);

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  { _exitEditMode(id, true); }
        if (e.key === 'Escape') { _exitEditMode(id, false); }
      });

      if (span)    { li.replaceChild(input, span); }
      if (btnEdit) { btnEdit.style.display = 'none'; }

      input.focus();
    }

    /**
     * _exitEditMode(id, save) â€” confirms or discards an in-progress edit.
     *
     * If save === true and input is non-whitespace â†’ update title + persist.
     * If save === true and input is whitespace-only â†’ restore original (Req 6.5).
     * If save === false (Escape) â†’ discard (Requirement 6.6).
     */
    function _exitEditMode(id, save) {
      if (editingId !== id) { return; }

      var li = document.querySelector('[data-id="' + id + '"]');
      var input = li ? li.querySelector('.task-edit-input') : null;

      if (save && input) {
        var newTitle = input.value.trim();
        if (newTitle.length > 0) {
          TodoModule.editTask(id, newTitle);
        }
        // whitespace-only: fall through to _renderList() without saving
      }

      editingId = null;
      _renderList();
    }

    // â”€â”€ Public CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * init(initialTasks) â€” store tasks, render list, bind form events.
     * Requirements: 5.1, 9.1, 9.2
     */
    function init(initialTasks) {
      tasks = Array.isArray(initialTasks) ? initialTasks : [];
      _renderList();

      var input  = document.getElementById('todo-input');
      var btnAdd = document.getElementById('btn-add-todo');

      if (btnAdd) {
        btnAdd.addEventListener('click', function () {
          TodoModule.addTask(input ? input.value : '');
        });
      }

      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { TodoModule.addTask(input.value); }
        });
      }
    }

    /**
     * addTask(description) â€” validate, create, render, persist.
     * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
     */
    function addTask(description) {
      var title = typeof description === 'string' ? description.trim() : '';

      if (title.length === 0) {
        _showError('Task description cannot be empty.');
        return;
      }

      if (tasks.length >= 100) {
        _showError('Maximum number of tasks reached.');
        return;
      }

      var task = {
        id:        generateId(),
        title:     title,
        completed: false,
        createdAt: new Date().toISOString()
      };

      tasks.push(task);
      _renderList();
      _hideError();

      // Clear the input field
      var input = document.getElementById('todo-input');
      if (input) { input.value = ''; }

      // Persist
      try {
        StorageManager.saveTasks(tasks);
      } catch (_err) {
        // Roll back
        tasks.pop();
        _renderList();
        _showError('Task could not be saved.');
      }
    }

    /**
     * toggleTask(id) â€” flip completed flag, render, persist.
     * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
     */
    function toggleTask(id) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) { return; }

      task.completed = !task.completed;
      _renderList();

      try {
        StorageManager.saveTasks(tasks);
      } catch (_err) {
        // Roll back
        task.completed = !task.completed;
        _renderList();
        _showError('Change could not be saved.');
      }
    }

    /**
     * editTask(id, newTitle) â€” update title in-memory, persist.
     * Called by _exitEditMode after validation.
     * Requirements: 6.3, 6.4
     */
    function editTask(id, newTitle) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) { return; }

      var previousTitle = task.title;
      task.title = newTitle;

      try {
        StorageManager.saveTasks(tasks);
      } catch (_err) {
        // Roll back
        task.title = previousTitle;
        _showError('Task could not be saved.');
      }
    }

    /**
     * deleteTask(id) â€” remove from array, render, persist.
     * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    function deleteTask(id) {
      var idx = tasks.findIndex(function (t) { return t.id === id; });
      if (idx === -1) { return; }

      var removed = tasks.splice(idx, 1)[0];
      _renderList();

      try {
        StorageManager.saveTasks(tasks);
      } catch (_err) {
        // Roll back
        tasks.splice(idx, 0, removed);
        _renderList();
        _showError('Deletion could not be saved.');
      }
    }

    return {
      init:       init,
      addTask:    addTask,
      toggleTask: toggleTask,
      editTask:   editTask,
      deleteTask: deleteTask
    };

  })();


  /* =========================================================
   * 6. QUICK LINKS MODULE
   * ======================================================= */

  /**
   * QuickLinksModule â€” link CRUD, rendering, and validation.
   *
   * Public API:
   *   .init(links)
   *   .addLink(label, url)
   *   .deleteLink(id)
   */
  var QuickLinksModule = (function () {

    var links = [];   // in-memory Link[]

    // â”€â”€ Error banner helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    var _linksDismissTimer = null;

    function _showError(msg) {
      var el = document.getElementById('links-error');
      if (!el) { return; }
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(_linksDismissTimer);
      _linksDismissTimer = setTimeout(function () {
        el.style.display = 'none';
        el.textContent = '';
      }, 5000);
    }

    function _hideError() {
      var el = document.getElementById('links-error');
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    }

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * _renderPanel() â€” re-render #links-panel with the current link array.
     *
     * Each link renders as a button (opens URL in new tab) + a Delete control.
     * Links with missing/malformed URLs are skipped (Requirement 10.5).
     * Labels are truncated to 100 chars for display (Requirement 10.6).
     *
     * Requirements: 10.1, 10.2, 10.5, 10.6, 12.1
     */
    function _renderPanel() {
      var panel = document.getElementById('links-panel');
      if (!panel) { return; }
      panel.innerHTML = '';

      links.forEach(function (link) {
        // Skip links with invalid URLs (should not normally reach here after
        // validation at add-time, but guards against corrupt storage data)
        if (!link.url ||
            (!link.url.startsWith('http://') && !link.url.startsWith('https://'))) {
          return;
        }

        var item = document.createElement('div');
        item.className  = 'link-item';
        item.dataset.id = link.id;

        // Link button â€” opens in new tab
        var btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'btn-link';
        // Truncate label to 100 chars for display; full URL preserved on btn
        var displayLabel = link.label.length > 100
          ? link.label.slice(0, 100)
          : link.label;
        btn.textContent = displayLabel;
        btn.title       = link.url; // tooltip shows full URL
        btn.setAttribute('aria-label', 'Open ' + displayLabel + ' in new tab');
        btn.addEventListener('click', function () {
          window.open(link.url, '_blank', 'noopener,noreferrer');
        });

        // Delete button
        var btnDelete = document.createElement('button');
        btnDelete.type        = 'button';
        btnDelete.className   = 'btn-delete-link';
        btnDelete.textContent = 'Delete';
        btnDelete.setAttribute('aria-label', 'Delete link: ' + displayLabel);
        btnDelete.addEventListener('click', function () {
          QuickLinksModule.deleteLink(link.id);
        });

        item.appendChild(btn);
        item.appendChild(btnDelete);
        panel.appendChild(item);
      });
    }

    // â”€â”€ Public CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * init(initialLinks) â€” store links, render panel, bind form events.
     * Requirements: 10.3, 10.4
     */
    function init(initialLinks) {
      links = Array.isArray(initialLinks) ? initialLinks : [];
      _renderPanel();

      var btnAdd = document.getElementById('btn-add-link');
      if (btnAdd) {
        btnAdd.addEventListener('click', function () {
          var labelInput = document.getElementById('link-label-input');
          var urlInput   = document.getElementById('link-url-input');
          QuickLinksModule.addLink(
            labelInput ? labelInput.value : '',
            urlInput   ? urlInput.value   : ''
          );
        });
      }
    }

    /**
     * addLink(label, url) â€” validate, create, render, persist.
     * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
     */
    function addLink(label, url) {
      var trimLabel = typeof label === 'string' ? label.trim() : '';
      var trimUrl   = typeof url   === 'string' ? url.trim()   : '';

      // Field-level validation
      if (trimLabel.length === 0) {
        _showError('Label cannot be empty.');
        return;
      }
      if (trimUrl.length === 0) {
        _showError('URL cannot be empty.');
        return;
      }
      if (!trimUrl.startsWith('http://') && !trimUrl.startsWith('https://')) {
        _showError('URL must start with http:// or https://');
        return;
      }

      if (links.length >= 50) {
        _showError('Maximum number of links reached.');
        return;
      }

      var link = {
        id:    generateId(),
        label: trimLabel,
        url:   trimUrl
      };

      links.push(link);
      _renderPanel();
      _hideError();

      // Clear input fields
      var labelInput = document.getElementById('link-label-input');
      var urlInput   = document.getElementById('link-url-input');
      if (labelInput) { labelInput.value = ''; }
      if (urlInput)   { urlInput.value   = ''; }

      // Persist
      try {
        StorageManager.saveLinks(links);
      } catch (_err) {
        links.pop();
        _renderPanel();
        _showError('Link could not be saved.');
      }
    }

    /**
     * deleteLink(id) â€” remove link from array, render, persist.
     * Requirements: 12.1, 12.2, 12.3, 12.4
     */
    function deleteLink(id) {
      var idx = links.findIndex(function (l) { return l.id === id; });
      if (idx === -1) { return; }

      var removed = links.splice(idx, 1)[0];
      _renderPanel();

      try {
        StorageManager.saveLinks(links);
      } catch (_err) {
        links.splice(idx, 0, removed);
        _renderPanel();
        _showError('Deletion could not be saved.');
      }
    }

    return {
      init:       init,
      addLink:    addLink,
      deleteLink: deleteLink
    };

  })();


  /* =========================================================
   * 7. BOOTSTRAP â€” DOMContentLoaded
   * ======================================================= */

  /**
   * Wires all modules together once the DOM is ready.
   *
   * Load order:
   *   1. StorageManager reads persisted data.
   *   2. TodoModule and QuickLinksModule are initialised with stored data.
   *   3. GreetingModule starts its clock tick.
   *   4. TimerModule renders idle state and binds button handlers.
   *
   * Requirements: 9.1, 9.2, 10.3, 10.4, 14.1, 14.2
   */
  document.addEventListener('DOMContentLoaded', function () {

    // â”€â”€ Load persisted data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var storedTasks = StorageManager.loadTasks();
    var storedLinks = StorageManager.loadLinks();

    // â”€â”€ Initialise modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    TodoModule.init(storedTasks);
    QuickLinksModule.init(storedLinks);
    GreetingModule.init();
    TimerModule.init();

    // â”€â”€ Audio notification (task 8.2 â€” base64 beep injected here) â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // A short 440 Hz beep encoded as a data URI so it plays under file://
    // (the full base64 string will be filled in during task 8.2).
    TimerModule.setAudio(new Audio('data:audio/wav;base64,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'));

  });

})(); // end top-level IIFE
