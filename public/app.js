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
  journalFilters: { date: "", label: "" },
  data: loadData(),
};

const els = {
  monthSelect: document.querySelector("#monthSelect"),
  yearInput: document.querySelector("#yearInput"),
  weekdayRow: document.querySelector("#weekdayRow"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDateInput: document.querySelector("#selectedDateInput"),
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
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
  journalFilterLabel: document.querySelector("#journalFilterLabel"),
  resetJournalFiltersButton: document.querySelector("#resetJournalFiltersButton"),
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return {
        calendarNotes: saved.calendarNotes || {},
        dayEmojis: saved.dayEmojis || {},
        goalSections: saved.goalSections || {},
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
    goalSections: {},
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

function monthKey() {
  return `${state.year}-${String(state.month + 1).padStart(2, "0")}`;
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
    renderAll();
  });

  els.selectedDateInput.addEventListener("change", () => {
    if (!els.selectedDateInput.value) return;
    const nextDate = parseDateKey(els.selectedDateInput.value);
    state.selectedDate = els.selectedDateInput.value;
    state.month = nextDate.getMonth();
    state.year = nextDate.getFullYear();
    els.monthSelect.value = state.month;
    els.yearInput.value = state.year;
    renderAll();
  });

  els.yearInput.addEventListener("change", () => {
    const nextYear = Number(els.yearInput.value);
    state.year = Number.isFinite(nextYear) ? nextYear : new Date().getFullYear();
    els.yearInput.value = state.year;
    selectFirstVisibleDate();
    renderAll();
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
    renderAll();
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

  els.journalFilterLabel.addEventListener("change", () => {
    state.journalFilters.label = els.journalFilterLabel.value;
    renderJournal();
  });

  els.resetJournalFiltersButton.addEventListener("click", () => {
    state.journalFilters = { date: "", label: "" };
    els.journalFilterDate.value = "";
    els.journalFilterLabel.value = "";
    renderJournal();
  });

}

function selectFirstVisibleDate() {
  state.selectedDate = `${state.year}-${String(state.month + 1).padStart(2, "0")}-01`;
}

function ensureStarterSections() {
  const key = monthKey();
  if (state.data.goalSections[key]?.length) return;

  state.data.goalSections[key] = [
    { id: makeId("section"), title: "Priorities", goals: [] },
    { id: makeId("section"), title: "Optional goals", goals: [] },
    { id: makeId("section"), title: "Personal", goals: [] },
  ];
  saveData();
}

function getMonthSections() {
  const key = monthKey();
  if (!state.data.goalSections[key]) {
    state.data.goalSections[key] = [];
  }
  return state.data.goalSections[key];
}

function addGoalSection(title) {
  getMonthSections().push({ id: makeId("section"), title, goals: [] });
  saveData();
  renderGoals();
}

function renderAll() {
  ensureStarterSections();
  renderCalendar();
  renderGoals();
  renderJournal();
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
  els.selectedDateLabel.textContent = readableDate(state.selectedDate);
  renderEmojiPalette();
  els.selectedDateNotes.innerHTML = "";
  const notes = state.data.calendarNotes[state.selectedDate] || [];

  if (!notes.length) {
    return;
  }

  notes.forEach((note) => {
    els.selectedDateNotes.append(makeTaskRow(note, state.selectedDate, "selected"));
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
    const labelMatches = !state.journalFilters.label || getEntryLabel(entry) === state.journalFilters.label;
    return dateMatches && labelMatches;
  });
}

function renderGoals() {
  els.goalSections.innerHTML = "";
  const sections = getMonthSections();

  if (!sections.length) {
    els.goalSections.append(emptyState("Add a section for this month."));
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

    titleInput.value = section.title;
    titleInput.addEventListener("change", () => {
      section.title = titleInput.value.trim() || "Untitled";
      saveData();
      renderCalendar();
    });

    deleteSectionButton.addEventListener("click", () => {
      const key = monthKey();
      state.data.goalSections[key] = sections.filter((item) => item.id !== section.id);
      saveData();
      renderGoals();
      renderCalendar();
    });

    goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = goalInput.value.trim();
      if (!text) return;
      section.goals.push({ id: makeId("goal"), text, done: false });
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

  const deleteButton = document.createElement("button");
  deleteButton.className = "quiet-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.setAttribute("aria-label", "Delete goal");
  deleteButton.addEventListener("click", () => {
    section.goals = section.goals.filter((itemGoal) => itemGoal.id !== goal.id);
    saveData();
    renderGoals();
    renderCalendar();
  });

  item.append(checkbox, text, deleteButton);
  return item;
}

function renderJournal() {
  els.journalLog.innerHTML = "";
  renderJournalLabelOptions();
  els.journalFilterDate.value = state.journalFilters.date;
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
