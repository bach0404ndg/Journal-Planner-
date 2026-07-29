const STORAGE_KEY = "monthly-planner-journal-v1";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const defaultJournalLabels = ["Grateful", "Idea", "Memory", "Reflection"];

const emojiOptions = [
  { emoji: "⭐", label: "Star" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "❤️", label: "Health" },
  { emoji: "💪", label: "Workout" },
  { emoji: "💰", label: "Money" },
  { emoji: "📚", label: "Study" },
  { emoji: "✈️", label: "Travel" },
  { emoji: "🌱", label: "Growth" },
];

const state = {
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  selectedDate: toDateKey(new Date()),
  range: "week",
  editingJournalId: null,
  draggingGoalSectionId: null,
  journalFilters: { date: "", month: "", year: "", label: "" },
  data: loadData(),
};

const els = {
  monthSelect: document.querySelector("#monthSelect"),
  yearInput: document.querySelector("#yearInput"),
  weekdayRow: document.querySelector("#weekdayRow"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDateInput: document.querySelector("#selectedDateInput"),
  calendarRemoveOldDataButton: document.querySelector("#calendarRemoveOldDataButton"),
  calendarNoteForm: document.querySelector("#calendarNoteForm"),
  calendarNoteInput: document.querySelector("#calendarNoteInput"),
  emojiPalette: document.querySelector("#emojiPalette"),
  selectedDateNotes: document.querySelector("#selectedDateNotes"),
  todayButton: document.querySelector("#todayButton"),
  rangeButtons: document.querySelectorAll(".range-button"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  sectionForm: document.querySelector("#sectionForm"),
  sectionNameInput: document.querySelector("#sectionNameInput"),
  goalSections: document.querySelector("#goalSections"),
  goalSectionTemplate: document.querySelector("#goalSectionTemplate"),
  journalForm: document.querySelector("#journalForm"),
  journalCity: document.querySelector("#journalCity"),
  journalDate: document.querySelector("#journalDate"),
  journalTime: document.querySelector("#journalTime"),
  journalLabel: document.querySelector("#journalLabel"),
  addJournalLabelButton: document.querySelector("#addJournalLabelButton"),
  removeJournalLabelButton: document.querySelector("#removeJournalLabelButton"),
  journalText: document.querySelector("#journalText"),
  journalSubmitButton: document.querySelector("#journalSubmitButton"),
  cancelJournalEditButton: document.querySelector("#cancelJournalEditButton"),
  journalLog: document.querySelector("#journalLog"),
  journalFilterDate: document.querySelector("#journalFilterDate"),
  journalFilterMonth: document.querySelector("#journalFilterMonth"),
  journalFilterYear: document.querySelector("#journalFilterYear"),
  journalFilterLabel: document.querySelector("#journalFilterLabel"),
  resetJournalFiltersButton: document.querySelector("#resetJournalFiltersButton"),
  removeOldDataButton: document.querySelector("#removeOldDataButton"),
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return {
        calendarNotes: saved.calendarNotes || {},
        dayEmojis: saved.dayEmojis || {},
        goalSections: normalizeGoalSections(saved.goalSections),
        journalLabels: normalizeJournalLabels(saved.journalLabels, saved.journalEntries),
        journalEntries: saved.journalEntries || [],
      };
    }
  } catch (error) {
    console.warn("Planner data could not be loaded.", error);
  }

  return {
    calendarNotes: {},
    dayEmojis: {},
    goalSections: [],
    journalLabels: [...defaultJournalLabels],
    journalEntries: [],
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeGoalSections(savedSections) {
  if (Array.isArray(savedSections)) {
    return savedSections;
  }

  if (!savedSections || typeof savedSections !== "object") {
    return [];
  }

  const mergedSections = new Map();
  Object.keys(savedSections)
    .sort()
    .forEach((key) => {
      const sections = Array.isArray(savedSections[key]) ? savedSections[key] : [];
      sections.forEach((section) => {
        const title = section.title || "Untitled";
        if (!mergedSections.has(title)) {
          mergedSections.set(title, {
            id: section.id || makeId("section"),
            title,
            goals: [],
          });
        }

        const targetSection = mergedSections.get(title);
        const goals = Array.isArray(section.goals) ? section.goals : [];
        goals.forEach((goal) => {
          targetSection.goals.push({
            id: goal.id || makeId("goal"),
            text: goal.text || "",
            done: Boolean(goal.done),
            dueDate: goal.dueDate || "",
          });
        });
      });
    });

  return [...mergedSections.values()];
}

function readableDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isDateKeyBefore(dateKey, cutoffDateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dateKey < cutoffDateKey;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function normalizeJournalLabels(savedLabels, entries = []) {
  const labels = Array.isArray(savedLabels) ? savedLabels : defaultJournalLabels;
  const entryLabels = entries.map((entry) => getEntryLabel(entry)).filter(Boolean);
  return [...new Set([...labels, ...entryLabels])].sort((a, b) => a.localeCompare(b));
}

function getEntryLabel(entry) {
  if (entry.label) return entry.label;
  if (Array.isArray(entry.tags) && entry.tags.length) return entry.tags[0];
  return "";
}

function ensureJournalLabel(label) {
  if (!state.data.journalLabels.includes(label)) {
    state.data.journalLabels.push(label);
    state.data.journalLabels.sort((a, b) => a.localeCompare(b));
    saveData();
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function init() {
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = name;
    els.monthSelect.append(option);
  });

  els.journalFilterMonth.append(makeOption("", "All months"));
  monthNames.forEach((name, index) => {
    els.journalFilterMonth.append(makeOption(String(index + 1), name));
  });

  weekdayNames.forEach((name) => {
    const day = document.createElement("div");
    day.className = "weekday";
    day.textContent = name;
    els.weekdayRow.append(day);
  });

  els.monthSelect.value = state.month;
  els.yearInput.value = state.year;
  els.selectedDateInput.value = state.selectedDate;

  const now = new Date();
  els.journalDate.value = toDateKey(now);
  els.journalTime.value = now.toTimeString().slice(0, 5);

  bindEvents();
  ensureStarterSections();
  renderJournalLabelOptions();
  renderAll();
}

function bindEvents() {
  els.monthSelect.addEventListener("change", () => {
    state.month = Number(els.monthSelect.value);
    selectFirstVisibleDate();
    renderCalendar();
  });

  els.selectedDateInput.addEventListener("change", () => {
    if (!els.selectedDateInput.value) return;
    const nextDate = parseDateKey(els.selectedDateInput.value);
    state.selectedDate = els.selectedDateInput.value;
    state.month = nextDate.getMonth();
    state.year = nextDate.getFullYear();
    els.monthSelect.value = state.month;
    els.yearInput.value = state.year;
    renderCalendar();
  });

  els.yearInput.addEventListener("change", () => {
    const nextYear = Number(els.yearInput.value);
    state.year = Number.isFinite(nextYear) ? nextYear : new Date().getFullYear();
    els.yearInput.value = state.year;
    selectFirstVisibleDate();
    renderCalendar();
  });

  els.rangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.range = button.dataset.range;
      els.rangeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      renderCalendar();
    });
  });

  els.todayButton.addEventListener("click", () => {
    const today = new Date();
      state.month = today.getMonth();
      state.year = today.getFullYear();
      state.selectedDate = toDateKey(today);
    state.range = "week";
    els.monthSelect.value = state.month;
    els.yearInput.value = state.year;
    els.rangeButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.range === "week"));
    renderCalendar();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      els.views.forEach((view) => {
        view.classList.toggle("is-active", view.id === `${tab.dataset.view}View`);
      });
    });
  });

  els.calendarNoteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = els.calendarNoteInput.value.trim();
    if (!text || !state.selectedDate) return;

    const notes = state.data.calendarNotes[state.selectedDate] || [];
    notes.push({ id: makeId("note"), text, done: false });
    state.data.calendarNotes[state.selectedDate] = notes;
    els.calendarNoteInput.value = "";
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
  });

  els.sectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = els.sectionNameInput.value.trim() || "New section";
    addGoalSection(title);
    els.sectionNameInput.value = "";
  });

  els.journalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const entryText = els.journalText.value.trim();
    if (!entryText) return;

    const entryData = {
      city: els.journalCity.value.trim(),
      date: els.journalDate.value,
      time: els.journalTime.value,
      label: els.journalLabel.value,
      text: entryText,
    };

    if (state.editingJournalId) {
      const entry = state.data.journalEntries.find((item) => item.id === state.editingJournalId);
      if (entry) {
        Object.assign(entry, entryData, { tags: entryData.label ? [entryData.label] : [], updatedAt: new Date().toISOString() });
      }
    } else {
      state.data.journalEntries.unshift({
        id: makeId("journal"),
        ...entryData,
        tags: entryData.label ? [entryData.label] : [],
        createdAt: new Date().toISOString(),
      });
    }

    resetJournalForm();
    saveData();
    renderJournal();
  });

  els.addJournalLabelButton.addEventListener("click", () => {
    const label = window.prompt("New journal label");
    if (!label) return;
    const clean = label.trim().slice(0, 32);
    if (!clean) return;
    ensureJournalLabel(clean);
    renderJournalLabelOptions(clean);
    renderJournal();
  });

  els.removeJournalLabelButton.addEventListener("click", () => {
    const label = els.journalLabel.value;
    if (!label) return;
    const confirmed = window.confirm(`Remove "${label}" from saved labels and journal entries?`);
    if (!confirmed) return;

    state.data.journalLabels = state.data.journalLabels.filter((item) => item !== label);
    state.data.journalEntries.forEach((entry) => {
      if (getEntryLabel(entry) === label) {
        entry.label = "";
        entry.tags = [];
      }
    });
    if (state.journalFilters.label === label) {
      state.journalFilters.label = "";
    }
    saveData();
    renderJournalLabelOptions();
    renderJournal();
  });

  els.cancelJournalEditButton.addEventListener("click", () => {
    resetJournalForm();
  });

  els.journalFilterDate.addEventListener("change", () => {
    state.journalFilters.date = els.journalFilterDate.value;
    renderJournal();
  });

  els.journalFilterMonth.addEventListener("change", () => {
    state.journalFilters.month = els.journalFilterMonth.value;
    renderJournal();
  });

  els.journalFilterYear.addEventListener("change", () => {
    state.journalFilters.year = els.journalFilterYear.value.trim();
    renderJournal();
  });

  els.journalFilterLabel.addEventListener("change", () => {
    state.journalFilters.label = els.journalFilterLabel.value;
    renderJournal();
  });

  els.resetJournalFiltersButton.addEventListener("click", () => {
    state.journalFilters = { date: "", month: "", year: "", label: "" };
    els.journalFilterDate.value = "";
    els.journalFilterMonth.value = "";
    els.journalFilterYear.value = "";
    els.journalFilterLabel.value = "";
    renderJournal();
  });

  els.calendarRemoveOldDataButton.addEventListener("click", () => {
    removeOldData();
  });

  els.removeOldDataButton.addEventListener("click", () => {
    removeOldData();
  });

}

