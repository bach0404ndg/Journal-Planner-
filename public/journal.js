const STORAGE_KEY = "monthly-planner-journal-v1";
const defaultJournalLabels = ["Grateful", "Idea", "Memory", "Reflection"];
const defaultJournalLogWidth = 58;
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
const paletteOptions = [
  { id: "green", name: "Green", color: "#08742b", tint: "#dcefd7" },
  { id: "yellow", name: "Yellow", color: "#d99a14", tint: "#fff0b8" },
  { id: "coral", name: "Coral", color: "#d45b4c", tint: "#f8d8d3" },
  { id: "olive", name: "Olive", color: "#6f7d35", tint: "#e5ebc7" },
  { id: "rose", name: "Rose", color: "#be3a5b", tint: "#f8dce4" },
  { id: "brick", name: "Brick", color: "#9f4f37", tint: "#efd8cf" },
  { id: "mint", name: "Mint", color: "#1fa66a", tint: "#c8f0dd" },
  { id: "tangerine", name: "Tangerine", color: "#f07822", tint: "#ffd9b8" },
  { id: "berry", name: "Berry", color: "#e23d70", tint: "#f8c9d9" },
  { id: "lemon", name: "Lemon", color: "#f3c63a", tint: "#fff1a8" },
  { id: "peach", name: "Peach", color: "#f5a36c", tint: "#ffe0cf" },
];

const els = {
  undoButton: document.querySelector("#undoButton"),
  paletteMenu: document.querySelector("#paletteMenu"),
  paletteOptions: document.querySelector("#paletteOptions"),
  journalForm: document.querySelector("#journalForm"),
  journalCity: document.querySelector("#journalCity"),
  journalDate: document.querySelector("#journalDate"),
  journalDatePicker: document.querySelector("#journalDatePicker"),
  journalDatePickerButton: document.querySelector("#journalDatePickerButton"),
  journalTime: document.querySelector("#journalTime"),
  journalLabel: document.querySelector("#journalLabel"),
  addJournalLabelButton: document.querySelector("#addJournalLabelButton"),
  removeJournalLabelButton: document.querySelector("#removeJournalLabelButton"),
  journalText: document.querySelector("#journalText"),
  journalSubmitButton: document.querySelector("#journalSubmitButton"),
  cancelJournalEditButton: document.querySelector("#cancelJournalEditButton"),
  journalEntryToggle: document.querySelector("#journalEntryToggle"),
  journalLayout: document.querySelector("#journalLayout"),
  journalResizeHandle: document.querySelector("#journalResizeHandle"),
  journalLog: document.querySelector("#journalLog"),
  journalFilterDate: document.querySelector("#journalFilterDate"),
  journalFilterDatePicker: document.querySelector("#journalFilterDatePicker"),
  journalFilterDatePickerButton: document.querySelector("#journalFilterDatePickerButton"),
  journalFilterMonth: document.querySelector("#journalFilterMonth"),
  journalFilterYear: document.querySelector("#journalFilterYear"),
  journalFilterLabel: document.querySelector("#journalFilterLabel"),
  resetJournalFiltersButton: document.querySelector("#resetJournalFiltersButton"),
  exportJournalBackupButton: document.querySelector("#exportJournalBackupButton"),
  importJournalBackupButton: document.querySelector("#importJournalBackupButton"),
  removeOldJournalDataButton: document.querySelector("#removeOldJournalDataButton"),
};

const state = {
  plannerData: loadPlannerData(),
  editingJournalId: null,
  journalFilters: { date: "", month: "", year: "", label: "" },
  undoStack: [],
};

function loadPlannerData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...saved,
      palette: normalizePalette(saved.palette),
      journalLabels: normalizeJournalLabels(saved.journalLabels, saved.journalEntries),
      journalEntries: normalizeJournalEntries(saved.journalEntries),
      journalEntryCollapsed: Boolean(saved.journalEntryCollapsed),
      journalLogWidth: normalizeJournalLogWidth(saved.journalLogWidth),
    };
  } catch (error) {
    return getDefaultPlannerData();
  }
}

function getDefaultPlannerData() {
  return {
    palette: "green",
    journalLabels: [...defaultJournalLabels],
    journalEntries: [],
    journalEntryCollapsed: false,
    journalLogWidth: defaultJournalLogWidth,
  };
}