function selectFirstVisibleDate() {
  state.selectedDate = `${state.year}-${String(state.month + 1).padStart(2, "0")}-01`;
}

function setCalendarDate(dateKey) {
  const nextDate = parseDateKey(dateKey);
  state.selectedDate = dateKey;
  state.month = nextDate.getMonth();
  state.year = nextDate.getFullYear();
  els.selectedDateInput.value = state.selectedDate;
  els.monthSelect.value = state.month;
  els.yearInput.value = state.year;
}

function ensureStarterSections() {
  if (state.data.goalSections.length) return;

  state.data.goalSections = [
    { id: makeId("section"), title: "Priorities", goals: [] },
    { id: makeId("section"), title: "Optional goals", goals: [] },
    { id: makeId("section"), title: "Personal", goals: [] },
  ];
  saveData();
}

function getGoalSections() {
  if (!Array.isArray(state.data.goalSections)) {
    state.data.goalSections = [];
  }
  return state.data.goalSections;
}

function addGoalSection(title) {
  getGoalSections().push({ id: makeId("section"), title, goals: [] });
  saveData();
  renderGoals();
}

function moveGoalSection(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const sections = getGoalSections();
  const fromIndex = sections.findIndex((section) => section.id === draggedId);
  const toIndex = sections.findIndex((section) => section.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [movedSection] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, movedSection);
  saveData();
  renderGoals();
}