function savePlannerData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.plannerData));
}

function queueUndo(label) {
  state.undoStack.push({
    label,
    data: structuredClone({
      palette: state.plannerData.palette,
      journalLabels: state.plannerData.journalLabels,
      journalEntries: state.plannerData.journalEntries,
      journalEntryCollapsed: state.plannerData.journalEntryCollapsed,
      journalLogWidth: state.plannerData.journalLogWidth,
    }),
  });
  if (state.undoStack.length > 20) state.undoStack.shift();
  renderUndo();
}

function restoreUndo() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  Object.assign(state.plannerData, previous.data);
  savePlannerData();
  state.editingJournalId = null;
  renderAll();
}

function renderUndo() {
  const last = state.undoStack.at(-1);
  els.undoButton.disabled = !last;
  els.undoButton.textContent = last ? `Undo ${last.label}` : "Undo";
}

function normalizeJournalEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      id: entry.id || makeId("journal"),
      city: typeof entry.city === "string" ? entry.city : "",
      date: normalizeDateInput(entry.date) || "",
      time: normalizeTimeValue(entry.time) || "",
      label: typeof entry.label === "string" ? entry.label : typeof entry.tag === "string" ? entry.tag : "",
      text: typeof entry.text === "string" ? entry.text : "",
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || "",
    }))
    .filter((entry) => entry.text.trim());
}