function renderAll() {
  ensureStarterSections();
  renderCalendar();
  renderGoals();
  renderJournal();
}

function defaultCleanupDateKey() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return toDateKey(date);
}

function removeOldData() {
  const cutoffDate = window.prompt("Remove saved data before this date:", defaultCleanupDateKey());
  if (!cutoffDate || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) return;

  const confirmed = window.confirm(
    `Remove journal entries, calendar tasks, day markers, and dated goals before ${cutoffDate}? This cannot be undone.`,
  );
  if (!confirmed) return;

  const before = {
    calendarDays: Object.keys(state.data.calendarNotes).length,
    markerDays: Object.keys(state.data.dayEmojis).length,
    journalEntries: state.data.journalEntries.length,
    datedGoals: getGoalSections().reduce((count, section) => count + section.goals.filter((goal) => goal.dueDate).length, 0),
  };

  Object.keys(state.data.calendarNotes).forEach((dateKey) => {
    if (isDateKeyBefore(dateKey, cutoffDate)) {
      delete state.data.calendarNotes[dateKey];
    }
  });

  Object.keys(state.data.dayEmojis).forEach((dateKey) => {
    if (isDateKeyBefore(dateKey, cutoffDate)) {
      delete state.data.dayEmojis[dateKey];
    }
  });

  state.data.journalEntries = state.data.journalEntries.filter((entry) => !entry.date || !isDateKeyBefore(entry.date, cutoffDate));
  getGoalSections().forEach((section) => {
    section.goals = section.goals.filter((goal) => !goal.dueDate || !isDateKeyBefore(goal.dueDate, cutoffDate));
  });

  const after = {
    calendarDays: Object.keys(state.data.calendarNotes).length,
    markerDays: Object.keys(state.data.dayEmojis).length,
    journalEntries: state.data.journalEntries.length,
    datedGoals: getGoalSections().reduce((count, section) => count + section.goals.filter((goal) => goal.dueDate).length, 0),
  };

  saveData();
  renderAll();

  const removed =
    before.calendarDays -
    after.calendarDays +
    before.markerDays -
    after.markerDays +
    before.journalEntries -
    after.journalEntries +
    before.datedGoals -
    after.datedGoals;
  window.alert(`Removed ${removed} old saved item${removed === 1 ? "" : "s"}.`);
}

function renderCalendar() {
  const selectedDate = parseDateKey(state.selectedDate);
  const firstOfMonth = new Date(state.year, state.month, 1);
  const gridStart = state.range === "week" ? startOfWeek(selectedDate) : startOfWeek(firstOfMonth);
  const totalDays = state.range === "week" ? 7 : 28;
  const gridEnd = addDays(gridStart, totalDays - 1);
  els.calendarGrid.innerHTML = "";
  els.calendarGrid.classList.toggle("is-week-view", state.range === "week");

  const todayKey = toDateKey(new Date());

  for (let index = 0; index < totalDays; index += 1) {
    const cellDate = addDays(gridStart, index);
    const dateKey = toDateKey(cellDate);
    const isCurrentMonth = cellDate.getMonth() === state.month;
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.classList.toggle("is-muted", !isCurrentMonth);
    cell.classList.toggle("is-today", dateKey === todayKey);
    cell.classList.toggle("is-selected", dateKey === state.selectedDate);
    cell.addEventListener("click", (event) => {
      if (event.target.closest("button, input, label")) return;
      state.selectedDate = dateKey;
      renderCalendar();
      renderSelectedDateNotes();
    });

    const number = document.createElement("button");
    number.className = "day-number";
    number.type = "button";
    number.textContent = cellDate.getDate();
    number.setAttribute("aria-label", `Select ${readableDate(dateKey)}`);
    number.addEventListener("click", () => {
      state.selectedDate = dateKey;
      renderCalendar();
      renderSelectedDateNotes();
    });
    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";
    dayHeader.append(number, makeDayEmojiMarks(dateKey));
    cell.append(dayHeader);

    const notes = document.createElement("span");
    notes.className = "cell-notes";
    const dayNotes = state.data.calendarNotes[dateKey] || [];
    dayNotes.forEach((note) => notes.append(makeCalendarTask(note, dateKey)));
    getGoalsForDate(dateKey).forEach((goalMatch) => notes.append(makeCalendarGoalTask(goalMatch, "calendar")));

    cell.append(notes);
    els.calendarGrid.append(cell);
  }

  renderSelectedDateNotes();
}