function normalizeJournalLabels(savedLabels, entries = []) {
  const labels = Array.isArray(savedLabels) ? savedLabels : defaultJournalLabels;
  const entryLabels = Array.isArray(entries)
    ? entries.map((entry) => getEntryLabel(entry)).filter(Boolean)
    : [];
  return [...new Set([...defaultJournalLabels, ...labels, ...entryLabels].map(cleanLabel).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function normalizeJournalLogWidth(savedWidth) {
  const width = Number(savedWidth);
  if (!Number.isFinite(width)) return defaultJournalLogWidth;
  return Math.min(Math.max(width, 46), 72);
}

function snapJournalLogWidth(width) {
  return Math.abs(width - defaultJournalLogWidth) <= 1.6 ? defaultJournalLogWidth : width;
}

function normalizePalette(paletteId) {
  return paletteOptions.some((palette) => palette.id === paletteId) ? paletteId : "green";
}

function cleanLabel(label) {
  return String(label || "").replace(/\s+/g, " ").trim();
}

function getEntryLabel(entry) {
  return cleanLabel(entry?.label || entry?.tag || "");
}

function journalEntrySignature(entry) {
  return [entry.city || "", entry.date || "", entry.time || "", getEntryLabel(entry), entry.text || ""].join("\u0000");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentDateKey() {
  return toDateKey(new Date());
}

function currentTimeValue() {
  return normalizeTimeValue(new Date().toTimeString().slice(0, 5));
}

function dateKeyFromParts(year, month, day) {
  const safeYear = Math.min(Math.max(Number(year) || new Date().getFullYear(), 1970), 2099);
  const safeMonth = Math.min(Math.max(Number(month) || 1, 1), 12);
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const safeDay = Math.min(Math.max(Number(day) || 1, 1), daysInMonth);
  return `${safeYear}-${String(safeMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function normalizeDateInput(dateValue) {
  if (typeof dateValue !== "string") return "";
  const trimmed = dateValue.trim();
  const match = trimmed.match(/^(\d{4})[-/.]?(\d{1,2})[-/.]?(\d{1,2})$/);
  if (!match) return "";
  return dateKeyFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

function sanitizeDateDraft(dateValue) {
  return String(dateValue || "")
    .replace(/[^\d\-/.]/g, "")
    .slice(0, 10);
}

function normalizeTimeValue(timeValue) {
  if (typeof timeValue !== "string") return "";
  const trimmed = timeValue.trim();
  const match = trimmed.match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function sanitizeTimeDraft(timeValue) {
  const clean = String(timeValue || "").replace(/[^\d:]/g, "");
  if (clean.includes(":")) {
    const [hour = "", minute = ""] = clean.split(":");
    return `${hour.replace(/\D/g, "").slice(0, 2)}:${minute.replace(/\D/g, "").slice(0, 2)}`.slice(0, 5);
  }
  const digits = clean.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return digits;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function ordinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  const lastDigit = day % 10;
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
}

function journalDateTitle(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return "Undated";
  return `${monthNames[date.getMonth()]} ${date.getDate()}${ordinalSuffix(date.getDate())}, ${date.getFullYear()}`;
}

function journalGroupTitle(group) {
  const dateTitle = journalDateTitle(group.date);
  return group.location ? `${group.location}, ${dateTitle}` : dateTitle;
}

function journalTimeLabel(timeValue) {
  const normalized = normalizeTimeValue(timeValue);
  if (!normalized) return "No time";
  const [hourValue, minuteValue] = normalized.split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

function compareTimeValuesDesc(a = "", b = "") {
  const left = normalizeTimeValue(a);
  const right = normalizeTimeValue(b);
  if (left && right) return right.localeCompare(left);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function compareEntryDateTime(a, b) {
  const dateCompare = (b.date || "").localeCompare(a.date || "");
  if (dateCompare) return dateCompare;
  const timeCompare = compareTimeValuesDesc(a.time, b.time);
  if (timeCompare) return timeCompare;
  return (b.createdAt || "").localeCompare(a.createdAt || "");
}

function sortedJournalEntries(entries) {
  return [...entries].sort(compareEntryDateTime);
}

function openNativePicker(input) {
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.click();
}

function makeOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function emptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function renderPalette() {
  document.documentElement.dataset.palette = state.plannerData.palette === "green" ? "" : state.plannerData.palette;
  els.paletteOptions.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "color-menu-grid";

  paletteOptions.forEach((palette) => {
    const button = document.createElement("button");
    button.className = "color-option";
    button.type = "button";
    button.title = palette.name;
    button.setAttribute("aria-label", `Use ${palette.name}`);
    button.style.setProperty("--option-color", palette.color);
    button.style.setProperty("--option-tint", palette.tint);
    button.classList.toggle("is-active", palette.id === state.plannerData.palette);
    button.addEventListener("click", () => {
      els.paletteMenu.open = false;
      if (palette.id === state.plannerData.palette) return;
      queueUndo("color");
      state.plannerData.palette = palette.id;
      savePlannerData();
      renderPalette();
    });
    grid.append(button);
  });

  els.paletteOptions.append(makeColorMenuLabel(), grid);
}

function makeColorMenuLabel() {
  const label = document.createElement("span");
  label.className = "color-menu-label";
  label.textContent = "Color";
  return label;
}

function renderJournalLabelOptions(selectedLabel = els.journalLabel.value) {
  const labels = state.plannerData.journalLabels;
  els.journalLabel.innerHTML = "";
  els.journalFilterLabel.innerHTML = "";
  els.journalLabel.append(makeOption("", ""));
  els.journalFilterLabel.append(makeOption("", ""));

  labels.forEach((label) => {
    els.journalLabel.append(makeOption(label, label));
    els.journalFilterLabel.append(makeOption(label, label));
  });

  els.journalLabel.value = labels.includes(selectedLabel) ? selectedLabel : "";
  els.journalFilterLabel.value = labels.includes(state.journalFilters.label) ? state.journalFilters.label : "";
}

function renderMonthOptions() {
  els.journalFilterMonth.innerHTML = "";
  els.journalFilterMonth.append(makeOption("", ""));
  monthNames.forEach((name, index) => {
    els.journalFilterMonth.append(makeOption(String(index + 1), name));
  });
}

function ensureJournalLabel(label) {
  const clean = cleanLabel(label);
  if (!clean || state.plannerData.journalLabels.includes(clean)) return clean;
  state.plannerData.journalLabels.push(clean);
  state.plannerData.journalLabels.sort((a, b) => a.localeCompare(b));
  return clean;
}

function resetJournalForm() {
  state.editingJournalId = null;
  els.journalCity.value = "";
  els.journalDate.value = currentDateKey();
  els.journalTime.value = currentTimeValue();
  els.journalDatePicker.value = els.journalDate.value;
  els.journalLabel.value = "";
  els.journalText.value = "";
  els.journalSubmitButton.textContent = "Save entry";
  els.cancelJournalEditButton.hidden = true;
  resizeJournalFormText();
}

function startJournalEdit(entry) {
  state.plannerData.journalEntryCollapsed = false;
  state.editingJournalId = entry.id;
  els.journalCity.value = entry.city || "";
  els.journalDate.value = entry.date || currentDateKey();
  els.journalTime.value = normalizeTimeValue(entry.time) || currentTimeValue();
  els.journalDatePicker.value = els.journalDate.value;
  els.journalLabel.value = getEntryLabel(entry);
  els.journalText.value = entry.text || "";
  els.journalSubmitButton.textContent = "Update entry";
  els.cancelJournalEditButton.hidden = false;
  savePlannerData();
  applyJournalLayout();
  resizeJournalFormText();
  window.scrollTo({ top: els.journalForm.offsetTop - 24, behavior: "smooth" });
}

function deleteJournalEntry(entryId) {
  if (!state.plannerData.journalEntries.some((item) => item.id === entryId)) return;
  queueUndo("journal entry deletion");
  state.plannerData.journalEntries = state.plannerData.journalEntries.filter((item) => item.id !== entryId);
  if (state.editingJournalId === entryId) resetJournalForm();
  savePlannerData();
  renderJournal();
}

function applyJournalLayout() {
  const logWidth = normalizeJournalLogWidth(state.plannerData.journalLogWidth);
  els.journalLayout.dataset.entryCollapsed = state.plannerData.journalEntryCollapsed ? "true" : "false";
  els.journalLayout.dataset.defaultSplit = logWidth === defaultJournalLogWidth ? "true" : "false";
  els.journalLayout.style.setProperty("--journal-log-width", `${logWidth}%`);
  els.journalLayout.style.setProperty("--journal-entry-width", `${100 - logWidth}%`);
  els.journalLayout.style.setProperty("--journal-reading-width", `${Math.round(640 + logWidth * 8)}px`);
  els.journalEntryToggle.textContent = state.plannerData.journalEntryCollapsed ? "›" : "‹";
  els.journalEntryToggle.setAttribute(
    "aria-label",
    state.plannerData.journalEntryCollapsed ? "Open entry box" : "Close entry box",
  );
  requestAnimationFrame(resizeAllJournalTexts);
}

function startJournalResize(event) {
  if (state.plannerData.journalEntryCollapsed) return;
  queueUndo("journal width change");
  els.journalResizeHandle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-journal");

  const updateWidth = (pointerEvent) => {
    const rect = els.journalLayout.getBoundingClientRect();
    const width = ((rect.right - pointerEvent.clientX) / rect.width) * 100;
    state.plannerData.journalLogWidth = snapJournalLogWidth(normalizeJournalLogWidth(width));
    applyJournalLayout();
  };

  const stopResize = (pointerEvent) => {
    document.body.classList.remove("is-resizing-journal");
    els.journalResizeHandle.releasePointerCapture(pointerEvent.pointerId);
    els.journalResizeHandle.removeEventListener("pointermove", updateWidth);
    els.journalResizeHandle.removeEventListener("pointerup", stopResize);
    els.journalResizeHandle.removeEventListener("pointercancel", stopResize);
    savePlannerData();
  };

  els.journalResizeHandle.addEventListener("pointermove", updateWidth);
  els.journalResizeHandle.addEventListener("pointerup", stopResize);
  els.journalResizeHandle.addEventListener("pointercancel", stopResize);
}

function applyJournalFilterDateInput() {
  const nextDateKey = normalizeDateInput(els.journalFilterDate.value);
  state.journalFilters.date = nextDateKey;
  els.journalFilterDate.value = nextDateKey;
  els.journalFilterDatePicker.value = nextDateKey;
  renderJournal();
}

function filteredJournalEntries() {
  return sortedJournalEntries(
    state.plannerData.journalEntries.filter((entry) => {
      const dateMatches = !state.journalFilters.date || entry.date === state.journalFilters.date;
      const entryDate = entry.date ? parseDateKey(entry.date) : null;
      const monthMatches =
        !state.journalFilters.month || (entryDate && String(entryDate.getMonth() + 1) === state.journalFilters.month);
      const yearMatches = !state.journalFilters.year || (entryDate && String(entryDate.getFullYear()) === state.journalFilters.year);
      const labelMatches = !state.journalFilters.label || getEntryLabel(entry) === state.journalFilters.label;
      return dateMatches && monthMatches && yearMatches && labelMatches;
    }),
  );
}

function groupJournalEntries(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const location = entry.city || "";
    const date = entry.date || "";
    const key = `${location}\u0000${date}`;
    if (!groups.has(key)) groups.set(key, { location, date, entries: [] });
    groups.get(key).entries.push(entry);
  });

  return [...groups.values()]
    .map((group) => ({ ...group, entries: sortedJournalEntries(group.entries) }))
    .sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare) return dateCompare;
      const entryCompare = compareEntryDateTime(a.entries[0] || {}, b.entries[0] || {});
      if (entryCompare) return entryCompare;
      return (a.location || "").localeCompare(b.location || "");
    });
}

function renderJournal() {
  els.journalLog.innerHTML = "";
  renderJournalLabelOptions();
  els.journalFilterDate.value = state.journalFilters.date;
  els.journalFilterDatePicker.value = state.journalFilters.date;
  els.journalFilterMonth.value = state.journalFilters.month;
  els.journalFilterYear.value = state.journalFilters.year;

  const entries = filteredJournalEntries();
  if (!state.plannerData.journalEntries.length) {
    els.journalLog.append(emptyState("No saved entries yet."));
    return;
  }
  if (!entries.length) {
    els.journalLog.append(emptyState("No entries match this filter."));
    return;
  }

  groupJournalEntries(entries).forEach((group) => {
    const article = document.createElement("article");
    article.className = "journal-entry";

    const head = document.createElement("div");
    head.className = "journal-entry-head";

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.textContent = journalGroupTitle(group);
    head.append(meta);
    article.append(head);

    group.entries.forEach((entry) => {
      const entryBlock = document.createElement("div");
      entryBlock.className = "journal-entry-item";

      const entryHead = document.createElement("div");
      entryHead.className = "journal-entry-item-head";

      const time = document.createElement("div");
      time.className = "entry-time";
      time.textContent = journalTimeLabel(entry.time);

      const timeLine = document.createElement("div");
      timeLine.className = "entry-time-line";
      timeLine.append(time);

      const label = getEntryLabel(entry);
      if (label) {
        const labels = document.createElement("div");
        labels.className = "entry-tags";
        const tagPill = document.createElement("span");
        tagPill.textContent = label;
        labels.append(tagPill);
        timeLine.append(labels);
      }

      entryHead.append(timeLine, makeJournalEntryMenu(entry));
      entryBlock.append(entryHead, makeEditableJournalText(entry));
      article.append(entryBlock);
    });

    els.journalLog.append(article);
  });
}

function makeEditableJournalText(entry) {
  const text = document.createElement("textarea");
  let editUndoQueued = false;
  let savedText = entry.text || "";
  text.className = "journal-entry-text";
  text.value = entry.text || "";
  text.rows = 1;
  text.setAttribute("aria-label", "Edit saved journal text");
  text.addEventListener("input", () => {
    if (!editUndoQueued && text.value !== savedText) {
      queueUndo("journal text edit");
      editUndoQueued = true;
    }
    entry.text = text.value;
    entry.updatedAt = new Date().toISOString();
    savePlannerData();
    resizeJournalText(text);
  });
  text.addEventListener("blur", () => {
    editUndoQueued = false;
    savedText = entry.text || "";
  });
  text.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") text.blur();
  });
  requestAnimationFrame(() => resizeJournalText(text));
  return text;
}

function makeJournalEntryMenu(entry) {
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
  return menu;
}

function resizeJournalText(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizeJournalFormText() {
  resizeJournalText(els.journalText);
}

function resizeAllJournalTexts() {
  resizeJournalFormText();
  els.journalLog.querySelectorAll(".journal-entry-text").forEach(resizeJournalText);
}

function removeOldJournalData() {
  const defaultCutoff = new Date();
  defaultCutoff.setFullYear(defaultCutoff.getFullYear() - 1);
  const entered = window.prompt("Remove journal entries before this date:", toDateKey(defaultCutoff));
  const cutoffDate = normalizeDateInput(entered || "");
  if (!cutoffDate) return;
  const confirmed = window.confirm(`Remove journal entries before ${cutoffDate}? You can undo this once.`);
  if (!confirmed) return;

  const beforeCount = state.plannerData.journalEntries.length;
  queueUndo("old journal data removal");
  state.plannerData.journalEntries = state.plannerData.journalEntries.filter(
    (entry) => !entry.date || entry.date >= cutoffDate,
  );
  savePlannerData();
  renderJournal();

  const removed = beforeCount - state.plannerData.journalEntries.length;
  if (removed > 0) window.alert(`Removed ${removed} journal ${removed === 1 ? "entry" : "entries"}.`);
}

function exportJournalBackup() {
  const backup = {
    type: "your-planner-journal-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    journalLabels: state.plannerData.journalLabels,
    journalEntries: state.plannerData.journalEntries,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `journal-backup-${currentDateKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importJournalBackup() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const result = mergeJournalBackup(String(reader.result || ""));
        window.alert(
          `Loaded ${result.addedEntries} ${result.addedEntries === 1 ? "entry" : "entries"} and ${result.addedLabels} ${result.addedLabels === 1 ? "label" : "labels"}.`,
        );
      } catch (error) {
        window.alert("That backup file could not be loaded.");
      }
    });
    reader.readAsText(file);
  });
  input.click();
}