function makePill(text, className) {
  const pill = document.createElement("span");
  pill.className = className;
  pill.textContent = text;
  return pill;
}

function makeDayEmojiMarks(dateKey) {
  const wrapper = document.createElement("div");
  wrapper.className = "day-emoji-marks";
  const emojis = state.data.dayEmojis[dateKey] || [];

  emojis.forEach((emoji) => {
    const mark = document.createElement("span");
    mark.textContent = emoji;
    wrapper.append(mark);
  });

  return wrapper;
}

function renderEmojiPalette() {
  els.emojiPalette.innerHTML = "";
  const selectedEmojis = state.data.dayEmojis[state.selectedDate] || [];

  emojiOptions.forEach((option) => {
    const button = document.createElement("button");
    button.className = "emoji-button";
    button.classList.toggle("is-active", selectedEmojis.includes(option.emoji));
    button.type = "button";
    button.textContent = option.emoji;
    button.title = option.label;
    button.setAttribute("aria-label", `Toggle ${option.label}`);
    button.addEventListener("click", () => {
      toggleDayEmoji(option.emoji);
    });
    els.emojiPalette.append(button);
  });
}

function toggleDayEmoji(emoji) {
  const emojis = state.data.dayEmojis[state.selectedDate] || [];
  if (emojis.includes(emoji)) {
    state.data.dayEmojis[state.selectedDate] = emojis.filter((item) => item !== emoji);
  } else {
    state.data.dayEmojis[state.selectedDate] = [...emojis, emoji];
  }

  if (!state.data.dayEmojis[state.selectedDate].length) {
    delete state.data.dayEmojis[state.selectedDate];
  }

  saveData();
  renderCalendar();
  renderSelectedDateNotes();
}

function makeCalendarTask(note, dateKey) {
  return makeTaskRow(note, dateKey, "calendar");
}

function getGoalsForDate(dateKey) {
  return getGoalSections().flatMap((section) =>
    section.goals.filter((goal) => goal.dueDate === dateKey).map((goal) => ({ section, goal })),
  );
}

function makeCalendarGoalTask(goalMatch, variant) {
  const { goal } = goalMatch;
  const task = document.createElement("div");
  task.className = variant === "calendar" ? "note-pill calendar-task calendar-goal-task" : "mini-item calendar-task calendar-goal-task";
  task.classList.toggle("is-done", Boolean(goal.done));
  task.addEventListener("click", (event) => event.stopPropagation());

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(goal.done);
  checkbox.setAttribute("aria-label", "Mark goal complete");
  checkbox.addEventListener("change", () => {
    goal.done = checkbox.checked;
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
    renderGoals();
  });

  const input = document.createElement("input");
  input.className = "task-text-input";
  input.type = "text";
  input.value = goal.text;
  input.setAttribute("aria-label", "Edit dated goal");
  input.addEventListener("change", () => {
    const nextText = input.value.trim();
    if (!nextText) {
      goalMatch.section.goals = goalMatch.section.goals.filter((itemGoal) => itemGoal.id !== goal.id);
    } else {
      goal.text = nextText;
    }
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
    renderGoals();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });

  const source = document.createElement("span");
  source.className = "goal-source-label";
  source.textContent = "Goal";

  task.append(checkbox, input, source);
  return task;
}

function deleteCalendarTask(dateKey, noteId) {
  const notes = state.data.calendarNotes[dateKey] || [];
  state.data.calendarNotes[dateKey] = notes.filter((note) => note.id !== noteId);
  if (!state.data.calendarNotes[dateKey].length) {
    delete state.data.calendarNotes[dateKey];
  }
  saveData();
  renderCalendar();
  renderSelectedDateNotes();
}

function updateCalendarTaskText(dateKey, noteId, text) {
  const note = (state.data.calendarNotes[dateKey] || []).find((item) => item.id === noteId);
  if (!note) return;
  const nextText = text.trim();
  if (!nextText) {
    deleteCalendarTask(dateKey, noteId);
    return;
  }
  note.text = nextText;
  saveData();
  renderCalendar();
  if (dateKey === state.selectedDate) {
    renderSelectedDateNotes();
  }
}

function makeTaskRow(note, dateKey, variant) {
  const task = document.createElement("div");
  task.className = variant === "calendar" ? "note-pill calendar-task" : "mini-item calendar-task";
  task.classList.toggle("is-done", Boolean(note.done));
  task.addEventListener("click", (event) => event.stopPropagation());

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(note.done);
  checkbox.setAttribute("aria-label", "Mark calendar task complete");
  checkbox.addEventListener("change", () => {
    note.done = checkbox.checked;
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
  });

  const input = document.createElement("input");
  input.className = "task-text-input";
  input.type = "text";
  input.value = note.text;
  input.setAttribute("aria-label", "Edit task");
  input.addEventListener("change", () => {
    updateCalendarTaskText(dateKey, note.id, input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.addEventListener("click", () => {
    deleteCalendarTask(dateKey, note.id);
  });

  task.append(checkbox, input, deleteButton);
  return task;
}

function renderSelectedDateNotes() {
  els.selectedDateInput.value = state.selectedDate;
  renderEmojiPalette();
  els.selectedDateNotes.innerHTML = "";
  const notes = state.data.calendarNotes[state.selectedDate] || [];

  notes.forEach((note) => {
    els.selectedDateNotes.append(makeTaskRow(note, state.selectedDate, "selected"));
  });
  getGoalsForDate(state.selectedDate).forEach((goalMatch) => {
    els.selectedDateNotes.append(makeCalendarGoalTask(goalMatch, "selected"));
  });
}

function renderJournalLabelOptions(selectedLabel = els.journalLabel.value) {
  const labels = state.data.journalLabels;
  els.journalLabel.innerHTML = "";
  els.journalFilterLabel.innerHTML = "";

  els.journalLabel.append(makeOption("", "Choose label"));
  els.journalFilterLabel.append(makeOption("", "All labels"));

  labels.forEach((label) => {
    els.journalLabel.append(makeOption(label, label));
    els.journalFilterLabel.append(makeOption(label, label));
  });

  els.journalLabel.value = labels.includes(selectedLabel) ? selectedLabel : "";
  els.journalFilterLabel.value = labels.includes(state.journalFilters.label) ? state.journalFilters.label : "";
}

function makeOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function resetJournalForm() {
  state.editingJournalId = null;
  els.journalCity.value = "";
  els.journalDate.value = toDateKey(new Date());
  els.journalTime.value = new Date().toTimeString().slice(0, 5);
  els.journalLabel.value = "";
  els.journalText.value = "";
  els.journalSubmitButton.textContent = "Save entry";
  els.cancelJournalEditButton.hidden = true;
}

function startJournalEdit(entry) {
  state.editingJournalId = entry.id;
  els.journalCity.value = entry.city || "";
  els.journalDate.value = entry.date || toDateKey(new Date());
  els.journalTime.value = entry.time || new Date().toTimeString().slice(0, 5);
  els.journalLabel.value = getEntryLabel(entry);
  els.journalText.value = entry.text || "";
  els.journalSubmitButton.textContent = "Update entry";
  els.cancelJournalEditButton.hidden = false;
  window.scrollTo({ top: els.journalForm.offsetTop - 24, behavior: "smooth" });
}

function deleteJournalEntry(entryId) {
  state.data.journalEntries = state.data.journalEntries.filter((item) => item.id !== entryId);
  if (state.editingJournalId === entryId) {
    resetJournalForm();
  }
  saveData();
  renderJournal();
}

function filteredJournalEntries() {
  return state.data.journalEntries.filter((entry) => {
    const dateMatches = !state.journalFilters.date || entry.date === state.journalFilters.date;
    const entryDate = entry.date ? parseDateKey(entry.date) : null;
    const monthMatches =
      !state.journalFilters.month || (entryDate && String(entryDate.getMonth() + 1) === state.journalFilters.month);
    const yearMatches = !state.journalFilters.year || (entryDate && String(entryDate.getFullYear()) === state.journalFilters.year);
    const labelMatches = !state.journalFilters.label || getEntryLabel(entry) === state.journalFilters.label;
    return dateMatches && monthMatches && yearMatches && labelMatches;
  });
}

function renderGoals() {
  els.goalSections.innerHTML = "";
  const sections = getGoalSections();

  if (!sections.length) {
    els.goalSections.append(emptyState("Add a section."));
    return;
  }

  sections.forEach((section) => {
    const fragment = els.goalSectionTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".goal-section");
    const titleInput = fragment.querySelector(".section-title-input");
    const deleteSectionButton = fragment.querySelector("[data-action='delete-section']");
    const goalForm = fragment.querySelector(".goal-form");
    const goalInput = goalForm.querySelector("input");
    const goalList = fragment.querySelector(".goal-list");

    card.dataset.sectionId = section.id;
    card.draggable = true;
    titleInput.value = section.title;
    card.addEventListener("dragstart", (event) => {
      if (event.target.closest("input, button, select, textarea")) {
        event.preventDefault();
        return;
      }

      state.draggingGoalSectionId = section.id;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", section.id);
    });
    card.addEventListener("dragend", () => {
      state.draggingGoalSectionId = null;
      card.classList.remove("is-dragging");
      els.goalSections.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    });
    card.addEventListener("dragover", (event) => {
      if (!state.draggingGoalSectionId || state.draggingGoalSectionId === section.id) return;
      event.preventDefault();
      card.classList.add("is-drop-target");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("is-drop-target");
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("is-drop-target");
      moveGoalSection(event.dataTransfer.getData("text/plain") || state.draggingGoalSectionId, section.id);
    });

    titleInput.addEventListener("change", () => {
      section.title = titleInput.value.trim() || "Untitled";
      saveData();
    });

    deleteSectionButton.addEventListener("click", () => {
      state.data.goalSections = sections.filter((item) => item.id !== section.id);
      saveData();
      renderGoals();
    });

    goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = goalInput.value.trim();
      if (!text) return;
      section.goals.push({ id: makeId("goal"), text, done: false, dueDate: "" });
      goalInput.value = "";
      saveData();
      renderGoals();
      renderCalendar();
    });

    if (section.goals.length) {
      section.goals.forEach((goal) => goalList.append(renderGoalItem(section, goal)));
    }

    els.goalSections.append(card);
  });
}