function mergeJournalBackup(rawBackup) {
  const parsed = JSON.parse(rawBackup);
  const backupEntries = Array.isArray(parsed) ? parsed : parsed.journalEntries;
  const backupLabels = Array.isArray(parsed) ? [] : parsed.journalLabels;
  const entries = normalizeJournalEntries(backupEntries);
  if (!entries.length && !Array.isArray(backupLabels)) {
    throw new Error("Backup does not contain journal data.");
  }

  queueUndo("journal backup import");
  const existingIds = new Set(state.plannerData.journalEntries.map((entry) => entry.id));
  const existingSignatures = new Set(state.plannerData.journalEntries.map(journalEntrySignature));
  let addedEntries = 0;

  entries.forEach((entry) => {
    const signature = journalEntrySignature(entry);
    if (existingIds.has(entry.id) || existingSignatures.has(signature)) return;
    state.plannerData.journalEntries.push(entry);
    existingIds.add(entry.id);
    existingSignatures.add(signature);
    addedEntries += 1;
  });

  const previousLabelCount = state.plannerData.journalLabels.length;
  state.plannerData.journalLabels = normalizeJournalLabels(
    [...state.plannerData.journalLabels, ...(Array.isArray(backupLabels) ? backupLabels : [])],
    state.plannerData.journalEntries,
  );
  const addedLabels = state.plannerData.journalLabels.length - previousLabelCount;

  savePlannerData();
  renderJournalLabelOptions();
  renderJournal();
  return { addedEntries, addedLabels };
}