function renderGoalItem(section, goal) {
  const item = document.createElement("li");
  item.className = "goal-item";
  item.classList.toggle("is-done", goal.done);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = goal.done;
  checkbox.setAttribute("aria-label", "Mark goal complete");
  checkbox.addEventListener("change", () => {
    goal.done = checkbox.checked;
    saveData();
    renderGoals();
    renderCalendar();
  });

  const text = document.createElement("input");
  text.className = "goal-text-input";
  text.type = "text";
  text.value = goal.text;
  text.setAttribute("aria-label", "Edit goal");
  text.addEventListener("change", () => {
    const nextText = text.value.trim();
    if (!nextText) {
      section.goals = section.goals.filter((itemGoal) => itemGoal.id !== goal.id);
    } else {
      goal.text = nextText;
    }
    saveData();
    renderGoals();
    renderCalendar();
  });
  text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      text.blur();
    }
  });

  const menu = document.createElement("details");
  menu.className = "entry-menu goal-item-menu";

  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", "Goal options");
  summary.textContent = "...";

  const menuItems = document.createElement("div");
  menuItems.className = "entry-menu-items goal-menu-items";

  const dateInput = document.createElement("input");
  dateInput.className = "goal-date-input";
  dateInput.type = "date";
  dateInput.value = goal.dueDate || "";
  dateInput.setAttribute("aria-label", "Goal calendar date");
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    goal.dueDate = dateInput.value;
    setCalendarDate(goal.dueDate);
    menu.open = false;
    saveData();
    renderGoals();
    renderCalendar();
    renderSelectedDateNotes();
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.className = "danger-text";
  deleteButton.addEventListener("click", () => {
    section.goals = section.goals.filter((itemGoal) => itemGoal.id !== goal.id);
    menu.open = false;
    saveData();
    renderGoals();
    renderCalendar();
    renderSelectedDateNotes();
  });

  menuItems.append(dateInput, deleteButton);
  menu.append(summary, menuItems);

  const dateBadge = document.createElement("span");
  dateBadge.className = "goal-date-badge";
  dateBadge.textContent = goal.dueDate || "";
  dateBadge.hidden = !goal.dueDate;
  dateBadge.title = "Double-click to remove date";
  dateBadge.addEventListener("dblclick", () => {
    goal.dueDate = "";
    saveData();
    renderGoals();
    renderCalendar();
    renderSelectedDateNotes();
  });

  const textWrap = document.createElement("div");
  textWrap.className = "goal-text-wrap";
  textWrap.append(text, dateBadge);

  item.append(checkbox, textWrap, menu);
  return item;
}

function renderJournal() {
  els.journalLog.innerHTML = "";
  renderJournalLabelOptions();
  els.journalFilterDate.value = state.journalFilters.date;
  els.journalFilterMonth.value = state.journalFilters.month;
  els.journalFilterYear.value = state.journalFilters.year;
  const entries = filteredJournalEntries();

  if (!state.data.journalEntries.length) {
    els.journalLog.append(emptyState("No saved entries yet."));
    return;
  }

  if (!entries.length) {
    els.journalLog.append(emptyState("No entries match this filter."));
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "journal-entry";

    const head = document.createElement("div");
    head.className = "journal-entry-head";

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const location = entry.city || "No city";
    const date = entry.date || "No date";
    const time = entry.time || "No time";
    meta.textContent = `${location} / ${date} / ${time}`;

    const menu = document.createElement("details");
    menu.className = "entry-menu";

    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", "Entry options");
    summary.textContent = "...";

    const menuItems = document.createElement("div");
    menuItems.className = "entry-menu-items";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      menu.open = false;
      startJournalEdit(entry);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "danger-text";
    deleteButton.addEventListener("click", () => {
      menu.open = false;
      deleteJournalEntry(entry.id);
    });

    menuItems.append(editButton, deleteButton);
    menu.append(summary, menuItems);
    head.append(meta, menu);

    const text = document.createElement("p");
    text.textContent = entry.text;

    const label = getEntryLabel(entry);
    if (label) {
      const labels = document.createElement("div");
      labels.className = "entry-tags";
      const tagPill = document.createElement("span");
      tagPill.textContent = label;
      labels.append(tagPill);
      article.append(head, labels, text);
    } else {
      article.append(head, text);
    }

    els.journalLog.append(article);
  });
}

function emptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

init();