function bindDateTextInput(textInput, pickerInput, onCommit) {
  textInput.addEventListener("input", () => {
    textInput.value = sanitizeDateDraft(textInput.value);
  });
  textInput.addEventListener("focus", () => {
    if (!textInput.value) {
      textInput.value = currentDateKey();
      pickerInput.value = textInput.value;
    }
  });
  textInput.addEventListener("blur", onCommit);
  textInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
      textInput.blur();
    }
  });
}

function bindEvents() {
  els.undoButton.addEventListener("click", restoreUndo);
  els.journalEntryToggle.addEventListener("click", () => {
    queueUndo("journal layout change");
    state.plannerData.journalEntryCollapsed = !state.plannerData.journalEntryCollapsed;
    savePlannerData();
    applyJournalLayout();
  });
  els.journalResizeHandle.addEventListener("pointerdown", startJournalResize);

  bindDateTextInput(els.journalDate, els.journalDatePicker, () => {
    els.journalDate.value = normalizeDateInput(els.journalDate.value) || currentDateKey();
    els.journalDatePicker.value = els.journalDate.value;
  });
  els.journalDatePickerButton.addEventListener("click", () => {
    const nextDateKey = normalizeDateInput(els.journalDate.value) || currentDateKey();
    els.journalDate.value = nextDateKey;
    els.journalDatePicker.value = nextDateKey;
    openNativePicker(els.journalDatePicker);
  });
  els.journalDatePicker.addEventListener("change", () => {
    els.journalDate.value = normalizeDateInput(els.journalDatePicker.value) || els.journalDate.value;
  });

  els.journalTime.addEventListener("input", () => {
    els.journalTime.value = sanitizeTimeDraft(els.journalTime.value);
  });
  els.journalTime.addEventListener("focus", () => {
    if (!els.journalTime.value) els.journalTime.value = currentTimeValue();
  });
  els.journalTime.addEventListener("blur", () => {
    els.journalTime.value = normalizeTimeValue(els.journalTime.value) || currentTimeValue();
  });
  els.journalTime.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      els.journalTime.blur();
    }
  });

  els.journalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = els.journalText.value.trim();
    if (!text) return;
    const entryData = {
      city: els.journalCity.value.trim(),
      date: normalizeDateInput(els.journalDate.value) || currentDateKey(),
      time: normalizeTimeValue(els.journalTime.value) || currentTimeValue(),
      label: els.journalLabel.value,
      text,
      updatedAt: new Date().toISOString(),
    };

    queueUndo(state.editingJournalId ? "journal entry edit" : "journal entry");
    if (state.editingJournalId) {
      const entry = state.plannerData.journalEntries.find((item) => item.id === state.editingJournalId);
      if (entry) Object.assign(entry, entryData);
    } else {
      state.plannerData.journalEntries.push({
        id: makeId("journal"),
        ...entryData,
        createdAt: new Date().toISOString(),
      });
    }

    savePlannerData();
    resetJournalForm();
    renderJournal();
  });

  els.journalText.addEventListener("input", resizeJournalFormText);
  els.cancelJournalEditButton.addEventListener("click", resetJournalForm);

  els.addJournalLabelButton.addEventListener("click", () => {
    els.addJournalLabelButton.closest("details").open = false;
    const label = window.prompt("New journal label");
    const clean = cleanLabel(label);
    if (!clean) return;
    queueUndo("journal label");
    ensureJournalLabel(clean);
    savePlannerData();
    renderJournalLabelOptions(clean);
    renderJournal();
  });
  els.removeJournalLabelButton.addEventListener("click", () => {
    els.removeJournalLabelButton.closest("details").open = false;
    const label = els.journalLabel.value;
    if (!label) return;
    const confirmed = window.confirm(`Remove "${label}" from saved labels and journal entries?`);
    if (!confirmed) return;
    queueUndo("journal label removal");
    state.plannerData.journalLabels = state.plannerData.journalLabels.filter((item) => item !== label);
    state.plannerData.journalEntries.forEach((entry) => {
      if (getEntryLabel(entry) === label) entry.label = "";
    });
    if (state.journalFilters.label === label) state.journalFilters.label = "";
    savePlannerData();
    renderJournal();
  });

  bindDateTextInput(els.journalFilterDate, els.journalFilterDatePicker, applyJournalFilterDateInput);
  els.journalFilterDatePickerButton.addEventListener("click", () => {
    const nextDateKey = normalizeDateInput(els.journalFilterDate.value) || currentDateKey();
    els.journalFilterDate.value = nextDateKey;
    els.journalFilterDatePicker.value = nextDateKey;
    openNativePicker(els.journalFilterDatePicker);
  });
  els.journalFilterDatePicker.addEventListener("change", () => {
    state.journalFilters.date = normalizeDateInput(els.journalFilterDatePicker.value);
    els.journalFilterDate.value = state.journalFilters.date;
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
    els.journalFilterDatePicker.value = "";
    els.journalFilterMonth.value = "";
    els.journalFilterYear.value = "";
    els.journalFilterLabel.value = "";
    renderJournal();
  });
  els.exportJournalBackupButton.addEventListener("click", exportJournalBackup);
  els.importJournalBackupButton.addEventListener("click", importJournalBackup);
  els.removeOldJournalDataButton.addEventListener("click", removeOldJournalData);

  window.addEventListener("resize", resizeAllJournalTexts);
}

function renderAll() {
  renderPalette();
  renderMonthOptions();
  renderJournalLabelOptions();
  applyJournalLayout();
  resetJournalForm();
  renderJournal();
  renderUndo();
}

bindEvents();
renderAll();
