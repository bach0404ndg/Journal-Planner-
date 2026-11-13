const STORAGE_KEY = "monthly-planner-journal-v1";
const TIMER_STORAGE_KEY = "monthly-planner-journal-active-timer-v1";
const AI_TOKEN_KEY = "monthly-planner-ai-access-token-v1";
const AI_AUTO_SYNC_KEY = "monthly-planner-ai-auto-sync-v1";
const TIMER_MINUTES_KEY = "monthly-planner-timer-minutes-v1";
// Drags carry a private type instead of plain text, so dropping a task or tile
// onto a text box can never paste its internal id into the text.
const DRAG_DATA_TYPE = "application/x-planner-item";

let autoSyncEnabled = false;
let autoSyncVersion = null;
let lastSyncedSnapshot = null;
let autoSyncPushTimer = null;
let autoSyncPollTimer = null;
let autoSyncBusy = false;
let autoSyncListenersBound = false;

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
const defaultJournalLogWidth = 58;
const defaultGoalGroupName = "General";

const paletteOptions = [
  { id: "green", name: "Green", color: "#08742b", tint: "rgba(8, 116, 43, 0.1)" },
  { id: "yellow", name: "Yellow", color: "#d99a14", tint: "rgba(217, 154, 20, 0.14)" },
  { id: "coral", name: "Coral", color: "#d45b4c", tint: "rgba(212, 91, 76, 0.12)" },
  { id: "olive", name: "Olive", color: "#6f7d35", tint: "rgba(111, 125, 53, 0.12)" },
  { id: "rose", name: "Rose", color: "#be3a5b", tint: "rgba(190, 58, 91, 0.11)" },
  { id: "brick", name: "Brick", color: "#9f4f37", tint: "rgba(159, 79, 55, 0.11)" },
  { id: "mint", name: "Mint", color: "#1fa66a", tint: "rgba(31, 166, 106, 0.13)" },
  { id: "tangerine", name: "Tangerine", color: "#f07822", tint: "rgba(240, 120, 34, 0.14)" },
  { id: "berry", name: "Berry", color: "#e23d70", tint: "rgba(226, 61, 112, 0.12)" },
  { id: "lavender", name: "Lavender", color: "#7b61d1", tint: "rgba(123, 97, 209, 0.12)" },
  { id: "cocoa", name: "Cocoa", color: "#8a5a2b", tint: "rgba(138, 90, 43, 0.12)" },
  { id: "ocean", name: "Ocean", color: "#1688a8", tint: "rgba(22, 136, 168, 0.12)" },
  { id: "lemon", name: "Lemon", color: "#f3c63a", tint: "rgba(255, 241, 168, 0.44)" },
  { id: "peach", name: "Peach", color: "#f08a5d", tint: "rgba(255, 211, 188, 0.38)" },
  { id: "sky", name: "Sky", color: "#54a9e8", tint: "rgba(199, 230, 255, 0.4)" },
  { id: "lilac", name: "Lilac", color: "#a985e8", tint: "rgba(226, 211, 255, 0.4)" },
];

const calendarTaskColors = [
  { id: "", name: "", color: "rgba(22, 51, 33, 0.24)", tint: "rgba(255, 255, 255, 0.56)" },
  { id: "green", name: "Green", color: "#08742b", tint: "rgba(8, 116, 43, 0.1)" },
  { id: "yellow", name: "Yellow", color: "#d99a14", tint: "rgba(217, 154, 20, 0.14)" },
  { id: "coral", name: "Coral", color: "#d45b4c", tint: "rgba(212, 91, 76, 0.12)" },
  { id: "olive", name: "Olive", color: "#6f7d35", tint: "rgba(111, 125, 53, 0.12)" },
  { id: "rose", name: "Rose", color: "#be3a5b", tint: "rgba(190, 58, 91, 0.11)" },
  { id: "brick", name: "Brick", color: "#9f4f37", tint: "rgba(159, 79, 55, 0.11)" },
  { id: "mint", name: "Mint", color: "#1fa66a", tint: "rgba(31, 166, 106, 0.13)" },
  { id: "tangerine", name: "Tangerine", color: "#f07822", tint: "rgba(240, 120, 34, 0.14)" },
  { id: "berry", name: "Berry", color: "#e23d70", tint: "rgba(226, 61, 112, 0.12)" },
  { id: "lavender", name: "Lavender", color: "#7b61d1", tint: "rgba(123, 97, 209, 0.12)" },
  { id: "cocoa", name: "Cocoa", color: "#8a5a2b", tint: "rgba(138, 90, 43, 0.12)" },
  { id: "ocean", name: "Ocean", color: "#1688a8", tint: "rgba(22, 136, 168, 0.12)" },
  { id: "lemon", name: "Lemon", color: "#f3c63a", tint: "rgba(255, 241, 168, 0.44)" },
  { id: "peach", name: "Peach", color: "#f08a5d", tint: "rgba(255, 211, 188, 0.38)" },
  { id: "sky", name: "Sky", color: "#54a9e8", tint: "rgba(199, 230, 255, 0.4)" },
  { id: "lilac", name: "Lilac", color: "#a985e8", tint: "rgba(226, 211, 255, 0.4)" },
];

const timeBreakLabel = "No task";
const emptyTimerTaskLabel = "No special task on this day";
const breakTrackColor = { color: "rgba(22, 51, 33, 0.38)", tint: "rgba(22, 51, 33, 0.08)" };
const defaultTimerMinutes = 25;
const timerPresetMinutes = [15, 25, 45, 60];
const minTimerMinutes = 5;
const maxTimerMinutes = 180;
const baseDocumentTitle = document.title;

const goalPaperColors = [
  { id: "", name: "Paper", color: "rgba(22, 51, 33, 0.24)", tint: "rgba(255, 255, 255, 0.28)" },
  { id: "green", name: "Green", color: "#08742b", tint: "rgba(8, 116, 43, 0.16)" },
  { id: "yellow", name: "Yellow", color: "#d99a14", tint: "rgba(217, 154, 20, 0.2)" },
  { id: "coral", name: "Coral", color: "#d45b4c", tint: "rgba(212, 91, 76, 0.18)" },
  { id: "olive", name: "Olive", color: "#6f7d35", tint: "rgba(111, 125, 53, 0.18)" },
  { id: "rose", name: "Rose", color: "#be3a5b", tint: "rgba(190, 58, 91, 0.16)" },
  { id: "brick", name: "Brick", color: "#9f4f37", tint: "rgba(159, 79, 55, 0.16)" },
  { id: "mint", name: "Mint", color: "#1fa66a", tint: "rgba(31, 166, 106, 0.18)" },
  { id: "tangerine", name: "Tangerine", color: "#f07822", tint: "rgba(240, 120, 34, 0.2)" },
  { id: "berry", name: "Berry", color: "#e23d70", tint: "rgba(226, 61, 112, 0.17)" },
  { id: "lavender", name: "Lavender", color: "#7b61d1", tint: "rgba(123, 97, 209, 0.17)" },
  { id: "cocoa", name: "Cocoa", color: "#8a5a2b", tint: "rgba(138, 90, 43, 0.18)" },
  { id: "ocean", name: "Ocean", color: "#1688a8", tint: "rgba(22, 136, 168, 0.18)" },
  { id: "lemon", name: "Lemon", color: "#f3c63a", tint: "rgba(255, 241, 168, 0.48)" },
  { id: "peach", name: "Peach", color: "#f08a5d", tint: "rgba(255, 211, 188, 0.46)" },
  { id: "sky", name: "Sky", color: "#54a9e8", tint: "rgba(199, 230, 255, 0.44)" },
  { id: "lilac", name: "Lilac", color: "#a985e8", tint: "rgba(226, 211, 255, 0.44)" },
];

const emojiOptions = [
  { emoji: "⭐", label: "Star" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "❤️", label: "Health" },
  { emoji: "💪", label: "Workout" },
  { emoji: "💰", label: "Money" },
  { emoji: "📚", label: "Study" },
  { emoji: "✈️", label: "Travel" },
  { emoji: "🌱", label: "Growth" },
  { emoji: "🙂", label: "Happy" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "☹️", label: "Sad" },
];

const state = {
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  selectedDate: toDateKey(new Date()),
  range: "week",
  editingJournalId: null,
  draggingGoalSectionId: null,
  draggingGoalGroupId: null,
  draggingSpecialTaskId: null,
  draggingCalendarTask: null,
  undoSnapshot: null,
  journalFilters: { date: "", month: "", year: "", label: "" },
  timePanelView: "timer",
  timeChartMode: "merged",
  editingSequenceEntryId: null,
  historyAddOpen: false,
  timer: {
    status: "idle",
    dateKey: "",
    taskId: "",
    subtaskId: "",
    taskText: "",
    color: "",
    durationSeconds: 0,
    accumulatedSeconds: 0,
    sessionStartEpoch: null,
    sessionStartedAt: null,
    tickHandle: null,
    audioContext: null,
    lastDisplayedSecond: -1,
    confirmStop: false,
  },
  data: loadData(),
};

const els = {
  calendarLayout: document.querySelector("#calendarLayout"),
  calendarPanel: document.querySelector("#calendarPanel"),
  calendarTitleButton: document.querySelector("#calendarTitleButton"),
  calendarTitle: document.querySelector("#calendarTitle"),
  selectedDayEyebrow: document.querySelector("#selectedDayEyebrow"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  weekdayRow: document.querySelector("#weekdayRow"),
  calendarGrid: document.querySelector("#calendarGrid"),
  specialTaskTrackerArea: document.querySelector("#specialTaskTrackerArea"),
  specialTaskTrackerToggle: document.querySelector("#specialTaskTrackerToggle"),
  specialTaskTracker: document.querySelector("#specialTaskTracker"),
  selectedDatePicker: document.querySelector("#selectedDatePicker"),
  calendarRemoveOldDataButton: document.querySelector("#calendarRemoveOldDataButton"),
  calendarNoteForm: document.querySelector("#calendarNoteForm"),
  calendarNoteInput: document.querySelector("#calendarNoteInput"),
  infoDumpForm: document.querySelector("#infoDumpForm"),
  infoDumpInput: document.querySelector("#infoDumpInput"),
  infoDumpList: document.querySelector("#infoDumpList"),
  specialTaskShelf: document.querySelector("#specialTaskShelf"),
  specialTaskToggle: document.querySelector("#specialTaskToggle"),
  addSpecialTaskButton: document.querySelector("#addSpecialTaskButton"),
  specialTaskList: document.querySelector("#specialTaskList"),
  emojiSection: document.querySelector("#emojiSection"),
  emojiToggle: document.querySelector("#emojiToggle"),
  emojiPalette: document.querySelector("#emojiPalette"),
  paletteMenu: document.querySelector("#paletteMenu"),
  paletteOptions: document.querySelector("#paletteOptions"),
  selectedDateNotes: document.querySelector("#selectedDateNotes"),
  todayButton: document.querySelector("#todayButton"),
  calendarPrevButton: document.querySelector("#calendarPrevButton"),
  calendarNextButton: document.querySelector("#calendarNextButton"),
  rangeButtons: document.querySelectorAll("[data-range]"),
  undoButton: document.querySelector("#undoButton"),
  aiAccessToken: document.querySelector("#aiAccessToken"),
  aiAutoSync: document.querySelector("#aiAutoSync"),
  aiPushButton: document.querySelector("#aiPushButton"),
  aiPullButton: document.querySelector("#aiPullButton"),
  aiAccessStatus: document.querySelector("#aiAccessStatus"),
  aiMcpEndpoint: document.querySelector("#aiMcpEndpoint"),
  copyMuseConfigButton: document.querySelector("#copyMuseConfigButton"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  goalGroupTabs: document.querySelector("#goalGroupTabs"),
  goalSections: document.querySelector("#goalSections"),
  goalSectionTemplate: document.querySelector("#goalSectionTemplate"),
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
  removeOldDataButton: document.querySelector("#removeOldDataButton"),

  clearTimeEntriesButton: document.querySelector("#clearTimeEntriesButton"),
  timePanel: document.querySelector("#timePanel"),
  timePanelToggle: document.querySelector("#timePanelToggle"),
  timeBar: document.querySelector("#timeBar"),
  timeTodayLabel: document.querySelector("#timeTodayLabel"),
  timeChartTotal: document.querySelector("#timeChartTotal"),
  timeChartModeMergedButton: document.querySelector("#timeChartModeMergedButton"),
  timeChartModeSequenceButton: document.querySelector("#timeChartModeSequenceButton"),
  timeChartArea: document.querySelector("#timeChartArea"),
  timeSequenceList: document.querySelector("#timeSequenceList"),
  timeLegend: document.querySelector("#timeLegend"),
  timerSession: document.querySelector("#timerSession"),
  timerTaskSelect: document.querySelector("#timerTaskSelect"),
  timerSubtractButton: document.querySelector("#timerSubtractButton"),
  timerAddButton: document.querySelector("#timerAddButton"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerTimeText: document.querySelector("#timerTimeText"),
  timerStatusText: document.querySelector("#timerStatusText"),
  timerStartButton: document.querySelector("#timerStartButton"),
  timerPauseButton: document.querySelector("#timerPauseButton"),
  timerStopButton: document.querySelector("#timerStopButton"),
  timerRingProgress: document.querySelector("#timerRingProgress"),
  timerRingTask: document.querySelector("#timerRingTask"),
  timerRingSub: document.querySelector("#timerRingSub"),
  timerTaskChips: document.querySelector("#timerTaskChips"),
  timerPresets: document.querySelector("#timerPresets"),
  timerContinueButton: document.querySelector("#timerContinueButton"),
  timerEndButton: document.querySelector("#timerEndButton"),
  timerFinishedControls: document.querySelector("#timerFinishedControls"),
  timerStopConfirm: document.querySelector("#timerStopConfirm"),
  timerStopResumeButton: document.querySelector("#timerStopResumeButton"),
  timerStopSaveButton: document.querySelector("#timerStopSaveButton"),
  timerStopDiscardButton: document.querySelector("#timerStopDiscardButton"),
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      const goalSections = normalizeGoalSections(saved.goalSections);
      const goalGroups = normalizeGoalGroups(saved.goalGroups, goalSections);
      const savedCalendarTasks = normalizeSavedCalendarTasks(saved.savedCalendarTasks);
      const calendarNotes = normalizeCalendarNotes(saved.calendarNotes);
      const specialTaskCatalog = buildSpecialTaskCatalog(savedCalendarTasks, calendarNotes);
      return {
        calendarNotes,
        savedCalendarTasks,
        trackedSpecialTaskIds: normalizeTrackedSpecialTaskIds(saved.trackedSpecialTaskIds, specialTaskCatalog),
        hiddenAllSpecialTaskCounterIds: normalizeTrackedSpecialTaskIds(saved.hiddenAllSpecialTaskCounterIds, specialTaskCatalog),
        showAllSpecialTaskCounters: Boolean(saved.showAllSpecialTaskCounters),
        infoDumpTasks: normalizeInfoDumpTasks(saved.infoDumpTasks),
        dayEmojis: saved.dayEmojis || {},
        goalSections,
        goalGroups,
        activeGoalGroupId: normalizeActiveGoalGroupId(saved.activeGoalGroupId, goalGroups),
        journalLabels: normalizeJournalLabels(saved.journalLabels, saved.journalEntries),
        journalEntries: normalizeJournalEntryList(saved.journalEntries),
        palette: normalizePalette(saved.palette),
        journalEntryCollapsed: Boolean(saved.journalEntryCollapsed),
        emojiCollapsed: Boolean(saved.emojiCollapsed),
        specialTasksCollapsed: Boolean(saved.specialTasksCollapsed),
        specialTaskTrackerCollapsed: Boolean(saved.specialTaskTrackerCollapsed),
        calendarPanelCollapsed: Boolean(saved.calendarPanelCollapsed),
        timePanelCollapsed: Boolean(saved.timePanelCollapsed),
        journalLogWidth: normalizeJournalLogWidth(saved.journalLogWidth),
        timeEntries: normalizeTimeEntries(saved.timeEntries),
      };
    }
  } catch (error) {
    console.warn("Planner data could not be loaded.", error);
  }

  return {
    calendarNotes: {},
    savedCalendarTasks: [],
    trackedSpecialTaskIds: [],
    hiddenAllSpecialTaskCounterIds: [],
    showAllSpecialTaskCounters: false,
    infoDumpTasks: [],
    dayEmojis: {},
    goalSections: [],
    goalGroups: [{ id: makeId("goal-group"), title: defaultGoalGroupName, sections: [] }],
    activeGoalGroupId: "",
    journalLabels: [...defaultJournalLabels],
    journalEntries: [],
    palette: "green",
    journalEntryCollapsed: false,
    emojiCollapsed: false,
    specialTasksCollapsed: false,
    specialTaskTrackerCollapsed: false,
    calendarPanelCollapsed: false,
    timePanelCollapsed: false,
    journalLogWidth: 58,
    timeEntries: {},
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  updateUndoButton();
  scheduleAutomaticPush();
}

function serializableTimerState() {
  return {
    status: state.timer.status,
    dateKey: state.timer.dateKey,
    taskId: state.timer.taskId,
    subtaskId: state.timer.subtaskId,
    taskText: state.timer.taskText,
    color: state.timer.color,
    subtaskText: state.timer.subtaskText,
    durationSeconds: state.timer.durationSeconds,
    accumulatedSeconds: state.timer.accumulatedSeconds,
    sessionStartEpoch: state.timer.sessionStartEpoch,
    sessionStartedAt: state.timer.sessionStartedAt,
    lastDisplayedSecond: state.timer.lastDisplayedSecond,
    confirmStop: state.timer.confirmStop,
  };
}

function persistTimerState() {
  if (!state.timer || state.timer.status === "idle") {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(serializableTimerState()));
}

function clearPersistedTimerState() {
  localStorage.removeItem(TIMER_STORAGE_KEY);
}

function normalizePersistedTimer(timer) {
  if (!timer || typeof timer !== "object") return null;
  if (!["running", "paused", "finished"].includes(timer.status)) return null;

  return {
    status: timer.status,
    dateKey: normalizeDateInput(timer.dateKey) || currentDateKey(),
    taskId: String(timer.taskId || ""),
    subtaskId: String(timer.subtaskId || ""),
    taskText: String(timer.taskText || ""),
    color: normalizeCalendarTaskColor(timer.color),
    subtaskText: String(timer.subtaskText || ""),
    durationSeconds: Math.max(0, Math.floor(Number(timer.durationSeconds) || 0)),
    accumulatedSeconds: Math.max(0, Math.floor(Number(timer.accumulatedSeconds) || 0)),
    sessionStartEpoch: Number(timer.sessionStartEpoch) || null,
    sessionStartedAt: String(timer.sessionStartedAt || ""),
    lastDisplayedSecond: -1,
    confirmStop: false,
  };
}

function restorePersistedTimerState() {
  try {
    const restored = normalizePersistedTimer(JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY)));
    if (!restored) return;
    if (!restored.taskId || !isTimerTaskVisible(restored.dateKey, restored.taskId)) {
      clearPersistedTimerState();
      return;
    }

    Object.assign(state.timer, restored);
    if (state.timer.status === "finished" || (state.timer.status === "running" && liveRemainingSeconds() <= 0)) {
      stopTimer(true);
      return;
    }
    if (state.timer.status === "running" && !state.timer.sessionStartEpoch) {
      state.timer.status = "paused";
    }
    if (state.timer.status === "running") {
      state.timer.tickHandle = window.setInterval(tickTimer, 250);
    }
    persistTimerState();
  } catch (error) {
    console.warn("Timer state could not be restored.", error);
    clearPersistedTimerState();
  }
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function queueUndo(label = "last change") {
  state.undoSnapshot = {
    label,
    data: cloneData(state.data),
  };
  updateUndoButton();
}

function restoreLastAction() {
  if (!state.undoSnapshot) return;

  state.data = cloneData(state.undoSnapshot.data);
  state.undoSnapshot = null;
  state.editingJournalId = null;
  saveData();
  applyPalette();
  renderPaletteOptions();
  applyJournalLayout();
  renderAll();
}

function updateUndoButton() {
  if (!els.undoButton) return;
  els.undoButton.disabled = !state.undoSnapshot;
  els.undoButton.title = state.undoSnapshot ? `Undo ${state.undoSnapshot.label}` : "Nothing to undo";
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeGoalSections(savedSections) {
  if (Array.isArray(savedSections)) {
    return savedSections.map(normalizeGoalSection);
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
            color: normalizeGoalSectionColor(section.color),
            goals: [],
          });
        }

        const targetSection = mergedSections.get(title);
        const goals = Array.isArray(section.goals) ? section.goals : [];
        goals.forEach((goal) => {
          targetSection.goals.push(normalizeGoal(goal));
        });
      });
    });

  return [...mergedSections.values()];
}

function normalizeGoalGroups(savedGroups, legacySections = []) {
  if (Array.isArray(savedGroups) && savedGroups.length) {
    return savedGroups.map((group) => ({
      id: group.id || makeId("goal-group"),
      title: group.title || defaultGoalGroupName,
      sections: Array.isArray(group.sections) ? group.sections.map(normalizeGoalSection) : [],
    }));
  }

  return [
    {
      id: makeId("goal-group"),
      title: defaultGoalGroupName,
      sections: legacySections,
    },
  ];
}

function normalizeActiveGoalGroupId(savedId, groups) {
  if (groups.some((group) => group.id === savedId)) return savedId;
  return groups[0]?.id || "";
}

function normalizeCalendarNotes(savedNotes) {
  if (!savedNotes || typeof savedNotes !== "object") return {};

  return Object.fromEntries(
    Object.entries(savedNotes).map(([dateKey, notes]) => [
      dateKey,
      Array.isArray(notes) ? notes.map(normalizeTask) : [],
    ]),
  );
}

function normalizeInfoDumpTasks(savedTasks) {
  if (!Array.isArray(savedTasks)) return [];
  return savedTasks
    .map((task) => ({
      id: task.id || makeId("info"),
      text: String(task.text || "").trim(),
      done: Boolean(task.done),
    }))
    .filter((task) => task.text);
}

function normalizeSavedCalendarTasks(savedTasks) {
  if (!Array.isArray(savedTasks)) return [];

  const seen = new Set();
  return savedTasks
    .map((task) => ({
      id: task.id || makeId("saved-task"),
      text: String(task.text || "").trim(),
      color: normalizeCalendarTaskColor(task.color),
    }))
    .filter((task) => {
      const key = task.text.toLowerCase();
      if (!task.text || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildSpecialTaskCatalog(savedTasks = [], calendarNotes = {}) {
  const catalog = new Map();
  savedTasks.forEach((task) => {
    catalog.set(task.id, { ...task, archived: false });
  });

  Object.values(calendarNotes || {}).forEach((notes) => {
    if (!Array.isArray(notes)) return;
    notes.forEach((note) => {
      if (!note.specialTaskId || catalog.has(note.specialTaskId)) return;
      catalog.set(note.specialTaskId, {
        id: note.specialTaskId,
        text: note.text || "Removed special task",
        color: normalizeCalendarTaskColor(note.color),
        archived: true,
      });
    });
  });

  return [...catalog.values()];
}

function getSpecialTaskCatalog() {
  return buildSpecialTaskCatalog(state.data.savedCalendarTasks, state.data.calendarNotes);
}

function normalizeTrackedSpecialTaskIds(savedIds, savedTasks = []) {
  if (!Array.isArray(savedIds)) return [];
  const validIds = new Set(savedTasks.map((task) => task.id));
  const seen = new Set();
  return savedIds.filter((id) => {
    if (!validIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeGoalSectionColor(colorId) {
  return goalPaperColors.some((color) => color.id === colorId) ? colorId : "";
}

function getGoalPaperColor(colorId) {
  return goalPaperColors.find((color) => color.id === normalizeGoalSectionColor(colorId)) || goalPaperColors[0];
}

function normalizeGoalSection(section) {
  return {
    id: section.id || makeId("section"),
    title: section.title || "Untitled",
    color: normalizeGoalSectionColor(section.color),
    goals: Array.isArray(section.goals) ? section.goals.map(normalizeGoal) : [],
  };
}

function normalizeGoal(goal) {
  return {
    ...normalizeTask(goal),
    dueDate: goal.dueDate || "",
  };
}

function normalizeTask(task) {
  return {
    id: task.id || makeId("task"),
    text: task.text || "",
    done: Boolean(task.done),
    color: normalizeCalendarTaskColor(task.color),
    time: normalizeTimeValue(task.time),
    specialTaskId: task.specialTaskId || "",
    subtasks: normalizeSubtasks(task.subtasks),
  };
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];

  return subtasks.map((subtask) => ({
    id: subtask.id || makeId("subtask"),
    text: subtask.text || "",
    done: Boolean(subtask.done),
  }));
}

function normalizeTimeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const seconds = Math.max(0, Math.floor(Number(entry.seconds) || 0));
  if (!Number.isFinite(seconds)) return null;
  return {
    id: entry.id || makeId("time"),
    taskId: String(entry.taskId || ""),
    taskText: String(entry.taskText || "").trim(),
    seconds,
    color: normalizeCalendarTaskColor(entry.color),
    subtaskId: String(entry.subtaskId || ""),
    subtaskText: String(entry.subtaskText || "").trim(),
    startedAt: String(entry.startedAt || ""),
    endedAt: String(entry.endedAt || ""),
  };
}

function normalizeTimeEntries(savedTimeEntries) {
  if (!savedTimeEntries || typeof savedTimeEntries !== "object") return {};
  return Object.fromEntries(
    Object.entries(savedTimeEntries)
      .map(function ([dateKey, entries]) {
        return [dateKey, Array.isArray(entries) ? entries.map(normalizeTimeEntry).filter(Boolean) : []];
      })
      .filter(function ([, entries]) { return entries.length; }),
  );
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

function ordinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";
  const lastDigit = day % 10;
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
}

function journalDateTitle(dateKey) {
  if (!dateKey) return "Undated";
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return "Undated";
  const monthName = monthNames[month - 1];
  return `${monthName} ${day}${ordinalSuffix(day)}, ${year}`;
}

function journalGroupTitle(group) {
  const dateTitle = journalDateTitle(group.date);
  if (group.location) return `${group.location}, ${dateTitle}`;
  return dateTitle;
}

function journalTimeLabel(timeValue) {
  if (!timeValue) return "No time";
  const [hourValue, minuteValue] = timeValue.split(":").map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return "No time";
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
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

function sanitizeTimeDraft(timeValue) {
  const clean = String(timeValue || "").replace(/[^\d:]/g, "");
  if (clean.includes(":")) {
    const [hour = "", minute = ""] = clean.split(":");
    return `${hour.replace(/\D/g, "").slice(0, 2)}:${minute.replace(/\D/g, "").slice(0, 2)}`.slice(0, 5);
  }
  const digits = clean.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  return digits;
}

function openNativePicker(input) {
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.click();
}

function currentDateKey() {
  return toDateKey(new Date());
}

function currentTimeValue() {
  return normalizeTimeValue(new Date().toTimeString().slice(0, 5));
}

function compareTimeValues(a = "", b = "") {
  const left = normalizeTimeValue(a);
  const right = normalizeTimeValue(b);
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function compareEntryDateTime(a, b) {
  const dateCompare = (b.date || "").localeCompare(a.date || "");
  if (dateCompare) return dateCompare;
  const timeCompare = compareTimeValues(b.time, a.time);
  if (timeCompare) return timeCompare;
  return (b.createdAt || "").localeCompare(a.createdAt || "");
}

function sortedJournalEntries(entries) {
  return [...entries].sort(compareEntryDateTime);
}

function sortedCalendarTasks(notes) {
  return [...notes].sort((a, b) => {
    const timeCompare = compareTimeValues(a.time, b.time);
    if (timeCompare) return timeCompare;
    return 0;
  });
}

function datePartsFromKey(dateKey) {
  const [year, month, day] = (dateKey || "").split("-").map(Number);
  return {
    year: Number.isFinite(year) && year > 0 ? year : new Date().getFullYear(),
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1,
    day: Number.isFinite(day) && day >= 1 ? day : new Date().getDate(),
  };
}

function dateKeyFromParts(year, month, day) {
  const safeYear = Math.min(Math.max(Number(year) || new Date().getFullYear(), 1970), 2099);
  const safeMonth = Math.min(Math.max(Number(month) || 1, 1), 12);
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const safeDay = Math.min(Math.max(Number(day) || 1, 1), daysInMonth);
  return `${safeYear}-${String(safeMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
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

function normalizeJournalEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const text = typeof entry.text === "string" ? entry.text.trim() : "";
  if (!text) return null;
  const label = typeof entry.label === "string" ? entry.label.trim() : getEntryLabel(entry).trim();
  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : makeId("journal"),
    city: typeof entry.city === "string" ? entry.city.trim() : "",
    date: normalizeDateInput(entry.date) || "",
    time: normalizeTimeValue(entry.time) || "",
    label,
    tags: label ? [label] : [],
    text,
    createdAt: typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : new Date().toISOString(),
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
  };
}

function normalizeJournalEntryList(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(normalizeJournalEntry).filter(Boolean);
}

function journalEntrySignature(entry) {
  return [entry.city || "", entry.date || "", entry.time || "", getEntryLabel(entry), entry.text || ""].join("\u0000");
}

function normalizePalette(savedPalette) {
  return paletteOptions.some((palette) => palette.id === savedPalette) ? savedPalette : "green";
}

function normalizeCalendarTaskColor(savedColor) {
  return calendarTaskColors.some((color) => color.id === savedColor) ? savedColor : "";
}

function normalizeJournalLogWidth(savedWidth) {
  const width = Number(savedWidth);
  if (!Number.isFinite(width)) return defaultJournalLogWidth;
  return Math.min(Math.max(width, 42), 68);
}

function snapJournalLogWidth(width) {
  return Math.abs(width - defaultJournalLogWidth) <= 1.6 ? defaultJournalLogWidth : width;
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
  applyPalette();

  els.journalFilterMonth.append(makeOption("", ""));
  monthNames.forEach((name, index) => {
    els.journalFilterMonth.append(makeOption(String(index + 1), name));
  });

  weekdayNames.forEach((name) => {
    const day = document.createElement("div");
    day.className = "weekday";
    day.textContent = name;
    els.weekdayRow.append(day);
  });

  els.selectedDatePicker.value = state.selectedDate;

  const now = new Date();
  els.journalDate.value = toDateKey(now);
  els.journalTime.value = currentTimeValue();
  els.journalDatePicker.value = els.journalDate.value;
  renderPaletteOptions();
  renderSpecialTasks();
  applyJournalLayout();
  applyPlannerPanelLayout();
  restorePersistedTimerState();

  bindEvents();
  ensureStarterSections();
  renderJournalLabelOptions();
  renderAll();
  requestAnimationFrame(resizeJournalFormText);
  updateUndoButton();
}

function bindEvents() {
  els.aiAccessToken.value = localStorage.getItem(AI_TOKEN_KEY) || "";
  els.aiMcpEndpoint.textContent = `${window.location.origin}/mcp`;
  els.aiAccessToken.addEventListener("change", () => {
    localStorage.setItem(AI_TOKEN_KEY, els.aiAccessToken.value.trim());
    setAiSyncStatus("Access key saved on this device.");
    if (autoSyncEnabled) initializeAutomaticSync();
  });
  els.aiAutoSync.checked = localStorage.getItem(AI_AUTO_SYNC_KEY) === "true";
  els.aiAutoSync.addEventListener("change", () => {
    if (els.aiAutoSync.checked) {
      autoSyncEnabled = true;
      localStorage.setItem(AI_AUTO_SYNC_KEY, "true");
      initializeAutomaticSync();
    } else {
      disableAutomaticSync("Automatic sync is off.");
    }
  });
  els.aiPushButton.addEventListener("click", pushPlannerToCloud);
  els.aiPullButton.addEventListener("click", pullPlannerFromCloud);
  if (els.aiAutoSync.checked) {
    autoSyncEnabled = true;
    initializeAutomaticSync();
  }
  els.copyMuseConfigButton.addEventListener("click", async () => {
    try {
      const token = els.aiAccessToken.value.trim();
      if (!token) throw new Error("Enter your Cloudflare access key first.");
      const config = {
        mcp_servers: {
          "your-planner": {
            transport: "streamable_http",
            url: `${window.location.origin}/mcp`,
            headers: { Authorization: `Bearer ${token}` },
            enabled: true,
            mode: "optional",
          },
        },
      };
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setAiSyncStatus("Muse setup copied. Keep it private because it contains your access key.");
    } catch (error) {
      setAiSyncStatus(error.message || "Could not copy Muse setup.");
    }
  });

  els.calendarTitleButton.addEventListener("click", () => {
    els.selectedDatePicker.value = state.selectedDate || currentDateKey();
    openNativePicker(els.selectedDatePicker);
  });
  els.selectedDatePicker.addEventListener("change", () => {
    const nextDateKey = normalizeDateInput(els.selectedDatePicker.value);
    if (!nextDateKey) return;
    setCalendarDate(nextDateKey);
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
    renderCalendar();
  });

  els.calendarPrevButton.addEventListener("click", () => {
    shiftCalendarRange(-1);
  });

  els.calendarNextButton.addEventListener("click", () => {
    shiftCalendarRange(1);
  });

  els.specialTaskTrackerToggle.addEventListener("click", () => {
    togglePlannerPanel("specialTaskTrackerCollapsed", "task count");
  });

  els.emojiToggle.addEventListener("click", () => {
    togglePlannerPanel("emojiCollapsed", "emoji markers");
  });

  els.specialTaskToggle.addEventListener("click", () => {
    togglePlannerPanel("specialTasksCollapsed", "special tasks");
  });

  els.timePanelToggle.addEventListener("click", () => {
    togglePlannerPanel("timePanelCollapsed", "timer");
  });

  els.journalEntryToggle.addEventListener("click", () => {
    queueUndo("journal layout change");
    state.data.journalEntryCollapsed = !state.data.journalEntryCollapsed;
    saveData();
    applyJournalLayout();
  });

  els.undoButton.addEventListener("click", restoreLastAction);

  els.journalResizeHandle.addEventListener("pointerdown", startJournalResize);

  els.journalDate.addEventListener("input", () => {
    els.journalDate.value = sanitizeDateDraft(els.journalDate.value);
  });
  els.journalDate.addEventListener("focus", () => {
    if (!els.journalDate.value) {
      els.journalDate.value = currentDateKey();
      els.journalDatePicker.value = els.journalDate.value;
    }
  });
  els.journalDate.addEventListener("blur", () => {
    els.journalDate.value = normalizeDateInput(els.journalDate.value) || currentDateKey();
    els.journalDatePicker.value = els.journalDate.value;
  });
  els.journalDate.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      els.journalDate.blur();
    }
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
    if (!els.journalTime.value) {
      els.journalTime.value = currentTimeValue();
    }
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
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      els.views.forEach((view) => {
        view.classList.toggle("is-active", view.id === `${tab.dataset.view}View`);
      });
      if (tab.dataset.view === "journal") {
        requestAnimationFrame(resizeAllJournalTexts);
      }
      if (tab.dataset.view === "goals") {
        resizeAllGoalTextboxesSoon();
      }
    });
  });

  els.calendarNoteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = els.calendarNoteInput.value.trim();
    if (!text || !state.selectedDate) return;

    queueUndo("calendar task");
    const notes = state.data.calendarNotes[state.selectedDate] || [];
    notes.push({
      id: makeId("note"),
      text,
      done: false,
      color: "",
      time: "",
      subtasks: [],
    });
    state.data.calendarNotes[state.selectedDate] = notes;
    els.calendarNoteInput.value = "";
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
  });

  els.infoDumpForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = els.infoDumpInput.value.trim();
    if (!text) return;

    queueUndo("info dump task");
    state.data.infoDumpTasks.push({
      id: makeId("info"),
      text,
      done: false,
    });
    els.infoDumpInput.value = "";
    saveData();
    renderInfoDump();
  });

  els.addSpecialTaskButton.addEventListener("click", () => {
    addSpecialTask();
  });

  /* Timer event bindings */
  els.timerStartButton.addEventListener("click", startTimer);
  els.timerPauseButton.addEventListener("click", pauseTimer);
  els.timerStopButton.addEventListener("click", confirmStopTimer);
  els.timerContinueButton.addEventListener("click", continueTimer);
  els.timerEndButton.addEventListener("click", function () { stopTimer(true); });
  els.timerStopResumeButton.addEventListener("click", cancelStopConfirm);
  els.timerStopSaveButton.addEventListener("click", saveAndStop);
  els.timerStopDiscardButton.addEventListener("click", discardAndStop);
  els.clearTimeEntriesButton.addEventListener("click", clearDayTimeEntries);
  els.timerTaskSelect.addEventListener("change", () => {
    renderTimerTaskChips();
    renderTimerDisplay();
  });
  els.timePanel.addEventListener("dragover", (event) => {
    if (!state.draggingSpecialTaskId || state.timer.status !== "idle") return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    els.timePanel.classList.add("is-task-drop-target");
  });
  els.timePanel.addEventListener("dragleave", (event) => {
    if (els.timePanel.contains(event.relatedTarget)) return;
    els.timePanel.classList.remove("is-task-drop-target");
  });
  els.timePanel.addEventListener("drop", (event) => {
    if (!state.draggingSpecialTaskId) return;
    event.preventDefault();
    const task = state.data.savedCalendarTasks.find((item) => item.id === state.draggingSpecialTaskId);
    clearSpecialTaskDrag();
    if (task) trackSpecialTaskInTimer(task);
  });
  els.timerSubtractButton.addEventListener("click", function () { adjustTimerDuration(-5 * 60); });
  els.timerAddButton.addEventListener("click", function () { adjustTimerDuration(5 * 60); });
  els.timeChartModeMergedButton.addEventListener("click", function () {
    setTimeChartMode("merged");
  });
  els.timeChartModeSequenceButton.addEventListener("click", function () {
    setTimeChartMode("sequence");
  });
  window.addEventListener("pagehide", endTimerForNavigation);
  document.addEventListener("drop", (event) => {
    const isPlannerDrag = Array.from(event.dataTransfer?.types || []).includes(DRAG_DATA_TYPE);
    if (isPlannerDrag && event.target.closest?.("input, textarea")) event.preventDefault();
  }, true);

  els.journalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const entryText = els.journalText.value.trim();
    if (!entryText) return;

    const entryData = {
      city: els.journalCity.value.trim(),
      date: normalizeDateInput(els.journalDate.value) || currentDateKey(),
      time: normalizeTimeValue(els.journalTime.value),
      label: els.journalLabel.value,
      text: entryText,
    };

    queueUndo(state.editingJournalId ? "journal entry edit" : "journal entry");
    if (state.editingJournalId) {
      const entry = state.data.journalEntries.find((item) => item.id === state.editingJournalId);
      if (entry) {
        Object.assign(entry, entryData, { tags: entryData.label ? [entryData.label] : [], updatedAt: new Date().toISOString() });
      }
    } else {
      state.data.journalEntries.push({
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

  els.journalText.addEventListener("input", () => {
    resizeJournalFormText();
  });

  els.addJournalLabelButton.addEventListener("click", () => {
    els.addJournalLabelButton.closest("details").open = false;
    const label = window.prompt("New journal label");
    if (!label) return;
    const clean = label.trim().slice(0, 32);
    if (!clean) return;
    if (state.data.journalLabels.includes(clean)) {
      renderJournalLabelOptions(clean);
      return;
    }
    queueUndo("journal label");
    ensureJournalLabel(clean);
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

  els.journalFilterDate.addEventListener("input", () => {
    els.journalFilterDate.value = sanitizeDateDraft(els.journalFilterDate.value);
  });
  els.journalFilterDate.addEventListener("focus", () => {
    if (!els.journalFilterDate.value) {
      els.journalFilterDate.value = currentDateKey();
    }
  });
  els.journalFilterDate.addEventListener("change", () => {
    applyJournalFilterDateInput();
  });
  els.journalFilterDate.addEventListener("blur", () => {
    applyJournalFilterDateInput();
  });
  els.journalFilterDate.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyJournalFilterDateInput();
      els.journalFilterDate.blur();
    }
  });
  els.journalFilterDatePickerButton.addEventListener("click", () => {
    const nextDateKey = normalizeDateInput(els.journalFilterDate.value) || currentDateKey();
    els.journalFilterDate.value = nextDateKey;
    els.journalFilterDatePicker.value = nextDateKey;
    openNativePicker(els.journalFilterDatePicker);
  });
  els.journalFilterDatePicker.addEventListener("change", () => {
    const nextDateKey = normalizeDateInput(els.journalFilterDatePicker.value);
    state.journalFilters.date = nextDateKey;
    els.journalFilterDate.value = nextDateKey;
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

  els.calendarRemoveOldDataButton.addEventListener("click", () => {
    removeOldData();
  });

  els.removeOldDataButton.addEventListener("click", () => {
    removeOldData();
  });
}

function setAiSyncStatus(message) {
  els.aiAccessStatus.textContent = message;
}

function aiAuthHeaders() {
  const token = els.aiAccessToken.value.trim();
  if (!token) throw new Error("Enter your Cloudflare access key first.");
  localStorage.setItem(AI_TOKEN_KEY, token);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function pushPlannerToCloud() {
  try {
    const headers = aiAuthHeaders();
    const current = await fetch("/api/planner", { headers });
    if (!current.ok && current.status !== 404) throw new Error("Could not read cloud data. Check the access key.");
    const remote = current.status === 404 ? null : await current.json();
    if (remote && !window.confirm("Cloud data already exists. Replace it with this browser's planner?")) return;
    const response = await fetch("/api/planner", {
      method: "PUT",
      headers,
      body: JSON.stringify({ data: state.data, expectedVersion: remote?.version ?? 0 }),
    });
    if (!response.ok) throw new Error(response.status === 409 ? "Cloud data changed. Load it first, then try again." : "Cloud save failed.");
    const saved = await response.json();
    if (autoSyncEnabled) recordAutomaticSync(saved.version);
    setAiSyncStatus(`Local planner copied to Cloudflare (version ${saved.version}).`);
  } catch (error) {
    setAiSyncStatus(error.message || "Cloud sync failed.");
  }
}

async function pullPlannerFromCloud() {
  try {
    const response = await fetch("/api/planner", { headers: aiAuthHeaders() });
    if (response.status === 404) throw new Error("No cloud copy found yet. Send local data first.");
    if (!response.ok) throw new Error("Could not load cloud data. Check the access key.");
    const remote = await response.json();
    if (!window.confirm("Replace this browser's planner with the Cloudflare copy? A local safety copy will be kept.")) return;
    localStorage.setItem(`${STORAGE_KEY}-before-cloud-sync`, localStorage.getItem(STORAGE_KEY) || "{}");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.data));
    window.location.reload();
  } catch (error) {
    setAiSyncStatus(error.message || "Cloud sync failed.");
  }
}

function disableAutomaticSync(message) {
  autoSyncEnabled = false;
  localStorage.removeItem(AI_AUTO_SYNC_KEY);
  els.aiAutoSync.checked = false;
  clearTimeout(autoSyncPushTimer);
  clearInterval(autoSyncPollTimer);
  autoSyncVersion = null;
  lastSyncedSnapshot = null;
  setAiSyncStatus(message);
}

function recordAutomaticSync(version, data = state.data) {
  autoSyncVersion = version;
  lastSyncedSnapshot = JSON.stringify(data);
}

function scheduleAutomaticPush() {
  if (!autoSyncEnabled || !lastSyncedSnapshot || autoSyncBusy) return;
  clearTimeout(autoSyncPushTimer);
  autoSyncPushTimer = setTimeout(pushAutomaticChanges, 900);
}

async function initializeAutomaticSync() {
  if (!autoSyncEnabled || autoSyncBusy) return;
  if (window.location.protocol !== "https:") {
    disableAutomaticSync("Automatic sync is available on the hosted HTTPS planner.");
    return;
  }

  autoSyncBusy = true;
  setAiSyncStatus("Connecting automatic sync…");
  try {
    const headers = aiAuthHeaders();
    const initialSnapshot = JSON.stringify(state.data);
    const response = await fetch("/api/planner", { headers });
    if (!response.ok && response.status !== 404) {
      throw new Error(response.status === 401 ? "Access key rejected. Check the key and try again." : "Could not connect to planner cloud.");
    }

    if (response.status === 404) {
      const result = await fetch("/api/planner", {
        method: "PUT",
        headers,
        body: JSON.stringify({ data: JSON.parse(initialSnapshot), expectedVersion: 0 }),
      });
      if (!result.ok) throw new Error("Could not create the first cloud copy.");
      const saved = await result.json();
      recordAutomaticSync(saved.version, JSON.parse(initialSnapshot));
    } else {
      const remote = await response.json();
      const localSnapshot = initialSnapshot;
      const remoteSnapshot = JSON.stringify(remote.data);
      if (localSnapshot !== remoteSnapshot) {
        const sendLocal = window.confirm("This browser and the cloud copy differ. Send this browser's planner to the cloud? This replaces the existing cloud copy. Choose Cancel to keep automatic sync off and load cloud data first.");
        if (!sendLocal) {
          disableAutomaticSync("Copies differ. Automatic sync is off; review the cloud and browser copies first.");
          return;
        }
        const savedResponse = await fetch("/api/planner", {
          method: "PUT",
          headers,
          body: JSON.stringify({ data: state.data, expectedVersion: remote.version }),
        });
        if (!savedResponse.ok) throw new Error("The cloud copy changed during setup. Try again after checking both copies.");
        const saved = await savedResponse.json();
        recordAutomaticSync(saved.version);
      } else {
        recordAutomaticSync(remote.version);
      }
    }

    setAiSyncStatus("Automatic sync is on.");
    startAutomaticPolling();
  } catch (error) {
    if (error.message?.includes("Access key rejected")) disableAutomaticSync(error.message);
    else {
      setAiSyncStatus(error.message || "Automatic sync could not start.");
      if (autoSyncEnabled) {
        clearTimeout(autoSyncPollTimer);
        autoSyncPollTimer = setTimeout(initializeAutomaticSync, 15000);
      }
    }
  } finally {
    autoSyncBusy = false;
    if (autoSyncEnabled && lastSyncedSnapshot && JSON.stringify(state.data) !== lastSyncedSnapshot) scheduleAutomaticPush();
  }
}

function startAutomaticPolling() {
  clearInterval(autoSyncPollTimer);
  autoSyncPollTimer = setInterval(checkForCloudChanges, 12000);
  if (!autoSyncListenersBound) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && autoSyncEnabled) checkForCloudChanges();
    });
    window.addEventListener("focus", () => {
      if (autoSyncEnabled) checkForCloudChanges();
    });
    autoSyncListenersBound = true;
  }
}

async function pushAutomaticChanges() {
  if (!autoSyncEnabled || autoSyncBusy || autoSyncVersion === null) return;
  const snapshot = JSON.stringify(state.data);
  if (snapshot === lastSyncedSnapshot) return;

  autoSyncBusy = true;
  try {
    const response = await fetch("/api/planner", {
      method: "PUT",
      headers: aiAuthHeaders(),
      body: JSON.stringify({ data: JSON.parse(snapshot), expectedVersion: autoSyncVersion }),
    });
    if (response.status === 409) {
      localStorage.setItem(`${STORAGE_KEY}-sync-conflict`, snapshot);
      disableAutomaticSync("Cloud and browser changed at the same time. Your browser copy is preserved; review both before syncing again.");
      return;
    }
    if (!response.ok) throw new Error(response.status === 401 ? "Access key rejected. Automatic sync is paused." : "Could not save the latest planner changes.");
    const saved = await response.json();
    recordAutomaticSync(saved.version, JSON.parse(snapshot));
    setAiSyncStatus("Automatic sync is on.");
  } catch (error) {
    if (error.message?.includes("Access key rejected")) disableAutomaticSync(error.message);
    else setAiSyncStatus(error.message || "Automatic sync paused after a connection problem.");
  } finally {
    autoSyncBusy = false;
    if (autoSyncEnabled && JSON.stringify(state.data) !== lastSyncedSnapshot) scheduleAutomaticPush();
  }
}

async function checkForCloudChanges() {
  if (!autoSyncEnabled || autoSyncBusy || document.visibilityState === "hidden") return;
  autoSyncBusy = true;
  try {
    const response = await fetch("/api/planner", { headers: aiAuthHeaders() });
    if (!response.ok) throw new Error(response.status === 401 ? "Access key rejected. Automatic sync is paused." : "Could not check for cloud changes.");
    const remote = await response.json();
    if (remote.version === autoSyncVersion) return;

    const localSnapshot = JSON.stringify(state.data);
    const remoteSnapshot = JSON.stringify(remote.data);
    if (localSnapshot === remoteSnapshot) {
      recordAutomaticSync(remote.version, remote.data);
      return;
    }
    if (localSnapshot !== lastSyncedSnapshot) {
      localStorage.setItem(`${STORAGE_KEY}-sync-conflict`, localSnapshot);
      disableAutomaticSync("Cloud and browser changed at the same time. Your browser copy is preserved; review both before syncing again.");
      return;
    }

    localStorage.setItem(`${STORAGE_KEY}-before-cloud-sync`, localStorage.getItem(STORAGE_KEY) || "{}");
    localStorage.setItem(STORAGE_KEY, remoteSnapshot);
    recordAutomaticSync(remote.version, remote.data);
    setAiSyncStatus("Loaded Muse's latest planner changes.");
    window.location.reload();
  } catch (error) {
    if (error.message?.includes("Access key rejected")) disableAutomaticSync(error.message);
    else setAiSyncStatus(error.message || "Automatic sync could not check the cloud copy.");
  } finally {
    autoSyncBusy = false;
  }
}

function applyPalette() {
  document.documentElement.dataset.palette = normalizePalette(state.data.palette);
}

function renderPaletteOptions() {
  els.paletteOptions.innerHTML = "";
  const currentPalette = paletteOptions.find((palette) => palette.id === normalizePalette(state.data.palette)) || paletteOptions[0];
  els.paletteMenu.style.setProperty("--menu-color", currentPalette.color);
  els.paletteMenu.style.setProperty("--menu-tint", currentPalette.tint);
  els.paletteOptions.append(makeColorMenuLabel());
  const grid = document.createElement("div");
  grid.className = "color-menu-grid";
  paletteOptions.forEach((palette) => {
    const button = makeColorOptionButton({
      name: palette.name,
      color: palette.color,
      tint: palette.tint,
      active: palette.id === currentPalette.id,
      ariaLabel: `Use ${palette.name} planner color`,
      onClick: () => {
        els.paletteMenu.open = false;
        if (palette.id === state.data.palette) return;
        queueUndo("palette change");
        state.data.palette = normalizePalette(palette.id);
        saveData();
        applyPalette();
        renderPaletteOptions();
      },
    });
    grid.append(button);
  });
  els.paletteOptions.append(grid);
}

function makeColorOptionButton({ name, color, tint = "rgba(255, 255, 255, 0.6)", active = false, ariaLabel, onClick }) {
  const button = document.createElement("button");
  button.className = "color-option";
  button.classList.toggle("is-active", active);
  button.type = "button";
  button.style.setProperty("--option-color", color);
  button.style.setProperty("--option-tint", tint);
  button.setAttribute("aria-label", ariaLabel || `Choose ${name}`);
  button.title = name;

  const swatch = document.createElement("span");
  swatch.className = "color-option-swatch";
  swatch.setAttribute("aria-hidden", "true");

  button.append(swatch);
  button.addEventListener("click", onClick);
  return button;
}

function makeColorMenuLabel() {
  const label = document.createElement("span");
  label.className = "color-menu-label";
  label.textContent = "Color";
  return label;
}

function getCalendarTaskColor(colorId) {
  return calendarTaskColors.find((color) => color.id === normalizeCalendarTaskColor(colorId)) || calendarTaskColors[0];
}

function renderSpecialTasks() {
  els.specialTaskList.innerHTML = "";

  if (!state.data.savedCalendarTasks.length) {
    const empty = document.createElement("span");
    empty.className = "special-task-empty-message";
    empty.textContent = "Add one with +";
    els.specialTaskList.append(empty);
    return;
  }

  state.data.savedCalendarTasks.forEach((task) => {
    els.specialTaskList.append(makeSpecialTaskChip(task));
  });
}

function makeSpecialTaskChip(task) {
  const chip = document.createElement("div");
  chip.className = "special-task-tile";
  chip.dataset.taskId = task.id;
  chip.draggable = true;
  chip.tabIndex = 0;
  chip.role = "button";
  chip.title = `${task.text}\nDrag onto a day · double-click to rename`;
  chip.setAttribute("aria-label", `Special task: ${task.text}`);
  const color = getCalendarTaskColor(task.color);
  chip.style.setProperty("--task-color", color.color);
  chip.style.setProperty("--task-tint", color.tint);
  let clickTimer = null;

  const label = document.createElement("span");
  label.className = "special-task-label";
  label.textContent = task.text;

  const isControlTarget = (target) => Boolean(target.closest(".special-task-color-menu, .special-task-remove"));

  const startEdit = () => {
    if (chip.classList.contains("is-editing")) return;
    chip.classList.add("is-editing");
    chip.draggable = false;
    const input = document.createElement("textarea");
    input.className = "special-task-name";
    input.rows = 2;
    input.maxLength = 80;
    input.value = task.text;
    input.setAttribute("aria-label", `Rename special task: ${task.text}`);
    let cancelled = false;
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("dblclick", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        cancelled = true;
        input.blur();
      }
    });
    input.addEventListener("blur", () => {
      chip.classList.remove("is-editing");
      chip.draggable = true;
      input.replaceWith(label);
      if (!cancelled) saveSpecialTaskName(task.id, input.value);
    });
    label.replaceWith(input);
    input.focus();
    input.select();
  };

  chip.addEventListener("dragstart", (event) => {
    if (chip.classList.contains("is-editing") || isControlTarget(event.target)) {
      event.preventDefault();
      return;
    }
    state.draggingCalendarTask = null;
    state.draggingSpecialTaskId = task.id;
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData(DRAG_DATA_TYPE, task.id);
    window.requestAnimationFrame(() => {
      if (state.draggingSpecialTaskId !== task.id) return;
      chip.classList.add("is-dragging");
      document.body.classList.add("is-dragging-special-task");
    });
  });
  chip.addEventListener("dragend", clearSpecialTaskDrag);

  chip.addEventListener("dragover", (event) => {
    if (!state.draggingSpecialTaskId || state.draggingSpecialTaskId === task.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    chip.classList.add("is-drop-target");
  });
  chip.addEventListener("dragleave", () => {
    chip.classList.remove("is-drop-target");
  });
  chip.addEventListener("drop", (event) => {
    if (!state.draggingSpecialTaskId) return;
    event.preventDefault();
    event.stopPropagation();
    const draggedId = state.draggingSpecialTaskId;
    clearSpecialTaskDrag();
    moveSpecialTask(draggedId, task.id);
  });

  chip.addEventListener("click", (event) => {
    if (chip.classList.contains("is-editing") || isControlTarget(event.target)) return;
    if (event.detail > 1) return;
    clickTimer = window.setTimeout(() => {
      clickTimer = null;
      addSpecialTaskToDate(task);
    }, 220);
  });
  chip.addEventListener("dblclick", (event) => {
    if (isControlTarget(event.target)) return;
    event.preventDefault();
    if (clickTimer) {
      window.clearTimeout(clickTimer);
      clickTimer = null;
    }
    startEdit();
  });
  chip.addEventListener("keydown", (event) => {
    if (event.target !== chip) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addSpecialTaskToDate(task);
    }
    if (event.key === "F2") {
      event.preventDefault();
      startEdit();
    }
  });

  const colorMenu = document.createElement("details");
  colorMenu.className = "special-task-color-menu color-menu";
  const colorSummary = document.createElement("summary");
  colorSummary.setAttribute("aria-label", "Choose special task color");
  colorSummary.title = "Choose color";
  colorSummary.style.setProperty("--menu-color", color.color);
  colorSummary.style.setProperty("--menu-tint", color.tint);
  const colorSwatch = document.createElement("span");
  colorSwatch.className = "color-menu-current";
  colorSwatch.setAttribute("aria-hidden", "true");
  colorSummary.append(colorSwatch);

  const colorItems = document.createElement("div");
  colorItems.className = "special-task-color-items color-menu-items";
  colorItems.append(makeColorMenuLabel(), makeSpecialTaskColorGrid(task, colorMenu));
  colorMenu.append(colorSummary, colorItems);

  const removeButton = document.createElement("button");
  removeButton.className = "special-task-remove";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.title = "Remove";
  removeButton.setAttribute("aria-label", `Remove special task ${task.text}`);
  removeButton.addEventListener("click", () => {
    removeSpecialTask(task.id);
  });

  chip.append(colorMenu, removeButton, label);
  return chip;
}

function makeSpecialTaskColorGrid(task, menu) {
  const grid = document.createElement("div");
  grid.className = "special-task-color-grid color-menu-grid";

  calendarTaskColors.forEach((color) => {
    const button = makeColorOptionButton({
      name: color.name || "Default",
      color: color.color,
      tint: color.tint,
      active: normalizeCalendarTaskColor(task.color) === color.id,
      ariaLabel: color.name ? `Set ${color.name}` : "Set default color",
      onClick: () => {
        menu.open = false;
        updateSpecialTaskColor(task.id, color.id);
      },
    });
    button.classList.add("special-task-color");
    grid.append(button);
  });

  return grid;
}

function addSpecialTask() {
  const existingDraft = els.specialTaskList.querySelector(".special-task-tile.is-draft textarea");
  if (existingDraft) {
    existingDraft.focus();
    return;
  }

  els.specialTaskList.querySelector(".special-task-empty-message")?.remove();
  const draft = document.createElement("div");
  draft.className = "special-task-tile is-draft is-editing";
  const input = document.createElement("textarea");
  input.className = "special-task-name";
  input.rows = 2;
  input.maxLength = 80;
  input.placeholder = "Name";
  input.setAttribute("aria-label", "New special task name");
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const text = input.value.trim().slice(0, 80);
    if (save && text && !hasSpecialTaskName(text)) {
      createSpecialTask(text);
    } else {
      renderSpecialTasks();
    }
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    }
    if (event.key === "Escape") {
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
  draft.append(input);
  els.specialTaskList.append(draft);
  input.focus();
}

function nextSpecialTaskColor() {
  const used = new Set(state.data.savedCalendarTasks.map((task) => normalizeCalendarTaskColor(task.color)));
  const free = calendarTaskColors.find((color) => color.id && !used.has(color.id));
  return free ? free.id : "";
}

function createSpecialTask(text) {
  queueUndo("special task");
  state.data.savedCalendarTasks.push({ id: makeId("saved-task"), text, color: nextSpecialTaskColor() });
  state.data.savedCalendarTasks = normalizeSavedCalendarTasks(state.data.savedCalendarTasks);
  saveData();
  renderSpecialTasks();
}

function addSpecialTaskToDate(task, dateKey = state.selectedDate) {
  if (!task || !dateKey) return null;

  const notes = state.data.calendarNotes[dateKey] || [];
  const existing = notes.find((note) => note.specialTaskId === task.id);
  if (existing) return existing;

  queueUndo("calendar special task");
  const note = {
    id: makeId("note"),
    text: task.text,
    done: false,
    color: normalizeCalendarTaskColor(task.color),
    time: "",
    specialTaskId: task.id,
    subtasks: [],
  };
  notes.push(note);
  state.data.calendarNotes[dateKey] = notes;
  saveData();
  renderCalendar();
  if (dateKey === state.selectedDate && state.timer.status === "idle") {
    els.timerTaskSelect.value = note.id;
    renderTimerTaskChips();
    renderTimerDisplay();
  }
  return note;
}

function trackSpecialTaskInTimer(task) {
  if (state.timer.status !== "idle") return;
  const note = addSpecialTaskToDate(task, state.selectedDate);
  if (!note) return;
  if (state.timeChartMode !== "merged") setTimeChartMode("merged");
  els.timerTaskSelect.value = note.id;
  renderTimerTaskChips();
  renderTimerDisplay();
}

function saveSpecialTaskName(taskId, value) {
  const task = state.data.savedCalendarTasks.find((item) => item.id === taskId);
  if (!task) return;

  const text = value.trim().slice(0, 80);
  if (!text) {
    renderSpecialTasks();
    return;
  }
  if (text === task.text) return;
  if (hasSpecialTaskName(text, taskId)) {
    renderSpecialTasks();
    return;
  }

  queueUndo("special task edit");
  task.text = text;
  syncSpecialTaskInstances(task.id, { text });
  state.data.savedCalendarTasks = normalizeSavedCalendarTasks(state.data.savedCalendarTasks);
  saveData();
  renderCalendar();
  renderSelectedDateNotes();
  renderSpecialTasks();
}

function updateSpecialTaskColor(taskId, colorId) {
  const task = state.data.savedCalendarTasks.find((item) => item.id === taskId);
  if (!task) return;
  const nextColor = normalizeCalendarTaskColor(colorId);
  if (task.color === nextColor) return;

  queueUndo("special task color");
  task.color = nextColor;
  syncSpecialTaskInstances(task.id, { color: nextColor });
  saveData();
  renderCalendar();
  renderSelectedDateNotes();
  renderSpecialTasks();
}

function syncSpecialTaskInstances(taskId, updates) {
  Object.values(state.data.calendarNotes).forEach((notes) => {
    notes.forEach((note) => {
      if (note.specialTaskId !== taskId) return;
      if (Object.prototype.hasOwnProperty.call(updates, "text")) {
        note.text = updates.text;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "color")) {
        note.color = normalizeCalendarTaskColor(updates.color);
      }
    });
  });
}

function hasSpecialTaskName(text, exceptTaskId = "") {
  const clean = text.toLowerCase();
  return state.data.savedCalendarTasks.some((task) => task.id !== exceptTaskId && task.text.toLowerCase() === clean);
}

function moveSpecialTask(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const tasks = state.data.savedCalendarTasks;
  const fromIndex = tasks.findIndex((task) => task.id === draggedId);
  const toIndex = tasks.findIndex((task) => task.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  queueUndo("special task order");
  const [movedTask] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, movedTask);
  saveData();
  renderSpecialTasks();
}

function clearSpecialTaskDrag() {
  state.draggingSpecialTaskId = null;
  document.body.classList.remove("is-dragging-special-task");
  els.specialTaskList.querySelectorAll(".is-dragging, .is-drop-target").forEach((item) => {
    item.classList.remove("is-dragging", "is-drop-target");
  });
  document.querySelectorAll(".is-task-drop-target").forEach((item) => item.classList.remove("is-task-drop-target"));
}

function removeSpecialTask(taskId) {
  const task = state.data.savedCalendarTasks.find((item) => item.id === taskId);
  if (!task) return;

  const confirmed = window.confirm(`Remove "${task.text}" from special tasks?`);
  if (!confirmed) return;

  queueUndo("special task removal");
  state.data.savedCalendarTasks = state.data.savedCalendarTasks.filter((item) => item.id !== taskId);
  const specialTaskCatalog = getSpecialTaskCatalog();
  state.data.trackedSpecialTaskIds = normalizeTrackedSpecialTaskIds(
    state.data.trackedSpecialTaskIds,
    specialTaskCatalog,
  );
  state.data.hiddenAllSpecialTaskCounterIds = normalizeTrackedSpecialTaskIds(
    state.data.hiddenAllSpecialTaskCounterIds,
    specialTaskCatalog,
  );
  if (!specialTaskCatalog.length) {
    state.data.showAllSpecialTaskCounters = false;
  }
  saveData();
  renderSpecialTasks();
  renderCalendar();
}

function togglePlannerPanel(key, label) {
  queueUndo(`${label} layout change`);
  state.data[key] = !state.data[key];
  saveData();
  applyPlannerPanelLayout();
}

function applyPlannerPanelLayout() {
  const emojiCollapsed = Boolean(state.data.emojiCollapsed);
  const specialCollapsed = Boolean(state.data.specialTasksCollapsed);
  const taskCountCollapsed = Boolean(state.data.specialTaskTrackerCollapsed);
  const timerCollapsed = Boolean(state.data.timePanelCollapsed);

  els.calendarLayout.dataset.timerCollapsed = timerCollapsed ? "true" : "false";
  els.emojiSection.dataset.panelCollapsed = emojiCollapsed ? "true" : "false";
  els.specialTaskShelf.dataset.panelCollapsed = specialCollapsed ? "true" : "false";
  els.specialTaskTrackerArea.dataset.panelCollapsed = taskCountCollapsed ? "true" : "false";
  els.timePanel.dataset.panelCollapsed = timerCollapsed ? "true" : "false";

  els.timePanelToggle.textContent = timerCollapsed ? "‹" : "›";
  els.timePanelToggle.title = timerCollapsed ? "Open timer" : "Close timer";

  els.emojiToggle.dataset.switchOn = emojiCollapsed ? "false" : "true";
  els.specialTaskToggle.dataset.switchOn = specialCollapsed ? "false" : "true";
  els.specialTaskTrackerToggle.dataset.switchOn = taskCountCollapsed ? "false" : "true";
  els.emojiToggle.setAttribute("aria-pressed", emojiCollapsed ? "false" : "true");
  els.specialTaskToggle.setAttribute("aria-pressed", specialCollapsed ? "false" : "true");
  els.specialTaskTrackerToggle.setAttribute("aria-pressed", taskCountCollapsed ? "false" : "true");
  els.emojiToggle.setAttribute("aria-label", emojiCollapsed ? "Show emoji markers" : "Hide emoji markers");
  els.specialTaskToggle.setAttribute("aria-label", specialCollapsed ? "Show special tasks" : "Hide special tasks");
  els.specialTaskTrackerToggle.setAttribute("aria-label", taskCountCollapsed ? "Show task counts" : "Hide task counts");
  els.timePanelToggle.setAttribute("aria-label", timerCollapsed ? "Open timer" : "Close timer");
}

function applyJournalLayout() {
  const logWidth = normalizeJournalLogWidth(state.data.journalLogWidth);
  els.journalLayout.dataset.entryCollapsed = state.data.journalEntryCollapsed ? "true" : "false";
  els.journalLayout.dataset.defaultSplit = logWidth === defaultJournalLogWidth ? "true" : "false";
  els.journalLayout.style.setProperty("--journal-log-width", `${logWidth}%`);
  els.journalLayout.style.setProperty("--journal-entry-width", `${100 - logWidth}%`);
  els.journalLayout.style.setProperty("--journal-reading-width", `${Math.round(640 + logWidth * 8)}px`);
  els.journalEntryToggle.textContent = state.data.journalEntryCollapsed ? "›" : "‹";
  els.journalEntryToggle.setAttribute(
    "aria-label",
    state.data.journalEntryCollapsed ? "Open entry box" : "Close entry box",
  );
  requestAnimationFrame(resizeAllJournalTexts);
}

function startJournalResize(event) {
  event.preventDefault();
  queueUndo("journal width change");
  els.journalResizeHandle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-journal");

  const updateWidth = (pointerEvent) => {
    const rect = els.journalLayout.getBoundingClientRect();
    const width = ((rect.right - pointerEvent.clientX) / rect.width) * 100;
    state.data.journalLogWidth = snapJournalLogWidth(normalizeJournalLogWidth(width));
    applyJournalLayout();
  };

  const stopResize = (pointerEvent) => {
    updateWidth(pointerEvent);
    saveData();
    document.body.classList.remove("is-resizing-journal");
    els.journalResizeHandle.releasePointerCapture(pointerEvent.pointerId);
    els.journalResizeHandle.removeEventListener("pointermove", updateWidth);
    els.journalResizeHandle.removeEventListener("pointerup", stopResize);
    els.journalResizeHandle.removeEventListener("pointercancel", stopResize);
  };

  updateWidth(event);
  els.journalResizeHandle.addEventListener("pointermove", updateWidth);
  els.journalResizeHandle.addEventListener("pointerup", stopResize);
  els.journalResizeHandle.addEventListener("pointercancel", stopResize);
}

function shiftCalendarRange(direction) {
  const selectedDate = parseDateKey(state.selectedDate);
  if (state.range === "week") {
    setCalendarDate(toDateKey(addDays(selectedDate, direction * 7)));
    renderCalendar();
    return;
  }

  const targetMonth = selectedDate.getMonth() + direction;
  const targetYear = selectedDate.getFullYear();
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(selectedDate.getDate(), daysInTargetMonth);
  setCalendarDate(toDateKey(new Date(targetYear, targetMonth, targetDay)));
  renderCalendar();
}

function setCalendarDate(dateKey) {
  if (dateKey !== state.selectedDate) {
    endTimerForNavigation();
  }
  const nextDate = parseDateKey(dateKey);
  state.selectedDate = dateKey;
  state.month = nextDate.getMonth();
  state.year = nextDate.getFullYear();
  els.selectedDatePicker.value = state.selectedDate;
}

function applyJournalFilterDateInput() {
  const nextDateKey = normalizeDateInput(els.journalFilterDate.value);
  state.journalFilters.date = nextDateKey;
  els.journalFilterDate.value = nextDateKey;
  els.journalFilterDatePicker.value = nextDateKey;
  renderJournal();
}

function ensureStarterSections() {
  ensureGoalGroups();
  const activeGroup = getActiveGoalGroup();
  if (activeGroup.sections.length || getAllGoalSections().length) return;

  activeGroup.sections = [
    { id: makeId("section"), title: "Priorities", color: "", goals: [] },
    { id: makeId("section"), title: "Optional goals", color: "", goals: [] },
    { id: makeId("section"), title: "Personal", color: "", goals: [] },
  ];
  saveData();
}

function ensureGoalGroups() {
  if (!Array.isArray(state.data.goalGroups) || !state.data.goalGroups.length) {
    state.data.goalGroups = normalizeGoalGroups(null, normalizeGoalSections(state.data.goalSections));
  }
  state.data.activeGoalGroupId = normalizeActiveGoalGroupId(state.data.activeGoalGroupId, state.data.goalGroups);
}

function getActiveGoalGroup() {
  ensureGoalGroups();
  return state.data.goalGroups.find((group) => group.id === state.data.activeGoalGroupId) || state.data.goalGroups[0];
}

function getGoalSections() {
  const activeGroup = getActiveGoalGroup();
  if (!Array.isArray(activeGroup.sections)) {
    activeGroup.sections = [];
  }
  return activeGroup.sections;
}

function getAllGoalSections() {
  ensureGoalGroups();
  return state.data.goalGroups.flatMap((group) => group.sections || []);
}

function findGoalSectionLocation(sectionId) {
  ensureGoalGroups();

  for (const group of state.data.goalGroups) {
    const sections = Array.isArray(group.sections) ? group.sections : [];
    const sectionIndex = sections.findIndex((item) => item.id === sectionId);
    if (sectionIndex !== -1) {
      return { group, section: sections[sectionIndex], sectionIndex };
    }
  }

  return null;
}

function moveGoalSectionToGroup(sectionId, targetGroupId) {
  const source = findGoalSectionLocation(sectionId);
  const targetGroup = state.data.goalGroups.find((group) => group.id === targetGroupId);
  if (!source || !targetGroup || source.group.id === targetGroup.id) return;

  if (!Array.isArray(targetGroup.sections)) {
    targetGroup.sections = [];
  }

  queueUndo("goal box move");
  const [movedSection] = source.group.sections.splice(source.sectionIndex, 1);
  targetGroup.sections.push(movedSection);
  state.data.activeGoalGroupId = targetGroup.id;
  saveData();
  renderGoals();
  renderCalendar();
  renderSelectedDateNotes();
}

function updateGoalSectionColor(sectionId, colorId) {
  const location = findGoalSectionLocation(sectionId);
  if (!location) return;
  const nextColor = normalizeGoalSectionColor(colorId);
  if (location.section.color === nextColor) return;

  queueUndo("goal box color");
  location.section.color = nextColor;
  saveData();
  renderGoals();
}

function addGoalGroup() {
  const title = window.prompt("New goal area", "General");
  if (!title) return;
  const clean = title.trim().slice(0, 36);
  if (!clean) return;

  queueUndo("goal area");
  const group = { id: makeId("goal-group"), title: clean, sections: [] };
  state.data.goalGroups.push(group);
  state.data.activeGoalGroupId = group.id;
  saveData();
  renderGoals();
}

function deleteActiveGoalGroup(groupId = state.data.activeGoalGroupId) {
  ensureGoalGroups();
  const activeGroup = state.data.goalGroups.find((group) => group.id === groupId) || getActiveGoalGroup();
  if (!activeGroup) return;

  const confirmed = window.confirm(`Delete "${activeGroup.title}" and its goal boxes?`);
  if (!confirmed) return;

  queueUndo("goal area deletion");
  if (state.data.goalGroups.length === 1) {
    activeGroup.title = defaultGoalGroupName;
    activeGroup.sections = [];
  } else {
    const groupIndex = state.data.goalGroups.findIndex((group) => group.id === activeGroup.id);
    state.data.goalGroups = state.data.goalGroups.filter((group) => group.id !== activeGroup.id);
    const nextGroup = state.data.goalGroups[Math.max(0, groupIndex - 1)] || state.data.goalGroups[0];
    state.data.activeGoalGroupId = nextGroup.id;
  }

  saveData();
  renderGoals();
  renderCalendar();
}

function addGoalSection(title = "Goals") {
  getGoalSections().push({ id: makeId("section"), title, color: "", goals: [] });
  saveData();
  renderGoals();
}

function addGoalSectionFromButton() {
  queueUndo("goal section");
  addGoalSection();
}

function moveGoalSection(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const sections = getGoalSections();
  const fromIndex = sections.findIndex((section) => section.id === draggedId);
  const toIndex = sections.findIndex((section) => section.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  queueUndo("goal section order");
  const [movedSection] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, movedSection);
  saveData();
  renderGoals();
}

function moveGoalGroup(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const groups = state.data.goalGroups;
  const fromIndex = groups.findIndex((group) => group.id === draggedId);
  const toIndex = groups.findIndex((group) => group.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  queueUndo("goal area order");
  const [movedGroup] = groups.splice(fromIndex, 1);
  groups.splice(toIndex, 0, movedGroup);
  saveData();
  renderGoals();
}

function clearGoalGroupDrag() {
  state.draggingGoalGroupId = null;
  els.goalGroupTabs.querySelectorAll(".is-dragging, .is-drop-target").forEach((item) => {
    item.classList.remove("is-dragging", "is-drop-target");
  });
}

function renderAll() {
  ensureStarterSections();
  applyPlannerPanelLayout();
  renderSpecialTasks();
  renderInfoDump();
  renderCalendar();
  setTimePanelView(state.timePanelView);
  els.timeChartArea.hidden = state.timeChartMode !== "merged";
  els.timeSequenceList.hidden = state.timeChartMode !== "sequence";
  els.timerSession.hidden = state.timeChartMode !== "merged";
  els.timeChartModeMergedButton.classList.toggle("is-active", state.timeChartMode === "merged");
  els.timeChartModeSequenceButton.classList.toggle("is-active", state.timeChartMode === "sequence");
  renderTimePie();
  renderGoals();
  renderJournal();
  renderTimerDisplay();
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
    "Remove journal entries, calendar tasks, day markers, time tracking, and dated goals before " + cutoffDate + "? You can undo this once.",
  );
  if (!confirmed) return;

  queueUndo("old data removal");
  const before = {
    calendarDays: Object.keys(state.data.calendarNotes).length,
    markerDays: Object.keys(state.data.dayEmojis).length,
    timeDays: Object.keys(state.data.timeEntries).length,
    journalEntries: state.data.journalEntries.length,
    datedGoals: getAllGoalSections().reduce((count, section) => count + section.goals.filter((goal) => goal.dueDate).length, 0),
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

  Object.keys(state.data.timeEntries).forEach((dateKey) => {
    if (isDateKeyBefore(dateKey, cutoffDate)) {
      delete state.data.timeEntries[dateKey];
    }
  });

  state.data.journalEntries = state.data.journalEntries.filter((entry) => !entry.date || !isDateKeyBefore(entry.date, cutoffDate));
  getAllGoalSections().forEach((section) => {
    section.goals = section.goals.filter((goal) => !goal.dueDate || !isDateKeyBefore(goal.dueDate, cutoffDate));
  });

  const after = {
    calendarDays: Object.keys(state.data.calendarNotes).length,
    markerDays: Object.keys(state.data.dayEmojis).length,
    timeDays: Object.keys(state.data.timeEntries).length,
    journalEntries: state.data.journalEntries.length,
    datedGoals: getAllGoalSections().reduce((count, section) => count + section.goals.filter((goal) => goal.dueDate).length, 0),
  };

  saveData();
  renderAll();

  const removed =
    before.calendarDays -
    after.calendarDays +
    before.markerDays -
    after.markerDays +
    before.timeDays -
    after.timeDays +
    before.journalEntries -
    after.journalEntries +
    before.datedGoals -
    after.datedGoals;
  window.alert("Removed " + removed + " old saved item" + (removed === 1 ? "" : "s") + ".");
}

function exportJournalBackup() {
  const backup = {
    type: "your-planner-journal-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    journalLabels: state.data.journalLabels,
    journalEntries: state.data.journalEntries,
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
  const entries = normalizeJournalEntryList(backupEntries);
  if (!entries.length && !Array.isArray(backupLabels)) {
    throw new Error("Backup does not contain journal data.");
  }

  queueUndo("journal backup import");
  const existingIds = new Set(state.data.journalEntries.map((entry) => entry.id));
  const existingSignatures = new Set(state.data.journalEntries.map(journalEntrySignature));
  let addedEntries = 0;

  entries.forEach((entry) => {
    const signature = journalEntrySignature(entry);
    if (existingIds.has(entry.id) || existingSignatures.has(signature)) return;
    state.data.journalEntries.push(entry);
    existingIds.add(entry.id);
    existingSignatures.add(signature);
    addedEntries += 1;
  });

  const previousLabelCount = state.data.journalLabels.length;
  state.data.journalLabels = normalizeJournalLabels(
    [...state.data.journalLabels, ...(Array.isArray(backupLabels) ? backupLabels : [])],
    state.data.journalEntries,
  );
  const addedLabels = state.data.journalLabels.length - previousLabelCount;

  saveData();
  renderJournalLabelOptions();
  renderJournal();
  return { addedEntries, addedLabels };
}

function renderCalendar() {
  const { gridStart, totalDays } = getCalendarGridRange();
  els.calendarGrid.innerHTML = "";
  els.calendarGrid.classList.toggle("is-week-view", state.range === "week");
  renderCalendarTitle(gridStart);
  renderSpecialTaskTracker(gridStart, totalDays);

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
    cell.addEventListener("dragover", (event) => {
      if (!state.draggingCalendarTask && !state.draggingSpecialTaskId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = state.draggingSpecialTaskId ? "copy" : "move";
      cell.classList.add("is-task-drop-target");
    });
    cell.addEventListener("dragleave", (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      cell.classList.remove("is-task-drop-target");
    });
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      cell.classList.remove("is-task-drop-target");
      if (state.draggingSpecialTaskId) {
        const specialTask = state.data.savedCalendarTasks.find((item) => item.id === state.draggingSpecialTaskId);
        clearSpecialTaskDrag();
        addSpecialTaskToDate(specialTask, dateKey);
        return;
      }
      moveDraggedCalendarTask(dateKey);
    });
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
    const dayNotes = sortedCalendarTasks(state.data.calendarNotes[dateKey] || []);
    dayNotes.forEach((note) => notes.append(makeCalendarTask(note, dateKey)));
    getGoalsForDate(dateKey).forEach((goalMatch) => notes.append(makeCalendarGoalTask(goalMatch, "calendar")));

    cell.append(notes);
    els.calendarGrid.append(cell);
  }

  renderSelectedDateNotes();
}

function renderCalendarTitle(gridStart) {
  const shortMonth = (date) => monthNames[date.getMonth()].slice(0, 3);
  let title = `${monthNames[state.month]} ${state.year}`;
  if (state.range === "week") {
    const start = gridStart;
    const end = addDays(gridStart, 6);
    if (start.getFullYear() !== end.getFullYear()) {
      title = `${shortMonth(start)} ${start.getDate()}, ${start.getFullYear()} – ${shortMonth(end)} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (start.getMonth() !== end.getMonth()) {
      title = `${shortMonth(start)} ${start.getDate()} – ${shortMonth(end)} ${end.getDate()}, ${end.getFullYear()}`;
    } else {
      title = `${monthNames[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
  }
  els.calendarTitle.textContent = title;
}

function renderSelectedDayHeading() {
  const date = parseDateKey(state.selectedDate);
  const today = parseDateKey(currentDateKey());
  const dayOffset = Math.round((date - today) / 86400000);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const relative = { "-1": "Yesterday", 0: "Today", 1: "Tomorrow" }[dayOffset];
  els.selectedDayEyebrow.textContent = relative ? `${relative} · ${weekday}` : weekday;
  els.selectedDayTitle.textContent = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function renderSpecialTaskTracker(gridStart, totalDays) {
  els.specialTaskTracker.innerHTML = "";
  const specialTaskCatalog = getSpecialTaskCatalog();
  state.data.trackedSpecialTaskIds = normalizeTrackedSpecialTaskIds(
    state.data.trackedSpecialTaskIds,
    specialTaskCatalog,
  );
  state.data.hiddenAllSpecialTaskCounterIds = normalizeTrackedSpecialTaskIds(
    state.data.hiddenAllSpecialTaskCounterIds,
    specialTaskCatalog,
  );

  const counts = new Map();
  const trackerStart = gridStart;
  const trackerDays = totalDays;

  if (state.range === "month") {
    const label = document.createElement("span");
    label.className = "special-task-count-period";
    label.textContent = monthNames[state.month];
    els.specialTaskTracker.append(label);
  }

  for (let index = 0; index < trackerDays; index += 1) {
    const date = addDays(trackerStart, index);
    if (state.range === "month" && date.getMonth() !== state.month) continue;

    const dateKey = toDateKey(date);
    const countedToday = new Set();
    (state.data.calendarNotes[dateKey] || []).forEach((note) => {
      if (!note.specialTaskId || !note.done || countedToday.has(note.specialTaskId)) return;
      countedToday.add(note.specialTaskId);
      counts.set(note.specialTaskId, (counts.get(note.specialTaskId) || 0) + 1);
    });
  }

  els.specialTaskTracker.append(makeSpecialTaskCounterAddMenu());

  const hiddenAllIds = new Set(state.data.hiddenAllSpecialTaskCounterIds);
  const trackerTasks = state.data.showAllSpecialTaskCounters
    ? specialTaskCatalog.filter((task) => (counts.get(task.id) || 0) > 0 && !hiddenAllIds.has(task.id))
    : state.data.trackedSpecialTaskIds
        .map((taskId) => specialTaskCatalog.find((item) => item.id === taskId))
        .filter(Boolean);

  trackerTasks.forEach((task) => {
    const count = counts.get(task.id) || 0;

    const color = getCalendarTaskColor(task.color);
    const item = document.createElement("span");
    item.className = "special-task-count";
    item.style.setProperty("--task-color", color.color);
    item.style.setProperty("--task-tint", color.tint);
    const label = document.createElement("span");
    label.className = "special-task-count-label";
    label.textContent = task.text;
    const number = document.createElement("span");
    number.className = "special-task-count-number";
    number.textContent = `: ${count}`;
    item.title = `${count} completed in ${state.range === "week" ? "this week" : monthNames[state.month]}`;
    const removeButton = document.createElement("button");
    removeButton.className = "special-task-count-remove";
    removeButton.type = "button";
    removeButton.textContent = "x";
    removeButton.setAttribute("aria-label", `Hide ${task.text} counter`);
    removeButton.addEventListener("click", () => {
      removeSpecialTaskCounter(task.id);
    });
    item.append(label, number, removeButton);
    els.specialTaskTracker.append(item);
  });

  if (!trackerTasks.length) {
    const empty = document.createElement("span");
    empty.className = "special-task-count-empty";
    empty.textContent = "None yet";
    els.specialTaskTracker.append(empty);
  }
}

function makeSpecialTaskCounterAddMenu() {
  const menu = document.createElement("details");
  menu.className = "special-task-counter-add-menu";

  const summary = document.createElement("summary");
  summary.textContent = "+";
  summary.setAttribute("aria-label", "Add special task counter");
  summary.title = "Add counter";

  const items = document.createElement("div");
  items.className = "special-task-counter-add-items";
  const trackedIds = new Set(state.data.showAllSpecialTaskCounters
    ? getSpecialTaskCatalog()
        .map((task) => task.id)
        .filter((id) => !state.data.hiddenAllSpecialTaskCounterIds.includes(id))
    : state.data.trackedSpecialTaskIds);
  const specialTaskCatalog = getSpecialTaskCatalog();
  const availableTasks = specialTaskCatalog.filter((task) => !trackedIds.has(task.id));

  if (specialTaskCatalog.length) {
    const allButton = document.createElement("button");
    allButton.className = "special-task-counter-all";
    allButton.type = "button";
    allButton.textContent = "All";
    allButton.addEventListener("click", () => {
      menu.open = false;
      addAllSpecialTaskCounters();
    });
    items.append(allButton);
  }

  if (!availableTasks.length) {
    const empty = document.createElement("span");
    empty.className = "special-task-counter-empty";
    empty.textContent = specialTaskCatalog.length ? "All shown" : "No tasks";
    items.append(empty);
  } else {
    availableTasks.forEach((task) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = task.text;
      button.addEventListener("click", () => {
        menu.open = false;
        addSpecialTaskCounter(task.id);
      });
      items.append(button);
    });
  }

  menu.append(summary, items);
  return menu;
}

function addSpecialTaskCounter(taskId) {
  const specialTaskCatalog = getSpecialTaskCatalog();
  if (!specialTaskCatalog.some((task) => task.id === taskId)) return;
  if (!state.data.showAllSpecialTaskCounters && state.data.trackedSpecialTaskIds.includes(taskId)) return;
  queueUndo("special task counter");
  state.data.showAllSpecialTaskCounters = false;
  state.data.hiddenAllSpecialTaskCounterIds = [];
  state.data.trackedSpecialTaskIds = normalizeTrackedSpecialTaskIds(
    [...state.data.trackedSpecialTaskIds, taskId],
    specialTaskCatalog,
  );
  saveData();
  const { gridStart, totalDays } = getCalendarGridRange();
  renderSpecialTaskTracker(gridStart, totalDays);
}

function addAllSpecialTaskCounters() {
  const specialTaskCatalog = getSpecialTaskCatalog();
  const allIds = specialTaskCatalog.map((task) => task.id);
  if (state.data.showAllSpecialTaskCounters && allIds.length && !state.data.hiddenAllSpecialTaskCounterIds.length) return;
  queueUndo("all special task counters");
  state.data.showAllSpecialTaskCounters = true;
  state.data.hiddenAllSpecialTaskCounterIds = [];
  state.data.trackedSpecialTaskIds = normalizeTrackedSpecialTaskIds(allIds, specialTaskCatalog);
  saveData();
  const { gridStart, totalDays } = getCalendarGridRange();
  renderSpecialTaskTracker(gridStart, totalDays);
}

function removeSpecialTaskCounter(taskId) {
  if (!state.data.showAllSpecialTaskCounters && !state.data.trackedSpecialTaskIds.includes(taskId)) return;
  queueUndo("special task counter removal");
  if (state.data.showAllSpecialTaskCounters) {
    state.data.hiddenAllSpecialTaskCounterIds = normalizeTrackedSpecialTaskIds(
      [...state.data.hiddenAllSpecialTaskCounterIds, taskId],
      getSpecialTaskCatalog(),
    );
  } else {
    state.data.trackedSpecialTaskIds = state.data.trackedSpecialTaskIds.filter((id) => id !== taskId);
  }
  saveData();
  const { gridStart, totalDays } = getCalendarGridRange();
  renderSpecialTaskTracker(gridStart, totalDays);
}

function getCalendarGridRange() {
  const selectedDate = parseDateKey(state.selectedDate);
  if (state.range === "week") {
    return {
      gridStart: startOfWeek(selectedDate),
      totalDays: 7,
    };
  }

  const firstOfMonth = new Date(state.year, state.month, 1);
  const lastOfMonth = new Date(state.year, state.month + 1, 0);
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDays(startOfWeek(lastOfMonth), 6);
  const totalDays = Math.round((gridEnd - gridStart) / 86400000) + 1;
  return { gridStart, totalDays };
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
    mark.className = "day-emoji-mark";
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
  queueUndo("day marker");
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

function moveDraggedCalendarTask(targetDateKey) {
  const draggingTask = state.draggingCalendarTask;
  if (!draggingTask || draggingTask.dateKey === targetDateKey) {
    clearCalendarTaskDrag();
    return;
  }

  if (draggingTask.type === "calendar-task") {
    moveCalendarTask(draggingTask.dateKey, draggingTask.noteId, targetDateKey);
  }

  if (draggingTask.type === "goal-task") {
    moveGoalTaskDate(draggingTask.sectionId, draggingTask.goalId, targetDateKey);
  }

  if (draggingTask.type === "info-dump") {
    moveInfoDumpTaskToCalendar(draggingTask.taskId, targetDateKey, { select: false });
  }

  clearCalendarTaskDrag();
}

function clearCalendarTaskDrag() {
  state.draggingCalendarTask = null;
  document.querySelectorAll(".is-task-drop-target").forEach((item) => item.classList.remove("is-task-drop-target"));
  document.querySelectorAll(".is-merge-target").forEach((item) => item.classList.remove("is-merge-target"));
  document.querySelectorAll(".is-task-dragging").forEach((item) => item.classList.remove("is-task-dragging"));
}

function moveCalendarTask(sourceDateKey, noteId, targetDateKey) {
  const sourceNotes = state.data.calendarNotes[sourceDateKey] || [];
  const noteIndex = sourceNotes.findIndex((note) => note.id === noteId);
  if (noteIndex === -1) return;

  queueUndo("calendar task move");
  const [note] = sourceNotes.splice(noteIndex, 1);
  if (!sourceNotes.length) {
    delete state.data.calendarNotes[sourceDateKey];
  } else {
    state.data.calendarNotes[sourceDateKey] = sourceNotes;
  }
  state.data.calendarNotes[targetDateKey] = [...(state.data.calendarNotes[targetDateKey] || []), note];
  moveTaskTimeEntries(sourceDateKey, targetDateKey, noteId);
  if (state.timer.status !== "idle" && state.timer.dateKey === sourceDateKey && state.timer.taskId === noteId) {
    state.timer.dateKey = targetDateKey;
    state.timer.sessionStartedAt = shiftIsoDateToDateKey(state.timer.sessionStartedAt, targetDateKey);
    persistTimerState();
  }
  saveData();
  renderCalendar();
  renderSelectedDateNotes();
}

function shiftIsoDateToDateKey(iso, dateKey) {
  if (!iso) return "";
  const date = new Date(iso);
  const parts = datePartsFromKey(dateKey);
  if (Number.isNaN(date.getTime())) return iso;
  date.setFullYear(parts.year, parts.month - 1, parts.day);
  return date.toISOString();
}

function compareTimeEntriesByClock(a, b) {
  const left = a.startedAt || a.endedAt || "";
  const right = b.startedAt || b.endedAt || "";
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function moveTaskTimeEntries(sourceDateKey, targetDateKey, taskId) {
  const sourceEntries = state.data.timeEntries[sourceDateKey] || [];
  const movingEntries = sourceEntries
    .filter((entry) => entry.taskId === taskId)
    .map((entry) => ({
      ...entry,
      startedAt: shiftIsoDateToDateKey(entry.startedAt, targetDateKey),
      endedAt: shiftIsoDateToDateKey(entry.endedAt, targetDateKey),
    }));
  if (!movingEntries.length) return;

  const remainingEntries = sourceEntries.filter((entry) => entry.taskId !== taskId);
  if (remainingEntries.length) {
    state.data.timeEntries[sourceDateKey] = remainingEntries;
  } else {
    delete state.data.timeEntries[sourceDateKey];
  }

  state.data.timeEntries[targetDateKey] = [
    ...(state.data.timeEntries[targetDateKey] || []),
    ...movingEntries,
  ].sort(compareTimeEntriesByClock);
}

function moveGoalTaskDate(sectionId, goalId, targetDateKey) {
  const section = getAllGoalSections().find((item) => item.id === sectionId);
  const goal = section?.goals.find((item) => item.id === goalId);
  if (!goal || goal.dueDate === targetDateKey) return;

  queueUndo("goal date move");
  goal.dueDate = targetDateKey;
  saveData();
  renderCalendar();
  renderSelectedDateNotes();
  renderGoals();
}

function getGoalsForDate(dateKey) {
  return getAllGoalSections().flatMap((section) =>
    section.goals.filter((goal) => goal.dueDate === dateKey).map((goal) => ({ section, goal })),
  );
}

function makeCalendarGoalTask(goalMatch, variant) {
  const { section, goal } = goalMatch;
  const task = document.createElement("div");
  task.className = variant === "calendar" ? "note-pill calendar-task calendar-goal-task" : "mini-item calendar-task calendar-goal-task";
  task.classList.toggle("is-done", Boolean(goal.done));
  task.addEventListener("click", (event) => event.stopPropagation());
  task.append(makeTaskDragHandle("goal-task", {
    dateKey: goal.dueDate,
    sectionId: section.id,
    goalId: goal.id,
    task,
  }));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(goal.done);
  checkbox.setAttribute("aria-label", "Mark goal complete");
  checkbox.addEventListener("change", () => {
    queueUndo("goal status");
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
      queueUndo("goal deletion");
      goalMatch.section.goals = goalMatch.section.goals.filter((itemGoal) => itemGoal.id !== goal.id);
    } else if (goal.text !== nextText) {
      queueUndo("goal edit");
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

  const handleSubtaskChange = () => {
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
    renderGoals();
  };

  const actions = document.createElement("div");
  actions.className = "calendar-task-actions goal-task-actions";
  actions.append(makeSubtaskAddButton(goal, "goal", handleSubtaskChange), makeGoalTaskDateRemoveButton(section.id, goal.id));

  if (variant === "calendar") {
    task.append(checkbox, input, actions);
  } else {
    const textWrap = document.createElement("div");
    textWrap.className = "task-text-wrap";
    textWrap.append(input, source);

    task.append(checkbox, textWrap, actions);
  }
  task.append(makeSubtaskPanel(goal, "goal", handleSubtaskChange));
  return task;
}

function makeGoalTaskDateRemoveButton(sectionId, goalId) {
  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.setAttribute("aria-label", "Remove goal from this date");
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    removeGoalTaskDate(sectionId, goalId);
  });
  return deleteButton;
}

function removeGoalTaskDate(sectionId, goalId) {
  const section = getAllGoalSections().find((item) => item.id === sectionId);
  const goal = section?.goals.find((item) => item.id === goalId);
  if (!goal || !goal.dueDate) return;

  queueUndo("goal date removal");
  goal.dueDate = "";
  saveData();
  renderCalendar();
  renderSelectedDateNotes();
  renderGoals();
}

function deleteCalendarTask(dateKey, noteId) {
  const notes = state.data.calendarNotes[dateKey] || [];
  if (!notes.some((note) => note.id === noteId)) return;
  queueUndo("calendar task deletion");
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
  if (note.text === nextText) return;
  queueUndo("calendar task edit");
  note.text = nextText;
  saveData();
  renderCalendar();
  if (dateKey === state.selectedDate) {
    renderSelectedDateNotes();
  }
}

function renderInfoDump() {
  els.infoDumpList.innerHTML = "";

  state.data.infoDumpTasks.forEach((task) => {
    els.infoDumpList.append(makeInfoDumpRow(task));
  });
}

function updateInfoDumpTaskText(taskId, text) {
  const task = state.data.infoDumpTasks.find((item) => item.id === taskId);
  if (!task) return;
  const nextText = text.trim();
  if (!nextText) {
    deleteInfoDumpTask(taskId);
    return;
  }
  if (task.text === nextText) return;
  queueUndo("info dump edit");
  task.text = nextText;
  saveData();
  renderInfoDump();
}

function updateInfoDumpTaskDone(taskId, done) {
  const task = state.data.infoDumpTasks.find((item) => item.id === taskId);
  if (!task || task.done === done) return;
  queueUndo("info dump status");
  task.done = done;
  saveData();
  renderInfoDump();
}

function deleteInfoDumpTask(taskId) {
  if (!state.data.infoDumpTasks.some((task) => task.id === taskId)) return;
  queueUndo("info dump deletion");
  state.data.infoDumpTasks = state.data.infoDumpTasks.filter((task) => task.id !== taskId);
  saveData();
  renderInfoDump();
}

function moveInfoDumpTaskToCalendar(taskId, dateKey, { select = true } = {}) {
  const task = state.data.infoDumpTasks.find((item) => item.id === taskId);
  const targetDateKey = normalizeDateInput(dateKey) || state.selectedDate || currentDateKey();
  if (!task || !targetDateKey) return;

  queueUndo("info dump move");
  state.data.calendarNotes[targetDateKey] = [
    ...(state.data.calendarNotes[targetDateKey] || []),
    {
      id: makeId("note"),
      text: task.text,
      done: Boolean(task.done),
      color: "",
      time: "",
      subtasks: [],
    },
  ];
  state.data.infoDumpTasks = state.data.infoDumpTasks.filter((item) => item.id !== taskId);
  if (select) setCalendarDate(targetDateKey);
  saveData();
  renderInfoDump();
  renderCalendar();
  renderSelectedDateNotes();
}

function makeInfoDumpDateControl(task) {
  const control = document.createElement("span");
  control.className = "goal-date-picker-control info-dump-date-control";
  control.addEventListener("click", (event) => event.stopPropagation());

  const button = document.createElement("button");
  button.className = "goal-date-button info-dump-date-button";
  button.type = "button";
  button.textContent = "◷";
  button.title = "Move to calendar";
  button.setAttribute("aria-label", "Move info dump task to calendar date");

  const nativeDateInput = document.createElement("input");
  nativeDateInput.className = "native-picker-input";
  nativeDateInput.type = "date";
  nativeDateInput.tabIndex = -1;
  nativeDateInput.setAttribute("aria-hidden", "true");

  button.addEventListener("click", () => {
    nativeDateInput.value = "";
    openNativePicker(nativeDateInput);
  });
  nativeDateInput.addEventListener("change", () => {
    const nextDateKey = normalizeDateInput(nativeDateInput.value);
    if (!nextDateKey) return;
    moveInfoDumpTaskToCalendar(task.id, nextDateKey);
  });

  control.append(button, nativeDateInput);
  return control;
}

function makeInfoDumpRow(task) {
  const item = document.createElement("div");
  item.className = "mini-item calendar-task info-dump-item";
  item.classList.toggle("is-done", Boolean(task.done));
  item.dataset.infoDumpId = task.id;

  const handleSpacer = makeTaskDragHandle("info-dump", { taskId: task.id, task: item });
  handleSpacer.title = "Drag onto a day";
  handleSpacer.setAttribute("aria-label", "Drag onto a day");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(task.done);
  checkbox.setAttribute("aria-label", "Mark info dump task complete");
  checkbox.addEventListener("change", () => {
    updateInfoDumpTaskDone(task.id, checkbox.checked);
  });

  const text = document.createElement("textarea");
  text.className = "task-text-input info-dump-text-input";
  text.rows = 1;
  text.value = task.text;
  text.setAttribute("aria-label", "Edit info dump task");
  text.addEventListener("input", () => {
    resizeWrappingTextboxSoon(text);
  });
  text.addEventListener("change", () => {
    updateInfoDumpTaskText(task.id, text.value);
  });
  text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      text.blur();
    }
  });

  const actions = document.createElement("div");
  actions.className = "calendar-task-actions info-dump-actions";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.className = "task-delete-button";
  deleteButton.setAttribute("aria-label", "Delete info dump task");
  deleteButton.addEventListener("click", () => {
    deleteInfoDumpTask(task.id);
  });

  const textWrap = document.createElement("div");
  textWrap.className = "task-text-wrap";
  textWrap.append(text);

  actions.append(makeInfoDumpDateControl(task), deleteButton);
  item.append(handleSpacer, checkbox, textWrap, actions);
  enableTaskRowDrag(item, "info-dump", { taskId: task.id, task: item }, text);
  resizeWrappingTextboxSoon(text);
  return item;
}

function canMergeDraggedTaskInto(targetNote) {
  const dragging = state.draggingCalendarTask;
  if (!dragging || dragging.type !== "calendar-task" || !targetNote.specialTaskId) return false;
  if (dragging.noteId === targetNote.id) return false;
  const source = (state.data.calendarNotes[dragging.dateKey] || []).find((note) => note.id === dragging.noteId);
  return Boolean(source) && !source.specialTaskId;
}

function mergeTaskIntoSpecialTask(sourceDateKey, sourceId, targetDateKey, targetId) {
  const sourceNotes = state.data.calendarNotes[sourceDateKey] || [];
  const source = sourceNotes.find((note) => note.id === sourceId);
  const target = (state.data.calendarNotes[targetDateKey] || []).find((note) => note.id === targetId);
  if (!source || !target || source === target || source.specialTaskId || !target.specialTaskId) return;

  queueUndo("task merge");
  const subtask = { id: makeId("subtask"), text: source.text, done: Boolean(source.done) };
  getSubtasks(target).push(subtask, ...getSubtasks(source).map((item) => ({ ...item })));
  target.done = target.subtasks.every((item) => item.done);

  const remainingNotes = sourceNotes.filter((note) => note.id !== sourceId);
  if (remainingNotes.length) {
    state.data.calendarNotes[sourceDateKey] = remainingNotes;
  } else {
    delete state.data.calendarNotes[sourceDateKey];
  }

  // Time already tracked on the merged task follows it as time on the new subtask.
  const sameDay = sourceDateKey === targetDateKey;
  const sourceEntries = state.data.timeEntries[sourceDateKey] || [];
  const movingEntries = sourceEntries.filter((entry) => entry.taskId === sourceId);
  if (movingEntries.length) {
    const keptEntries = sourceEntries.filter((entry) => entry.taskId !== sourceId);
    if (keptEntries.length) {
      state.data.timeEntries[sourceDateKey] = keptEntries;
    } else {
      delete state.data.timeEntries[sourceDateKey];
    }
    state.data.timeEntries[targetDateKey] = [
      ...(state.data.timeEntries[targetDateKey] || []),
      ...movingEntries.map((entry) => ({
        ...entry,
        taskId: target.id,
        taskText: target.text,
        color: target.color,
        subtaskId: entry.subtaskId || subtask.id,
        subtaskText: entry.subtaskId ? entry.subtaskText : source.text,
        startedAt: sameDay ? entry.startedAt : shiftIsoDateToDateKey(entry.startedAt, targetDateKey),
        endedAt: sameDay ? entry.endedAt : shiftIsoDateToDateKey(entry.endedAt, targetDateKey),
      })),
    ].sort(compareTimeEntriesByClock);
  }

  if (state.timer.status !== "idle" && state.timer.dateKey === sourceDateKey && state.timer.taskId === sourceId) {
    state.timer.dateKey = targetDateKey;
    state.timer.taskId = target.id;
    state.timer.taskText = target.text;
    state.timer.color = target.color;
    if (!state.timer.subtaskId) {
      state.timer.subtaskId = subtask.id;
      state.timer.subtaskText = source.text;
    }
    if (!sameDay) state.timer.sessionStartedAt = shiftIsoDateToDateKey(state.timer.sessionStartedAt, targetDateKey);
    persistTimerState();
  }

  saveData();
  renderCalendar();
}

function makeTaskRow(note, dateKey, variant) {
  const isSpecialCalendarTask = variant === "calendar" && Boolean(note.specialTaskId);
  const task = document.createElement("div");
  task.className = variant === "calendar" ? "note-pill calendar-task" : "mini-item calendar-task";
  // Once a task has subtasks, the subtasks carry the tick boxes and the task
  // counts as done when all of them are ticked.
  const hasSubtasks = getSubtasks(note).length > 0;
  const isDone = hasSubtasks ? note.subtasks.every((subtask) => subtask.done) : Boolean(note.done);
  task.classList.toggle("is-special-calendar-task", isSpecialCalendarTask);
  task.classList.toggle("has-subtasks", hasSubtasks);
  task.classList.toggle("is-done", isDone);
  const color = getCalendarTaskColor(note.color);
  task.style.setProperty("--task-color", color.color);
  task.style.setProperty("--task-tint", color.tint);
  task.addEventListener("click", (event) => event.stopPropagation());
  task.append(makeTaskDragHandle("calendar-task", {
    dateKey,
    noteId: note.id,
    task,
  }));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(note.done);
  checkbox.setAttribute("aria-label", "Mark calendar task complete");
  checkbox.addEventListener("change", () => {
    queueUndo("calendar task status");
    note.done = checkbox.checked;
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
  });

  const input = document.createElement("textarea");
  input.className = "task-text-input";
  input.rows = 1;
  input.value = note.text;
  input.title = note.text;
  input.readOnly = isSpecialCalendarTask;
  input.addEventListener("input", () => resizeWrappingTextboxSoon(input));
  input.setAttribute("aria-label", isSpecialCalendarTask ? "Special task name" : "Edit task");
  if (isSpecialCalendarTask) {
    input.title = "Edit this name from the saved special task at the top";
  } else {
    input.addEventListener("change", () => {
      updateCalendarTaskText(dateKey, note.id, input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
  }

  const textWrap = document.createElement("div");
  textWrap.className = "task-text-wrap";
  const timeBadge = document.createElement("span");
  timeBadge.className = "task-time-badge";
  timeBadge.textContent = normalizeTimeValue(note.time);
  timeBadge.hidden = !normalizeTimeValue(note.time);
  textWrap.append(input, timeBadge);

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.addEventListener("click", () => {
    deleteCalendarTask(dateKey, note.id);
  });

  const handleSubtaskChange = () => {
    const subtasks = getSubtasks(note);
    if (subtasks.length) note.done = subtasks.every((subtask) => subtask.done);
    saveData();
    renderCalendar();
    renderSelectedDateNotes();
  };

  const actions = document.createElement("div");
  actions.className = "calendar-task-actions";
  actions.append(makeSubtaskAddButton(note, "calendar task", handleSubtaskChange), deleteButton);

  if (!hasSubtasks) task.append(checkbox);
  task.append(textWrap, actions);
  task.append(makeSubtaskPanel(note, "calendar task", handleSubtaskChange));

  if (note.specialTaskId) {
    // Dropping a plain task here turns it into a subtask of this special task.
    task.addEventListener("dragover", (event) => {
      if (!canMergeDraggedTaskInto(note)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      task.classList.add("is-merge-target");
      task.closest(".day-cell")?.classList.remove("is-task-drop-target");
    });
    task.addEventListener("dragleave", (event) => {
      if (task.contains(event.relatedTarget)) return;
      task.classList.remove("is-merge-target");
    });
    task.addEventListener("drop", (event) => {
      if (!canMergeDraggedTaskInto(note)) return;
      event.preventDefault();
      event.stopPropagation();
      const dragging = state.draggingCalendarTask;
      clearCalendarTaskDrag();
      mergeTaskIntoSpecialTask(dragging.dateKey, dragging.noteId, dateKey, note.id);
    });
  }
  enableTaskRowDrag(task, "calendar-task", { dateKey, noteId: note.id, task }, input);
  resizeWrappingTextboxSoon(input);
  return task;
}

function enableTaskRowDrag(task, type, details, input) {
  task.draggable = true;
  // The coloured strip and the checkbox form the "head" of the row: it is for
  // ticking, not dragging. Dragging starts from the body of the task.
  const strip = task.querySelector(":scope > .task-drag-handle");
  if (strip) {
    strip.draggable = false;
    strip.tabIndex = -1;
    strip.removeAttribute("title");
    strip.removeAttribute("role");
    strip.setAttribute("aria-hidden", "true");
    strip.classList.add("is-static");
  }
  task.addEventListener("pointerdown", (event) => {
    const checkbox = task.querySelector(":scope > input[type='checkbox']");
    const headEnd = checkbox ? checkbox.getBoundingClientRect().right + 4 : 0;
    const blocked = event.clientX <= headEnd
      || event.target.closest(".subtask-panel, .calendar-task-actions, .task-drag-handle, input[type='checkbox']");
    task.draggable = !blocked && document.activeElement !== input;
  });
  task.addEventListener("dragstart", (event) => {
    if (event.target !== task) return;
    // Only calendar days accept these; special task tiles and the timer ignore them.
    state.draggingSpecialTaskId = null;
    state.draggingCalendarTask = { type, ...details };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_TYPE, type);
    window.requestAnimationFrame(() => {
      if (state.draggingCalendarTask) task.classList.add("is-task-dragging");
    });
  });
  task.addEventListener("dragend", clearCalendarTaskDrag);
  if (input && !input.readOnly) {
    task.addEventListener("click", (event) => {
      if (document.activeElement === input || !event.target.closest(".task-text-wrap")) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener("blur", () => {
      task.draggable = true;
    });
  }
}

function makeTaskDragHandle(type, details) {
  const handle = document.createElement("span");
  handle.className = "task-drag-handle";
  handle.draggable = true;
  handle.role = "button";
  handle.tabIndex = 0;
  handle.title = "Drag onto a day";
  handle.setAttribute("aria-label", "Drag task onto a day");
  handle.addEventListener("click", (event) => event.stopPropagation());
  handle.addEventListener("dragstart", (event) => {
    state.draggingCalendarTask = { type, ...details };
    details.task.classList.add("is-task-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_TYPE, type);
  });
  handle.addEventListener("dragend", clearCalendarTaskDrag);
  return handle;
}

function getSubtasks(item) {
  if (!Array.isArray(item.subtasks)) {
    item.subtasks = [];
  }
  return item.subtasks;
}

function makeSubtaskPanel(parent, ownerLabel, afterChange) {
  const panel = document.createElement("div");
  panel.className = "subtask-panel";

  const subtasks = getSubtasks(parent);
  if (subtasks.length) {
    const list = document.createElement("div");
    list.className = "subtask-list";
    subtasks.forEach((subtask) => list.append(makeSubtaskRow(parent, subtask, ownerLabel, afterChange)));
    panel.append(list);
  }

  return panel;
}

function makeSubtaskAddButton(parent, ownerLabel, afterChange) {
  const button = document.createElement("button");
  button.className = "subtask-add-button";
  button.type = "button";
  button.textContent = "+";
  button.setAttribute("aria-label", `Add mini task under ${ownerLabel}`);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const subtasks = getSubtasks(parent);
    const subtask = { id: makeId("subtask"), text: "", done: false };
    queueUndo(`${ownerLabel} mini task`);
    subtasks.push(subtask);
    afterChange();
    window.requestAnimationFrame(() => {
      const input = document.querySelector(`[data-subtask-id="${subtask.id}"] .subtask-text-input`);
      input?.focus();
    });
  });
  return button;
}

function makeSubtaskRow(parent, subtask, ownerLabel, afterChange) {
  const row = document.createElement("div");
  row.className = "subtask-row";
  row.dataset.subtaskId = subtask.id;
  row.classList.toggle("is-done", Boolean(subtask.done));

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(subtask.done);
  checkbox.setAttribute("aria-label", "Mark mini task complete");
  checkbox.addEventListener("change", () => {
    queueUndo(`${ownerLabel} mini task status`);
    subtask.done = checkbox.checked;
    afterChange();
  });

  const input = document.createElement("input");
  input.className = "subtask-text-input";
  input.type = "text";
  input.value = subtask.text;
  input.title = subtask.text;
  input.setAttribute("aria-label", "Edit mini task");
  const commitInput = () => {
    const nextText = input.value.trim();
    const subtasks = getSubtasks(parent);
    if (!subtasks.some((item) => item.id === subtask.id)) return;
    if (!nextText) {
      queueUndo(`${ownerLabel} mini task deletion`);
      parent.subtasks = subtasks.filter((item) => item.id !== subtask.id);
    } else if (subtask.text !== nextText) {
      queueUndo(`${ownerLabel} mini task edit`);
      subtask.text = nextText;
    } else {
      return;
    }
    afterChange();
  };
  input.addEventListener("change", commitInput);
  input.addEventListener("blur", commitInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "subtask-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.setAttribute("aria-label", "Delete mini task");
  deleteButton.addEventListener("click", () => {
    queueUndo(`${ownerLabel} mini task deletion`);
    parent.subtasks = getSubtasks(parent).filter((item) => item.id !== subtask.id);
    afterChange();
  });

  row.append(checkbox, input, deleteButton);
  return row;
}

/* ── Time tracking ── */

function getDayTimeEntries(dateKey) {
  return state.data.timeEntries[dateKey] || [];
}

function addTimeEntry(dateKey, entry) {
  queueUndo("time tracking");
  if (!state.data.timeEntries[dateKey]) state.data.timeEntries[dateKey] = [];
  state.data.timeEntries[dateKey].push(entry);
  saveData();
  renderTimePie();
}

function clearDayTimeEntries() {
  var entries = getDayTimeEntries(state.selectedDate);
  if (!entries.length) return;
  if (!window.confirm("Remove all tracked time for this day?")) return;
  queueUndo("time entry removal");
  delete state.data.timeEntries[state.selectedDate];
  saveData();
  renderTimePie();
}

function readDurationMaskSeconds(hoursInput, minutesInput) {
  var hours = Math.max(0, parseInt(hoursInput.value, 10) || 0);
  var minutes = Math.max(0, Math.min(59, parseInt(minutesInput.value, 10) || 0));
  return hours * 3600 + minutes * 60;
}

function writeDurationMaskSeconds(hoursInput, minutesInput, totalSeconds) {
  var total = Math.max(0, Math.floor(totalSeconds));
  var hours = Math.floor(total / 3600);
  var minutes = Math.round((total % 3600) / 60);
  if (minutes >= 60) {
    minutes = 0;
    hours += 1;
  }
  hoursInput.value = String(hours);
  minutesInput.value = String(minutes);
}

function sanitizeDurationMaskInput(input, max) {
  var digits = input.value.replace(/\D/g, "").slice(0, 2);
  if (digits && Number(digits) > max) digits = String(max);
  input.value = digits;
}

function bindDurationMaskInput(input, max, onChange) {
  input.addEventListener("input", function () {
    sanitizeDurationMaskInput(input, max);
    if (onChange) onChange();
  });
  input.addEventListener("blur", function () {
    input.value = String(Math.max(0, parseInt(input.value, 10) || 0));
  });
}

function getTimerMinutes() {
  const saved = Number(localStorage.getItem(TIMER_MINUTES_KEY));
  if (!Number.isFinite(saved) || saved < minTimerMinutes || saved > maxTimerMinutes) return defaultTimerMinutes;
  return Math.round(saved);
}

function setTimerMinutes(minutes) {
  const next = Math.max(minTimerMinutes, Math.min(maxTimerMinutes, Math.round(minutes)));
  localStorage.setItem(TIMER_MINUTES_KEY, String(next));
  renderTimerPresets();
  renderTimerDisplay();
}

function defaultTimerDurationSeconds() {
  return getTimerMinutes() * 60;
}

function formatCountdown(totalSeconds) {
  var total = Math.max(0, Math.floor(totalSeconds));
  var hours = Math.floor(total / 3600);
  var minutes = Math.floor((total % 3600) / 60);
  var seconds = total % 60;
  if (hours > 0) return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function formatClockTime(iso) {
  if (!iso) return "";
  var date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var period = hours >= 12 ? "PM" : "AM";
  var displayHours = hours % 12 || 12;
  return displayHours + ":" + String(minutes).padStart(2, "0") + " " + period;
}

function formatHoursMinutes(totalSeconds) {
  var total = Math.max(0, Math.floor(totalSeconds));
  var hours = Math.floor(total / 3600);
  var minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return hours + "h " + minutes + "m";
  return minutes + "m";
}

/* Timer engine */

function liveElapsedSeconds() {
  if (state.timer.status === "running" && state.timer.sessionStartEpoch) {
    return Math.floor((Date.now() - state.timer.sessionStartEpoch) / 1000) + state.timer.accumulatedSeconds;
  }
  return state.timer.accumulatedSeconds;
}

function liveRemainingSeconds() {
  return Math.max(0, state.timer.durationSeconds - liveElapsedSeconds());
}

function stopTick() {
  if (state.timer.tickHandle) {
    window.clearInterval(state.timer.tickHandle);
    state.timer.tickHandle = null;
  }
}

function startTimer() {
  if (state.timer.status === "running") return;
  var seconds = defaultTimerDurationSeconds();
  ensureAudioContext();

  var selection = els.timerTaskSelect.value;
  var parts = selection ? selection.split(":") : ["", ""];
  var taskId = parts[0];
  var subtaskId = parts[1] || "";
  var note = taskId ? (state.data.calendarNotes[state.selectedDate] || []).find(function (item) { return item.id === taskId; }) : null;
  var subtask = subtaskId && note ? (note.subtasks || []).find(function (item) { return item.id === subtaskId; }) : null;

  if (state.timer.status === "paused") {
    state.timer.status = "running";
    state.timer.sessionStartEpoch = Date.now();
  } else {
    state.timer.status = "running";
    state.timer.dateKey = state.selectedDate;
    state.timer.taskId = taskId;
    state.timer.subtaskId = subtaskId;
    state.timer.taskText = taskId ? (note ? note.text : "") : timeBreakLabel;
    state.timer.color = note ? note.color : "";
    state.timer.subtaskText = subtask ? subtask.text : "";
    state.timer.durationSeconds = seconds;
    state.timer.accumulatedSeconds = 0;
    state.timer.sessionStartEpoch = Date.now();
    state.timer.sessionStartedAt = new Date().toISOString();
    state.timer.lastDisplayedSecond = -1;
  }

  state.timer.tickHandle = window.setInterval(tickTimer, 250);
  persistTimerState();
  renderTimerControls();
  renderTimerDisplay();
  renderTimePie();
}

function pauseTimer() {
  if (state.timer.status !== "running") return;
  state.timer.accumulatedSeconds = liveElapsedSeconds();
  state.timer.sessionStartEpoch = null;
  state.timer.status = "paused";
  stopTick();
  persistTimerState();
  renderTimerControls();
  renderTimerDisplay();
  renderTimePie();
}

function tickTimer() {
  var remaining = liveRemainingSeconds();
  if (remaining !== state.timer.lastDisplayedSecond) {
    state.timer.lastDisplayedSecond = remaining;
    renderTimerDisplay();
    renderTimePie();
  }
  if (remaining <= 0) finishTimer();
}

function finishTimer() {
  state.timer.accumulatedSeconds = state.timer.durationSeconds;
  stopTimer(true);
  playChime();
}

function endTimerForNavigation() {
  if (state.timer.status === "idle") return;
  stopTimer(true);
}

function continueTimer() {
  var extra = defaultTimerDurationSeconds();
  state.timer.durationSeconds += extra;
  state.timer.status = "running";
  state.timer.sessionStartEpoch = Date.now();
  els.timerDisplay.classList.remove("is-alarm");
  stopAlarm();
  state.timer.tickHandle = window.setInterval(tickTimer, 250);
  persistTimerState();
  renderTimerControls();
  renderTimerDisplay();
  renderTimePie();
}

function adjustTimerDuration(deltaSeconds) {
  if (state.timer.status === "idle") {
    setTimerMinutes(getTimerMinutes() + deltaSeconds / 60);
    return;
  }
  if (state.timer.status !== "running" && state.timer.status !== "paused") return;
  var elapsed = liveElapsedSeconds();
  state.timer.durationSeconds = Math.max(elapsed, state.timer.durationSeconds + deltaSeconds);
  persistTimerState();
  renderTimerDisplay();
}

function confirmStopTimer() {
  if (state.timer.status === "idle") return;
  var elapsed = liveElapsedSeconds();
  if (elapsed <= 0) {
    stopTimer(false);
    return;
  }
  if (state.timer.status === "running") pauseTimer();
  state.timer.confirmStop = true;
  persistTimerState();
  renderTimerControls();
}

function cancelStopConfirm() {
  state.timer.confirmStop = false;
  if (state.timer.status === "paused") {
    state.timer.status = "running";
    state.timer.sessionStartEpoch = Date.now();
    state.timer.tickHandle = window.setInterval(tickTimer, 250);
  }
  persistTimerState();
  renderTimerControls();
  renderTimerDisplay();
}

function saveAndStop() {
  state.timer.confirmStop = false;
  stopTimer(true);
}

function discardAndStop() {
  state.timer.confirmStop = false;
  stopTimer(false);
}

function stopTimer(save) {
  if (state.timer.status === "idle") return;
  stopTick();
  stopAlarm();
  els.timerDisplay.classList.remove("is-alarm");

  var elapsed = state.timer.status === "finished"
    ? state.timer.accumulatedSeconds
    : liveElapsedSeconds();

  if (save && elapsed > 0 && state.timer.dateKey) {
    addTimeEntry(state.timer.dateKey, {
      id: makeId("time"),
      taskId: state.timer.taskId,
      taskText: state.timer.taskText,
      seconds: elapsed,
      color: state.timer.color,
      subtaskId: state.timer.subtaskId,
      subtaskText: state.timer.subtaskText,
      startedAt: state.timer.sessionStartedAt || "",
      endedAt: new Date().toISOString(),
    });
  }

  if (save && elapsed > 0) {
    state.timerFlash = {
      text: elapsed < 60 ? "Saved · under 1m" : "Saved · " + formatHoursMinutes(elapsed),
      until: Date.now() + 4000,
    };
    window.setTimeout(renderTimerDisplay, 4100);
  }

  state.timer.status = "idle";
  state.timer.taskId = "";
  state.timer.subtaskId = "";
  state.timer.taskText = "";
  state.timer.color = "";
  state.timer.durationSeconds = 0;
  state.timer.accumulatedSeconds = 0;
  state.timer.sessionStartEpoch = null;
  state.timer.sessionStartedAt = null;
  state.timer.lastDisplayedSecond = -1;
  state.timer.confirmStop = false;
  clearPersistedTimerState();
  renderTimerControls();
  renderTimerDisplay();
  renderTimePie();
}

/* Alarm */

function ensureAudioContext() {
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!state.timer.audioContext) state.timer.audioContext = new AudioCtx();
  if (state.timer.audioContext.state === "suspended") state.timer.audioContext.resume();
}

function playAlarm() {
  ensureAudioContext();
  var ctx = state.timer.audioContext;
  if (!ctx) return;
  var now = ctx.currentTime;

  function beep(startTime, frequency) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.16);
  }

  for (var burst = 0; burst < 3; burst += 1) {
    for (var i = 0; i < 3; i += 1) {
      beep(now + burst * 0.9 + i * 0.26, burst === 1 ? 660 : 880);
    }
  }
}

function playChime() {
  ensureAudioContext();
  var ctx = state.timer.audioContext;
  if (!ctx) return;
  var now = ctx.currentTime + 0.05;
  [[0, 659.25], [0.22, 880]].forEach(function (note) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = note[1];
    gain.gain.setValueAtTime(0.0001, now + note[0]);
    gain.gain.exponentialRampToValueAtTime(0.22, now + note[0] + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note[0] + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + note[0]);
    osc.stop(now + note[0] + 0.75);
  });
}

function stopAlarm() {
  if (!state.timer.audioContext) return;
  state.timer.audioContext.suspend().catch(function () {});
}

/* Pie chart */

var PIE_RADIUS = 45;
var PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;
var SUBTASK_LIGHTEN_AMOUNT = 0.4;

function lightenHexColor(hex, amount) {
  var match = /^#([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!match) return hex;
  var num = parseInt(match[1], 16);
  var r = (num >> 16) & 255;
  var g = (num >> 8) & 255;
  var b = num & 255;
  r = Math.round(r + (255 - r) * amount);
  g = Math.round(g + (255 - g) * amount);
  b = Math.round(b + (255 - b) * amount);
  return "rgb(" + r + ", " + g + ", " + b + ")";
}

function getDayTimeBuckets(dateKey) {
  var buckets = new Map();

  function addSeconds(taskKey, taskLabel, color, seconds) {
    if (seconds <= 0) return;
    var bucket = buckets.get(taskKey);
    if (!bucket) {
      bucket = { key: taskKey, label: taskLabel, color: color, seconds: 0 };
      buckets.set(taskKey, bucket);
    }
    bucket.seconds += seconds;
  }

  (state.data.timeEntries[dateKey] || []).filter(function (entry) {
    return shouldShowTimerEntry(dateKey, entry);
  }).forEach(function (entry) {
    addSeconds(entry.taskId || "break", entry.taskText || "Untitled", entry.color, entry.seconds);
  });

  if (state.timer.status !== "idle" && state.timer.dateKey === dateKey && isTimerTaskVisible(dateKey, state.timer.taskId)) {
    addSeconds(state.timer.taskId || "break", state.timer.taskText || "Untitled", state.timer.color, liveElapsedSeconds());
  }

  var result = [];
  buckets.forEach(function (bucket) { result.push(bucket); });
  result.sort(function (a, b) { return b.seconds - a.seconds; });
  return result;
}

function getSequentialTimeSegments(dateKey) {
  var entries = getDayTimeEntries(dateKey).filter(function (entry) {
    return shouldShowTimerEntry(dateKey, entry);
  });
  if (state.timer.status !== "idle" && state.timer.dateKey === dateKey && isTimerTaskVisible(dateKey, state.timer.taskId)) {
    entries.push({
      id: "__live__",
      taskId: state.timer.taskId,
      taskText: state.timer.taskText,
      color: state.timer.color,
      subtaskId: state.timer.subtaskId,
      subtaskText: state.timer.subtaskText,
      seconds: liveElapsedSeconds(),
      startedAt: state.timer.sessionStartedAt || "",
    });
  }
  return entries.filter(function (entry) { return entry.seconds > 0; }).map(function (entry) {
    var taskKey = entry.taskId || "break";
    var label = entry.taskId ? entry.taskText : timeBreakLabel;
    if (entry.subtaskId && entry.subtaskText) label += " — " + entry.subtaskText;
    return {
      key: entry.id,
      taskKey: taskKey,
      label: label,
      color: entry.color,
      seconds: entry.seconds,
      isSubtask: !!entry.subtaskId,
      startedAt: entry.startedAt || "",
      endedAt: entry.endedAt || "",
    };
  });
}

function isTimerTaskVisible(dateKey, taskId) {
  if (!taskId) return true;
  return getTimerSelectableTasks(dateKey).some(function (note) {
    return note.id === taskId;
  });
}

function shouldShowTimerEntry(dateKey, entry) {
  return isTimerTaskVisible(dateKey, entry.taskId);
}

function renderTimeBar(buckets, total) {
  els.timeBar.innerHTML = "";
  els.timeBar.classList.toggle("is-empty", total <= 0);

  buckets.forEach(function (bucket) {
    var label = bucket.key === "break" ? timeBreakLabel : bucket.label;
    var segment = document.createElement("span");
    segment.className = "time-bar-segment";
    segment.style.flexGrow = String(bucket.seconds);
    segment.style.background = bucket.key === "break" ? breakTrackColor.color : getCalendarTaskColor(bucket.color).color;
    segment.title = label + " · " + formatHoursMinutes(bucket.seconds);
    els.timeBar.append(segment);
  });

  els.timeChartTotal.textContent = formatHoursMinutes(total);
  if (total > 0) {
    var labelText = buckets.map(function (bucket) {
      var label = bucket.key === "break" ? timeBreakLabel : bucket.label;
      return label + " " + formatHoursMinutes(bucket.seconds);
    }).join(", ");
    els.timeBar.setAttribute("aria-label", "Tracked time: " + labelText);
  } else {
    els.timeBar.setAttribute("aria-label", "No time tracked");
  }
}

var timeSequenceOutsideHandler = null;

function renderTimeSequenceList(dateKey) {
  if (timeSequenceOutsideHandler) {
    document.removeEventListener("mousedown", timeSequenceOutsideHandler);
    timeSequenceOutsideHandler = null;
  }

  var segments = getSequentialTimeSegments(dateKey);
  els.timeSequenceList.innerHTML = "";

  if (!segments.length && !state.historyAddOpen) {
    var hint = document.createElement("span");
    hint.className = "time-legend-hint";
    hint.textContent = "No time tracked yet";
    els.timeSequenceList.append(hint);
  }

  segments.forEach(function (segment) {
    els.timeSequenceList.append(makeSequenceRow(segment));
  });

  els.timeSequenceList.append(makeHistoryAddRow());

  if (state.editingSequenceEntryId) {
    timeSequenceOutsideHandler = function (event) {
      if (!state.editingSequenceEntryId) return;
      var row = els.timeSequenceList.querySelector(".time-legend-item.time-legend-edit-row");
      if (!row || row.contains(event.target)) return;
      var mask = row.querySelector(".duration-mask");
      var inputs = mask.querySelectorAll("input");
      saveSequenceEntryEdit(state.editingSequenceEntryId, inputs[0], inputs[1], mask, true);
    };
    document.addEventListener("mousedown", timeSequenceOutsideHandler);
  }
}

function makeHistoryAddRow() {
  if (state.historyAddOpen) {
    var row = document.createElement("div");
    row.className = "time-legend-item time-legend-add-row is-editing";

    var select = document.createElement("select");
    select.setAttribute("aria-label", "Task to add tracked time for");
    populateTaskSelectOptions(select);

    var durationMask = document.createElement("div");
    durationMask.className = "duration-mask time-legend-duration";
    var hoursInput = document.createElement("input");
    hoursInput.type = "text";
    hoursInput.inputMode = "numeric";
    hoursInput.maxLength = 2;
    hoursInput.setAttribute("aria-label", "Hours");
    var hoursUnit = document.createElement("span");
    hoursUnit.className = "duration-mask-unit";
    hoursUnit.textContent = "h";
    var minutesInput = document.createElement("input");
    minutesInput.type = "text";
    minutesInput.inputMode = "numeric";
    minutesInput.maxLength = 2;
    minutesInput.setAttribute("aria-label", "Minutes");
    var minutesUnit = document.createElement("span");
    minutesUnit.className = "duration-mask-unit";
    minutesUnit.textContent = "m";
    hoursInput.value = "0";
    minutesInput.value = "0";
    bindDurationMaskInput(hoursInput, 99, function () { durationMask.classList.remove("is-invalid"); });
    bindDurationMaskInput(minutesInput, 59, function () { durationMask.classList.remove("is-invalid"); });
    durationMask.append(hoursInput, hoursUnit, minutesInput, minutesUnit);

    var confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "time-legend-edit";
    confirmButton.textContent = "✓";
    confirmButton.setAttribute("aria-label", "Confirm add time");
    confirmButton.addEventListener("click", function () {
      var seconds = readDurationMaskSeconds(hoursInput, minutesInput);
      if (seconds <= 0 || !select.value) {
        durationMask.classList.add("is-invalid");
        return;
      }
      durationMask.classList.remove("is-invalid");

      var selection = select.value;
      var parts = selection ? selection.split(":") : ["", ""];
      var taskId = parts[0];
      var subtaskId = parts[1] || "";
      var note = taskId ? (state.data.calendarNotes[state.selectedDate] || []).find(function (item) { return item.id === taskId; }) : null;
      var subtask = subtaskId && note ? (note.subtasks || []).find(function (item) { return item.id === subtaskId; }) : null;

      state.historyAddOpen = false;

      addTimeEntry(state.selectedDate, {
        id: makeId("time"),
        taskId: taskId,
        taskText: taskId ? (note ? note.text : "") : timeBreakLabel,
        seconds: seconds,
        color: note ? note.color : "",
        subtaskId: subtaskId,
        subtaskText: subtask ? subtask.text : "",
        startedAt: "",
        endedAt: new Date().toISOString(),
      });
    });

    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "time-legend-delete";
    cancelButton.textContent = "×";
    cancelButton.setAttribute("aria-label", "Cancel adding time");
    cancelButton.addEventListener("click", function () {
      state.historyAddOpen = false;
      renderTimePie();
    });

    row.append(select, durationMask, confirmButton, cancelButton);
    return row;
  }

  var addButton = document.createElement("button");
  addButton.className = "time-legend-inline-add";
  addButton.type = "button";
  addButton.textContent = "+";
  addButton.setAttribute("aria-label", "Add tracked time");
  addButton.addEventListener("click", function () {
    state.editingSequenceEntryId = null;
    state.historyAddOpen = true;
    renderTimePie();
  });

  var wrapper = document.createElement("div");
  wrapper.className = "time-legend-item time-legend-add-wrapper";
  wrapper.append(addButton);
  return wrapper;
}

function makeSequenceRow(segment) {
  var isLive = segment.key === "__live__";
  var item = document.createElement("div");
  item.className = "time-legend-item";

  var swatch = document.createElement("span");
  swatch.className = "time-legend-swatch";
  var baseColor = segment.taskKey === "break" ? breakTrackColor.color : getCalendarTaskColor(segment.color).color;
  swatch.style.background = segment.isSubtask ? lightenHexColor(baseColor, SUBTASK_LIGHTEN_AMOUNT) : baseColor;

  var label = document.createElement("span");
  label.className = "time-legend-label";
  label.textContent = segment.label;
  label.title = segment.label;

  if (!isLive && state.editingSequenceEntryId === segment.key) {
    item.classList.add("is-editing", "time-legend-edit-row");

    var durationMask = document.createElement("div");
    durationMask.className = "duration-mask time-legend-duration";
    var hoursInput = document.createElement("input");
    hoursInput.type = "text";
    hoursInput.inputMode = "numeric";
    hoursInput.maxLength = 2;
    hoursInput.setAttribute("aria-label", "Hours for " + segment.label);
    var hoursUnit = document.createElement("span");
    hoursUnit.className = "duration-mask-unit";
    hoursUnit.textContent = "h";
    var minutesInput = document.createElement("input");
    minutesInput.type = "text";
    minutesInput.inputMode = "numeric";
    minutesInput.maxLength = 2;
    minutesInput.setAttribute("aria-label", "Minutes for " + segment.label);
    var minutesUnit = document.createElement("span");
    minutesUnit.className = "duration-mask-unit";
    minutesUnit.textContent = "m";
    writeDurationMaskSeconds(hoursInput, minutesInput, segment.seconds);
    bindDurationMaskInput(hoursInput, 99, function () { durationMask.classList.remove("is-invalid"); });
    bindDurationMaskInput(minutesInput, 59, function () { durationMask.classList.remove("is-invalid"); });
    durationMask.append(hoursInput, hoursUnit, minutesInput, minutesUnit);

    hoursInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") saveSequenceEntryEdit(segment.key, hoursInput, minutesInput, durationMask);
    });
    minutesInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") saveSequenceEntryEdit(segment.key, hoursInput, minutesInput, durationMask);
    });

    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "time-legend-delete";
    cancelButton.textContent = "×";
    cancelButton.setAttribute("aria-label", "Cancel editing " + segment.label);
    cancelButton.addEventListener("click", function () {
      state.editingSequenceEntryId = null;
      renderTimeSequenceList(state.selectedDate);
    });

    item.append(swatch, label, durationMask, cancelButton);
    return item;
  }

  var timeText = document.createElement("span");
  timeText.className = "time-legend-seconds";
  timeText.textContent = formatHoursMinutes(segment.seconds);

  var clockText = document.createElement("span");
  clockText.className = "time-legend-time";
  clockText.textContent = formatClockTime(segment.startedAt || segment.endedAt);

  item.append(clockText, swatch, label, timeText);

  if (!isLive) {
    var editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "time-legend-edit";
    editButton.textContent = "✎";
    editButton.setAttribute("aria-label", "Edit time for " + segment.label);
    editButton.addEventListener("click", function () {
      state.editingSequenceEntryId = segment.key;
      renderTimeSequenceList(state.selectedDate);
    });

    var deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "time-legend-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "Delete time for " + segment.label);
    deleteButton.addEventListener("click", function () {
      deleteSequenceEntry(segment.key);
    });

    item.append(editButton, deleteButton);
  }

  return item;
}

function updateTimeEntrySeconds(dateKey, entryId, seconds) {
  state.data.timeEntries[dateKey] = getDayTimeEntries(dateKey).map(function (entry) {
    if (entry.id !== entryId) return entry;
    var updated = Object.assign({}, entry, { seconds: seconds, endedAt: new Date().toISOString() });
    return updated;
  });
}

function removeTimeEntryById(dateKey, entryId) {
  var entries = getDayTimeEntries(dateKey).filter(function (entry) { return entry.id !== entryId; });
  if (entries.length) {
    state.data.timeEntries[dateKey] = entries;
  } else {
    delete state.data.timeEntries[dateKey];
  }
}

function saveSequenceEntryEdit(entryId, hoursInput, minutesInput, durationMask, deferRender) {
  if (!entryId || state.editingSequenceEntryId !== entryId) return;
  var seconds = readDurationMaskSeconds(hoursInput, minutesInput);
  if (seconds <= 0) {
    durationMask.classList.add("is-invalid");
    return;
  }
  queueUndo("time entry edit");
  updateTimeEntrySeconds(state.selectedDate, entryId, seconds);
  state.editingSequenceEntryId = null;
  saveData();
  if (deferRender) {
    // Let the click that triggered this land first (e.g. the edit button of
    // another row), then re-render.
    setTimeout(renderTimePie, 0);
  } else {
    renderTimePie();
  }
}

function deleteSequenceEntry(entryId) {
  queueUndo("time entry removal");
  removeTimeEntryById(state.selectedDate, entryId);
  saveData();
  renderTimePie();
}

function renderTimePie() {
  var buckets = getDayTimeBuckets(state.selectedDate);
  var total = buckets.reduce(function (sum, bucket) { return sum + bucket.seconds; }, 0);
  els.timeTodayLabel.textContent = state.selectedDate === currentDateKey()
    ? "Tracked today"
    : "Tracked · " + parseDateKey(state.selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (state.timeChartMode === "sequence") {
    renderTimeSequenceList(state.selectedDate);
  } else {
    renderTimeBar(buckets, total);
  }

  renderTimeLegend(buckets);
}

function setTimeChartMode(mode) {
  state.timeChartMode = mode;
  state.editingSequenceEntryId = null;
  state.historyAddOpen = false;
  if (timeSequenceOutsideHandler) {
    document.removeEventListener("mousedown", timeSequenceOutsideHandler);
    timeSequenceOutsideHandler = null;
  }
  els.timeChartArea.hidden = mode !== "merged";
  els.timerSession.hidden = mode !== "merged";
  els.timeSequenceList.hidden = mode !== "sequence";
  els.timeChartModeMergedButton.classList.toggle("is-active", mode === "merged");
  els.timeChartModeSequenceButton.classList.toggle("is-active", mode === "sequence");
  renderTimePie();
}

function renderTimeLegend(buckets) {
  els.timeLegend.innerHTML = "";

  if (!buckets.length) {
    var hint = document.createElement("span");
    hint.className = "time-legend-hint";
    hint.textContent = "No time tracked yet";
    els.timeLegend.append(hint);
    return;
  }

  buckets.forEach(function (bucket) {
    els.timeLegend.append(makeTimeLegendRow(bucket, false));
  });
}

function makeTimeLegendRow(bucket, isLive) {
  var item = document.createElement("div");
  item.className = "time-legend-item";

  var swatch = document.createElement("span");
  swatch.className = "time-legend-swatch";
  swatch.style.background = bucket.key === "break" ? breakTrackColor.color : getCalendarTaskColor(bucket.color).color;
  var label = document.createElement("span");
  label.className = "time-legend-label";
  label.textContent = bucket.key === "break" ? timeBreakLabel : bucket.label;
  label.title = label.textContent;

  var timeText = document.createElement("span");
  timeText.className = "time-legend-seconds";
  timeText.textContent = formatHoursMinutes(bucket.seconds);

  item.append(swatch, label, timeText);
  return item;
}

function setTimePanelView(view) {
  state.timePanelView = view;
  els.timeLegend.hidden = false;
  els.timerSession.hidden = false;
}

/* Task selector */

function getTimerSelectableTasks(dateKey = state.selectedDate) {
  return sortedCalendarTasks(state.data.calendarNotes[dateKey] || []);
}

function getTimerSelectableTaskCount(dateKey = state.selectedDate) {
  return getTimerSelectableTasks(dateKey).length;
}

function populateTaskSelectOptions(selectEl, includeNoTask) {
  var tasks = getTimerSelectableTasks(state.selectedDate);
  if (includeNoTask) {
    selectEl.append(makeOption("", timeBreakLabel));
  } else if (!tasks.length) {
    var empty = makeOption("", emptyTimerTaskLabel);
    empty.disabled = true;
    empty.selected = true;
    selectEl.append(empty);
    return 0;
  }

  tasks.forEach(function (note) {
    selectEl.append(makeOption(note.id, note.text));
    (note.subtasks || []).forEach(function (subtask) {
      selectEl.append(makeOption(note.id + ":" + subtask.id, "— " + subtask.text));
    });
  });
  return tasks.length;
}

function renderTimerTaskSelect() {
  var isActive = state.timer.status !== "idle";
  var previousValue = isActive ? "" : els.timerTaskSelect.value;
  els.timerTaskSelect.innerHTML = "";
  populateTaskSelectOptions(els.timerTaskSelect, true);

  if (isActive) {
    var activeValue = state.timer.taskId
      ? state.timer.taskId + (state.timer.subtaskId ? ":" + state.timer.subtaskId : "")
      : "";
    if (activeValue && state.timer.dateKey === state.selectedDate && !els.timerTaskSelect.querySelector("option[value=\"" + activeValue + "\"]")) {
      var activeLabel = state.timer.subtaskText ? "— " + state.timer.subtaskText : state.timer.taskText;
      els.timerTaskSelect.append(makeOption(activeValue, activeLabel));
    }
    els.timerTaskSelect.value = activeValue;
  } else if (previousValue && els.timerTaskSelect.querySelector("option[value=\"" + previousValue + "\"]")) {
    els.timerTaskSelect.value = previousValue;
  }
  els.timerTaskSelect.disabled = isActive;
}

/* Control renderers */

var TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 52;

function getTimerIdleSelection() {
  var parts = (els.timerTaskSelect.value || "").split(":");
  var note = parts[0]
    ? (state.data.calendarNotes[state.selectedDate] || []).find(function (item) { return item.id === parts[0]; })
    : null;
  var subtask = note && parts[1]
    ? (note.subtasks || []).find(function (item) { return item.id === parts[1]; })
    : null;
  return { note: note || null, subtask: subtask || null };
}

function renderTimerDisplay() {
  var status = state.timer.status;
  var idle = status === "idle";
  var duration = idle ? defaultTimerDurationSeconds() : state.timer.durationSeconds;
  var remaining = idle ? duration : liveRemainingSeconds();
  var fraction = duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0;
  var selection = idle ? getTimerIdleSelection() : null;
  var colorId = idle ? (selection.note ? selection.note.color : "") : state.timer.color;
  var taskLabel = idle
    ? (selection.subtask ? selection.subtask.text : selection.note ? selection.note.text : "")
    : (state.timer.subtaskText || state.timer.taskText || "");
  if (!taskLabel) taskLabel = timeBreakLabel;

  els.timerTimeText.textContent = formatCountdown(remaining);
  els.timerRingProgress.style.strokeDasharray = String(TIMER_RING_CIRCUMFERENCE);
  els.timerRingProgress.style.strokeDashoffset = String(TIMER_RING_CIRCUMFERENCE * (1 - fraction));
  els.timerDisplay.dataset.status = status;
  els.timePanel.style.setProperty(
    "--timer-color",
    normalizeCalendarTaskColor(colorId) ? getCalendarTaskColor(colorId).color : "var(--green)",
  );
  els.timerRingTask.textContent = taskLabel;
  els.timerRingTask.title = taskLabel;

  var flash = state.timerFlash && state.timerFlash.until > Date.now() ? state.timerFlash.text : "";
  els.timerRingSub.textContent = {
    idle: flash || "Ready",
    running: "Focusing",
    paused: "Paused",
    finished: "Time is up",
  }[status];

  els.timerStatusText.textContent = {
    idle: "Timer idle",
    running: "Timer running — " + formatCountdown(remaining) + " remaining",
    paused: "Timer paused",
    finished: "Time is up",
  }[status];

  document.title = status === "running" || status === "paused"
    ? formatCountdown(remaining) + (status === "paused" ? " (paused)" : "") + (taskLabel ? " · " + taskLabel : "") + " — " + baseDocumentTitle
    : baseDocumentTitle;
}

function renderTimerPresets() {
  var current = getTimerMinutes();
  var idle = state.timer.status === "idle";
  els.timerPresets.innerHTML = "";
  timerPresetMinutes.forEach(function (minutes) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "timer-preset";
    button.classList.toggle("is-active", idle && minutes === current);
    button.textContent = minutes + "m";
    button.disabled = !idle;
    button.setAttribute("aria-label", minutes + " minute session");
    button.addEventListener("click", function () { setTimerMinutes(minutes); });
    els.timerPresets.append(button);
  });
}

function renderTimerTaskChips() {
  var active = state.timer.status !== "idle";
  var notes = state.data.calendarNotes[state.selectedDate] || [];
  var options = Array.from(els.timerTaskSelect.options).filter(function (option) {
    return !option.disabled;
  });
  els.timerTaskChips.innerHTML = "";

  options.forEach(function (option) {
    var parts = option.value.split(":");
    var note = notes.find(function (item) { return item.id === parts[0]; });
    var color = getCalendarTaskColor(note ? note.color : state.timer.color);
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "timer-task-chip";
    chip.classList.toggle("is-subtask", Boolean(parts[1]));
    chip.classList.toggle("is-no-task", !option.value);
    chip.classList.toggle("is-active", option.value === els.timerTaskSelect.value);
    chip.style.setProperty("--task-color", color.color);
    chip.style.setProperty("--task-tint", color.tint);
    chip.disabled = active;
    chip.setAttribute("aria-pressed", option.value === els.timerTaskSelect.value ? "true" : "false");
    var dot = document.createElement("span");
    dot.className = "timer-task-chip-dot";
    dot.setAttribute("aria-hidden", "true");
    var text = document.createElement("span");
    text.className = "timer-task-chip-text";
    text.textContent = option.textContent.replace(/^— /, "");
    chip.title = text.textContent;
    chip.append(dot, text);
    chip.addEventListener("click", function () {
      els.timerTaskSelect.value = option.value;
      renderTimerTaskChips();
      renderTimerDisplay();
    });
    els.timerTaskChips.append(chip);
  });

  if (options.length <= 1) {
    var hint = document.createElement("span");
    hint.className = "timer-task-empty";
    hint.textContent = "No tasks on this day";
    els.timerTaskChips.append(hint);
  }
}

function renderTimerControls() {
  var status = state.timer.status;
  var confirming = state.timer.confirmStop;
  els.timerStartButton.hidden = confirming || status === "running" || status === "finished";
  els.timerStartButton.textContent = status === "paused" ? "Resume" : "Start";
  els.timerPauseButton.hidden = confirming || status !== "running";
  els.timerStopButton.hidden = confirming || status === "idle" || status === "finished";
  els.timerFinishedControls.hidden = confirming || status !== "finished";
  els.timerSubtractButton.disabled = confirming || status === "finished";
  els.timerAddButton.disabled = confirming || status === "finished";
  els.timerStopConfirm.hidden = !confirming;
  els.clearTimeEntriesButton.hidden = !getDayTimeEntries(state.selectedDate).length;
  renderTimerTaskSelect();
  renderTimerTaskChips();
  renderTimerPresets();
  els.timerStartButton.disabled = false;
  if (confirming) {
    els.timerStatusText.textContent = "Confirm stop — " + formatHoursMinutes(liveElapsedSeconds()) + " tracked";
  }
}

function renderSelectedDateNotes() {
  els.selectedDatePicker.value = state.selectedDate;
  renderSelectedDayHeading();
  renderEmojiPalette();
  els.selectedDateNotes.innerHTML = "";
  const notes = sortedCalendarTasks(state.data.calendarNotes[state.selectedDate] || []);

  notes.forEach((note) => {
    els.selectedDateNotes.append(makeTaskRow(note, state.selectedDate, "selected"));
  });
  getGoalsForDate(state.selectedDate).forEach((goalMatch) => {
    els.selectedDateNotes.append(makeCalendarGoalTask(goalMatch, "selected"));
  });

  renderTimerControls();
  renderTimePie();
  renderTimerDisplay();
}

function renderJournalLabelOptions(selectedLabel = els.journalLabel.value) {
  const labels = state.data.journalLabels;
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

function makeOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
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
  state.data.journalEntryCollapsed = false;
  state.editingJournalId = entry.id;
  els.journalCity.value = entry.city || "";
  els.journalDate.value = entry.date || currentDateKey();
  els.journalTime.value = normalizeTimeValue(entry.time) || currentTimeValue();
  els.journalDatePicker.value = els.journalDate.value;
  els.journalLabel.value = getEntryLabel(entry);
  els.journalText.value = entry.text || "";
  els.journalSubmitButton.textContent = "Update entry";
  els.cancelJournalEditButton.hidden = false;
  resizeJournalFormText();
  saveData();
  applyJournalLayout();
  window.scrollTo({ top: els.journalForm.offsetTop - 24, behavior: "smooth" });
}

function deleteJournalEntry(entryId) {
  if (!state.data.journalEntries.some((item) => item.id === entryId)) return;
  queueUndo("journal entry deletion");
  state.data.journalEntries = state.data.journalEntries.filter((item) => item.id !== entryId);
  if (state.editingJournalId === entryId) {
    resetJournalForm();
  }
  saveData();
  renderJournal();
}

function filteredJournalEntries() {
  return sortedJournalEntries(state.data.journalEntries.filter((entry) => {
    const dateMatches = !state.journalFilters.date || entry.date === state.journalFilters.date;
    const entryDate = entry.date ? parseDateKey(entry.date) : null;
    const monthMatches =
      !state.journalFilters.month || (entryDate && String(entryDate.getMonth() + 1) === state.journalFilters.month);
    const yearMatches = !state.journalFilters.year || (entryDate && String(entryDate.getFullYear()) === state.journalFilters.year);
    const labelMatches = !state.journalFilters.label || getEntryLabel(entry) === state.journalFilters.label;
    return dateMatches && monthMatches && yearMatches && labelMatches;
  }));
}

function renderGoals() {
  els.goalSections.innerHTML = "";
  renderGoalGroupTabs();
  const sections = getGoalSections();

  if (!sections.length) {
    els.goalSections.append(makeGoalSectionAddButton());
    resizeAllGoalTextboxesSoon();
    return;
  }

  sections.forEach((section) => {
    const fragment = els.goalSectionTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".goal-section");
    const sectionHeader = fragment.querySelector("header");
    const sectionDragHandle = fragment.querySelector(".goal-section-drag-handle");
    const titleInput = fragment.querySelector(".section-title-input");
    const sectionMoveMenu = fragment.querySelector(".goal-section-move-menu");
    const deleteSectionButton = fragment.querySelector("[data-action='delete-section']");
    const goalForm = fragment.querySelector(".goal-form");
    const goalInput = goalForm.querySelector("input");
    const goalList = fragment.querySelector(".goal-list");

    card.dataset.sectionId = section.id;
    const paperColor = getGoalPaperColor(section.color);
    card.style.setProperty("--goal-paper-bg", paperColor.tint);
    card.style.setProperty("--goal-paper-accent", paperColor.color);
    sectionDragHandle.draggable = true;
    titleInput.value = section.title;
    titleInput.spellcheck = false;
    requestAnimationFrame(() => resizeWrappingTextbox(titleInput));
    sectionHeader.insertBefore(makeGoalSectionColorMenu(section), sectionMoveMenu);

    const moveTargets = state.data.goalGroups.filter((group) => group.id !== state.data.activeGoalGroupId);
    sectionMoveMenu.hidden = !moveTargets.length;
    if (moveTargets.length) {
      const moveSummary = document.createElement("summary");
      moveSummary.textContent = "->";
      moveSummary.setAttribute("aria-label", "Move goal box");

      const moveItems = document.createElement("div");
      moveItems.className = "goal-section-move-items";
      const moveLabel = document.createElement("span");
      moveLabel.className = "goal-section-move-label";
      moveLabel.textContent = "Move to";
      moveItems.append(moveLabel);

      moveTargets.forEach((group) => {
        const moveButton = document.createElement("button");
        moveButton.type = "button";
        moveButton.textContent = group.title || defaultGoalGroupName;
        moveButton.addEventListener("click", () => {
          sectionMoveMenu.open = false;
          moveGoalSectionToGroup(section.id, group.id);
        });
        moveItems.append(moveButton);
      });

      sectionMoveMenu.append(moveSummary, moveItems);
    }

    sectionDragHandle.addEventListener("dragstart", (event) => {
      state.draggingGoalSectionId = section.id;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(DRAG_DATA_TYPE, section.id);
    });
    sectionDragHandle.addEventListener("dragend", () => {
      state.draggingGoalSectionId = null;
      card.classList.remove("is-dragging");
      els.goalSections.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    });
    card.addEventListener("dragover", (event) => {
      if (state.draggingGoalItem) {
        event.preventDefault();
        card.classList.add("is-goal-item-drop-target");
        goalList.classList.add("is-goal-list-drop-target");
        return;
      }
      if (!state.draggingGoalSectionId || state.draggingGoalSectionId === section.id) return;
      event.preventDefault();
      card.classList.add("is-drop-target");
    });
    card.addEventListener("dragleave", (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      card.classList.remove("is-drop-target");
      card.classList.remove("is-goal-item-drop-target");
      goalList.classList.remove("is-goal-list-drop-target");
    });
    card.addEventListener("drop", (event) => {
      if (state.draggingGoalItem) {
        event.preventDefault();
        event.stopPropagation();
        card.classList.remove("is-goal-item-drop-target");
        goalList.classList.remove("is-goal-list-drop-target");
        moveGoalToSection(state.draggingGoalItem.sectionId, state.draggingGoalItem.goalId, section.id);
        clearGoalItemDrag();
        return;
      }
      event.preventDefault();
      card.classList.remove("is-drop-target");
      moveGoalSection(event.dataTransfer.getData(DRAG_DATA_TYPE) || state.draggingGoalSectionId, section.id);
    });

    titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        titleInput.blur();
      }
      if (event.key === "Escape") {
        titleInput.value = section.title;
        resizeWrappingTextbox(titleInput);
        titleInput.blur();
      }
    });
    titleInput.addEventListener("input", () => {
      if (titleInput.value.length > 48) {
        titleInput.value = titleInput.value.slice(0, 48);
        titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
      }
      resizeWrappingTextbox(titleInput);
    });
    titleInput.addEventListener("blur", () => {
      const clean = titleInput.value.replace(/\s+/g, " ").trim().slice(0, 48) || "Untitled";
      titleInput.value = clean;
      resizeWrappingTextbox(titleInput);
      if (clean === section.title) return;
      queueUndo("goal section title");
      section.title = clean;
      saveData();
    });

    deleteSectionButton.addEventListener("click", () => {
      queueUndo("goal section deletion");
      getActiveGoalGroup().sections = sections.filter((item) => item.id !== section.id);
      saveData();
      renderGoals();
    });

    goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = goalInput.value.trim();
      if (!text) return;
      queueUndo("goal");
      section.goals.push({ id: makeId("goal"), text, done: false, dueDate: "", subtasks: [] });
      goalInput.value = "";
      saveData();
      renderGoals();
      renderCalendar();
      els.goalSections.querySelector(`[data-section-id="${section.id}"] .goal-form input`)?.focus();
    });

    goalList.addEventListener("dragover", (event) => {
      const dragging = state.draggingGoalItem;
      if (!dragging) return;
      event.preventDefault();
      card.classList.add("is-goal-item-drop-target");
      goalList.classList.add("is-goal-list-drop-target");
    });
    goalList.addEventListener("dragleave", (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      goalList.classList.remove("is-goal-list-drop-target");
    });
    goalList.addEventListener("drop", (event) => {
      const dragging = state.draggingGoalItem;
      if (!dragging) return;
      event.preventDefault();
      event.stopPropagation();
      card.classList.remove("is-goal-item-drop-target");
      goalList.classList.remove("is-goal-list-drop-target");
      moveGoalToSection(dragging.sectionId, dragging.goalId, section.id);
      clearGoalItemDrag();
    });

    if (section.goals.length) {
      section.goals.forEach((goal) => goalList.append(renderGoalItem(section, goal)));
    }

    els.goalSections.append(card);
  });

  els.goalSections.append(makeGoalSectionAddButton());
  resizeAllGoalTextboxesSoon();
}

function makeGoalSectionColorMenu(section) {
  const color = getGoalPaperColor(section.color);
  const menu = document.createElement("details");
  menu.className = "goal-section-color-menu color-menu";
  menu.style.setProperty("--goal-paper-accent", color.color);

  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", "Change goal box color");
  summary.title = "Change goal box color";
  summary.style.setProperty("--menu-color", color.color);
  summary.style.setProperty("--menu-tint", color.tint);
  const summarySwatch = document.createElement("span");
  summarySwatch.className = "color-menu-current";
  summarySwatch.setAttribute("aria-hidden", "true");
  summary.append(summarySwatch);

  const items = document.createElement("div");
  items.className = "goal-section-color-items color-menu-items";
  const grid = document.createElement("div");
  grid.className = "goal-section-color-grid color-menu-grid";

  goalPaperColors.forEach((paperColor) => {
    const button = makeColorOptionButton({
      name: paperColor.name,
      color: paperColor.color,
      tint: paperColor.tint,
      active: paperColor.id === normalizeGoalSectionColor(section.color),
      ariaLabel: `Set ${paperColor.name} goal box color`,
      onClick: () => {
        menu.open = false;
        updateGoalSectionColor(section.id, paperColor.id);
      },
    });
    button.classList.add("goal-section-color");
    grid.append(button);
  });

  items.append(makeColorMenuLabel(), grid);
  menu.append(summary, items);
  return menu;
}

function makeGoalSectionAddButton() {
  const button = document.createElement("button");
  button.className = "goal-section-add";
  button.type = "button";
  button.textContent = "+";
  button.setAttribute("aria-label", "Add goal box");
  button.addEventListener("click", addGoalSectionFromButton);
  return button;
}

function moveCaretToEnd(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function resizeWrappingTextbox(input) {
  const measuredHeight = measureWrappingTextboxHeight(input);
  input.style.height = `${measuredHeight}px`;
}

function measureWrappingTextboxHeight(input) {
  const fallbackHeight = () => {
    input.style.height = "0px";
    return input.scrollHeight + 2;
  };

  if (input.tagName !== "TEXTAREA" || !input.ownerDocument?.body || !input.clientWidth) {
    return fallbackHeight();
  }

  const styles = window.getComputedStyle(input);
  const mirror = input.ownerDocument.createElement("div");
  mirror.textContent = input.value || " ";
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.zIndex = "-1";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.width = `${input.clientWidth}px`;
  mirror.style.minHeight = "0";
  mirror.style.maxHeight = "none";
  mirror.style.height = "auto";
  mirror.style.padding = styles.padding;
  mirror.style.border = styles.border;
  mirror.style.boxSizing = styles.boxSizing;
  mirror.style.font = styles.font;
  mirror.style.lineHeight = styles.lineHeight;
  mirror.style.letterSpacing = styles.letterSpacing;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "anywhere";
  mirror.style.wordBreak = "break-word";
  input.ownerDocument.body.append(mirror);

  const minHeight = Number.parseFloat(styles.minHeight) || 0;
  const height = Math.max(minHeight, Math.ceil(mirror.scrollHeight) + 2);
  mirror.remove();
  return height;
}

function resizeWrappingTextboxSoon(input) {
  resizeWrappingTextbox(input);
  window.requestAnimationFrame(() => resizeWrappingTextbox(input));
}

function resizeGoalGroupName(input) {
  const styles = window.getComputedStyle(input);
  const measure = input.ownerDocument.createElement("span");
  measure.textContent = input.value || " ";
  measure.style.position = "absolute";
  measure.style.visibility = "hidden";
  measure.style.pointerEvents = "none";
  measure.style.whiteSpace = "nowrap";
  measure.style.font = styles.font;
  measure.style.letterSpacing = styles.letterSpacing;
  input.ownerDocument.body.append(measure);

  const horizontalPadding =
    Number.parseFloat(styles.paddingLeft || "0") + Number.parseFloat(styles.paddingRight || "0");
  const nextWidth = Math.min(Math.max(Math.ceil(measure.scrollWidth + horizontalPadding + 2), 128), 310);
  measure.remove();

  input.style.width = `${nextWidth}px`;
  resizeWrappingTextbox(input);
}

function resizeGoalGroupNameSoon(input) {
  resizeGoalGroupName(input);
  window.requestAnimationFrame(() => resizeGoalGroupName(input));
}

function resizeAllGoalTextboxesSoon() {
  window.requestAnimationFrame(() => {
    document.querySelectorAll(".goal-text-input, .section-title-input").forEach(resizeWrappingTextboxSoon);
  });
}

function enableDoubleClickInputEdit(input, { trigger = input, onUnlock } = {}) {
  const lock = () => {
    input.readOnly = true;
    input.classList.remove("is-editing");
    input.classList.add("is-locked-edit");
  };
  const unlock = () => {
    input.readOnly = false;
    input.classList.add("is-editing");
    input.classList.remove("is-locked-edit");
    input.focus();
    input.setSelectionRange?.(input.value.length, input.value.length);
    onUnlock?.();
  };

  lock();

  trigger.addEventListener("dblclick", (event) => {
    if (event.target.closest("button, [data-no-edit='true']")) return;
    event.stopPropagation();
    unlock();
  });
  input.addEventListener("blur", lock);
}

function renderGoalGroupTabs() {
  ensureGoalGroups();
  els.goalGroupTabs.innerHTML = "";

  state.data.goalGroups.forEach((group) => {
    const tab = document.createElement("div");
    tab.className = "goal-group-tab";
    tab.classList.toggle("is-active", group.id === state.data.activeGoalGroupId);
    tab.dataset.groupId = group.id;

    const dragHandle = document.createElement("span");
    dragHandle.className = "goal-group-drag-handle";
    dragHandle.draggable = true;
    dragHandle.role = "button";
    dragHandle.tabIndex = 0;
    dragHandle.dataset.noEdit = "true";
    dragHandle.setAttribute("aria-label", `Move ${group.title} goal area`);
    dragHandle.addEventListener("click", (event) => event.stopPropagation());
    dragHandle.addEventListener("dragstart", (event) => {
      state.draggingGoalGroupId = group.id;
      tab.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(DRAG_DATA_TYPE, group.id);
    });
    dragHandle.addEventListener("dragend", clearGoalGroupDrag);
    tab.addEventListener("dragover", (event) => {
      if (!state.draggingGoalGroupId || state.draggingGoalGroupId === group.id) return;
      event.preventDefault();
      tab.classList.add("is-drop-target");
    });
    tab.addEventListener("dragleave", () => {
      tab.classList.remove("is-drop-target");
    });
    tab.addEventListener("drop", (event) => {
      event.preventDefault();
      tab.classList.remove("is-drop-target");
      moveGoalGroup(event.dataTransfer.getData(DRAG_DATA_TYPE) || state.draggingGoalGroupId, group.id);
      clearGoalGroupDrag();
    });

    const input = document.createElement("textarea");
    input.className = "goal-group-name";
    input.rows = 1;
    input.spellcheck = false;
    input.maxLength = 36;
    input.value = group.title;
    input.setAttribute("aria-label", `Goal area name: ${group.title}`);
    enableDoubleClickInputEdit(input, { trigger: tab, onUnlock: () => resizeGoalGroupName(input) });

    const activateGroup = () => {
      if (group.id === state.data.activeGoalGroupId) return false;
      state.data.activeGoalGroupId = group.id;
      saveData();
      renderGoals();
      return true;
    };

    tab.addEventListener("click", (event) => {
      if (event.target.closest("button, [data-no-edit='true']")) return;
      if (!activateGroup()) {
        input.focus();
      }
    });
    input.addEventListener("focus", activateGroup);
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") {
        input.value = group.title;
        resizeGoalGroupName(input);
        input.blur();
      }
    });
    input.addEventListener("input", () => {
      resizeGoalGroupName(input);
    });
    input.addEventListener("blur", () => {
      const clean = input.value.replace(/\s+/g, " ").trim().slice(0, 36) || defaultGoalGroupName;
      input.value = clean;
      resizeGoalGroupName(input);
      if (clean === group.title) return;
      queueUndo("goal area rename");
      group.title = clean;
      saveData();
      renderGoalGroupTabs();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "goal-group-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `Delete ${group.title} goal area`);
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteActiveGoalGroup(group.id);
    });

    tab.append(dragHandle, input, deleteButton);
    els.goalGroupTabs.append(tab);
    resizeGoalGroupNameSoon(input);
  });

  const addButton = document.createElement("button");
  addButton.className = "goal-group-add";
  addButton.type = "button";
  addButton.textContent = "+";
  addButton.setAttribute("aria-label", "Add goal area");
  addButton.addEventListener("click", addGoalGroup);
  els.goalGroupTabs.append(addButton);
}

function renderGoalItem(section, goal) {
  // A goal is a plain bullet line: text you can edit, reorder, or remove.
  const item = document.createElement("li");
  item.className = "goal-item";
  item.dataset.goalId = goal.id;

  const removeGoal = () => {
    if (!section.goals.includes(goal)) return;
    queueUndo("goal deletion");
    section.goals = section.goals.filter((itemGoal) => itemGoal.id !== goal.id);
    saveData();
    item.remove();
    renderCalendar();
  };

  const bullet = document.createElement("span");
  bullet.className = "goal-bullet";
  bullet.draggable = true;
  bullet.title = "Drag to reorder";
  bullet.setAttribute("aria-hidden", "true");
  bullet.addEventListener("dragstart", (event) => {
    state.draggingGoalItem = { sectionId: section.id, goalId: goal.id };
    item.classList.add("is-goal-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_DATA_TYPE, goal.id);
    event.dataTransfer.setDragImage(item, 8, 12);
  });
  bullet.addEventListener("dragend", clearGoalItemDrag);

  item.addEventListener("dragover", (event) => {
    const dragging = state.draggingGoalItem;
    if (!dragging || dragging.goalId === goal.id) return;
    event.preventDefault();
    item.classList.add("is-goal-drop-target");
  });
  item.addEventListener("dragleave", () => {
    item.classList.remove("is-goal-drop-target");
  });
  item.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    item.classList.remove("is-goal-drop-target");
    const draggedId = event.dataTransfer.getData(DRAG_DATA_TYPE) || state.draggingGoalItem?.goalId;
    moveGoalToSection(state.draggingGoalItem?.sectionId, draggedId, section.id, goal.id);
    clearGoalItemDrag();
  });

  const text = document.createElement("textarea");
  text.className = "goal-text-input";
  text.rows = 1;
  text.value = goal.text;
  text.setAttribute("aria-label", "Edit goal");
  text.addEventListener("input", () => {
    resizeWrappingTextboxSoon(text);
  });
  // Enter finishes the line. Backspace at the start joins with the line above,
  // and the arrow keys move between lines.
  let restructuring = false;
  const restructure = (label, change, focusGoalId, focusPosition) => {
    restructuring = true;
    queueUndo(label);
    change();
    saveData();
    renderGoals();
    renderCalendar();
    focusGoalText(section.id, focusGoalId, focusPosition);
  };

  text.addEventListener("change", () => {
    if (restructuring) return;
    const nextText = text.value.trim();
    if (nextText && goal.text !== nextText) {
      queueUndo("goal edit");
      goal.text = nextText;
      saveData();
      renderCalendar();
    }
  });
  text.addEventListener("blur", () => {
    if (restructuring) return;
    if (!text.value.trim()) {
      removeGoal();
    } else if (text.value !== goal.text) {
      text.value = goal.text;
      resizeWrappingTextboxSoon(text);
    }
  });
  text.addEventListener("keydown", (event) => {
    const caretStart = text.selectionStart;
    const caretEnd = text.selectionEnd;
    const index = section.goals.indexOf(goal);

    if (event.key === "Enter") {
      event.preventDefault();
      text.blur();
      return;
    }

    if (event.key === "Backspace" && caretStart === 0 && caretEnd === 0) {
      const previous = section.goals[index - 1];
      const current = text.value.trim();
      if (!previous) {
        if (!current) {
          event.preventDefault();
          const next = section.goals[index + 1];
          restructure("goal deletion", () => {
            section.goals.splice(index, 1);
          }, next ? next.id : "", 0);
        }
        return;
      }
      event.preventDefault();
      const joinAt = previous.text.length + (current && previous.text ? 1 : 0);
      restructure("goal edit", () => {
        previous.text = [previous.text, current].filter(Boolean).join(" ");
        section.goals.splice(index, 1);
      }, previous.id, current ? joinAt : "end");
      return;
    }

    if (event.key === "ArrowUp" && caretStart === 0 && caretEnd === 0) {
      const target = item.previousElementSibling?.querySelector(".goal-text-input");
      if (!target) return;
      event.preventDefault();
      target.focus();
      target.setSelectionRange(target.value.length, target.value.length);
    }

    if (event.key === "ArrowDown" && caretStart === text.value.length && caretEnd === text.value.length) {
      const target = item.nextElementSibling?.querySelector(".goal-text-input");
      if (!target) return;
      event.preventDefault();
      target.focus();
      target.setSelectionRange(0, 0);
    }
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "×";
  deleteButton.className = "goal-delete-button";
  deleteButton.title = "Remove";
  deleteButton.setAttribute("aria-label", "Delete goal");
  deleteButton.addEventListener("click", () => {
    restructuring = true;
    removeGoal();
    renderSelectedDateNotes();
  });

  item.append(bullet, text, deleteButton);
  resizeWrappingTextboxSoon(text);
  return item;
}

function focusGoalText(sectionId, goalId, position) {
  if (!goalId) return;
  const input = els.goalSections.querySelector(
    `[data-section-id="${sectionId}"] [data-goal-id="${goalId}"] .goal-text-input`,
  );
  if (!input) return;
  input.focus();
  const caret = position === "end" ? input.value.length : Math.min(position, input.value.length);
  input.setSelectionRange(caret, caret);
}

function moveGoalToSection(sourceSectionId, draggedId, targetSectionId, targetId = "") {
  if (!sourceSectionId || !draggedId || !targetSectionId || draggedId === targetId) return;
  const sourceLocation = findGoalSectionLocation(sourceSectionId);
  const targetLocation = findGoalSectionLocation(targetSectionId);
  if (!sourceLocation || !targetLocation) return;

  const fromIndex = sourceLocation.section.goals.findIndex((itemGoal) => itemGoal.id === draggedId);
  if (fromIndex === -1) return;

  queueUndo(sourceSectionId === targetSectionId ? "goal order" : "goal box move");
  const [movedGoal] = sourceLocation.section.goals.splice(fromIndex, 1);
  let toIndex = targetLocation.section.goals.length;
  if (targetId) {
    toIndex = targetLocation.section.goals.findIndex((itemGoal) => itemGoal.id === targetId);
    if (toIndex === -1) {
      toIndex = targetLocation.section.goals.length;
    }
  }
  targetLocation.section.goals.splice(toIndex, 0, movedGoal);
  saveData();
  renderGoals();
  renderCalendar();
  renderSelectedDateNotes();
}

function clearGoalItemDrag() {
  state.draggingGoalItem = null;
  els.goalSections.querySelectorAll(".is-goal-dragging, .is-goal-drop-target, .is-goal-list-drop-target, .is-goal-item-drop-target").forEach((item) => {
    item.classList.remove("is-goal-dragging", "is-goal-drop-target", "is-goal-list-drop-target", "is-goal-item-drop-target");
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

  if (!state.data.journalEntries.length) {
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

      const menu = makeJournalEntryMenu(entry);
      entryHead.append(timeLine, menu);
      entryBlock.append(entryHead);

      const text = makeEditableJournalText(entry);
      entryBlock.append(text);
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
    saveData();
    resizeJournalText(text);
  });
  text.addEventListener("blur", () => {
    editUndoQueued = false;
    savedText = entry.text || "";
  });
  text.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      text.blur();
    }
  });
  requestAnimationFrame(() => resizeJournalText(text));
  return text;
}

function resizeJournalText(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizeJournalFormText() {
  resizeJournalText(els.journalText);
}

function resizeAllJournalTexts() {
  els.journalLog.querySelectorAll(".journal-entry-text").forEach(resizeJournalText);
}

function groupJournalEntries(entries) {
  const groups = new Map();

  entries.forEach((entry) => {
    const location = entry.city || "";
    const date = entry.date || "";
    const key = `${location}\u0000${date}`;
    if (!groups.has(key)) {
      groups.set(key, { location, date, entries: [] });
    }
    groups.get(key).entries.push(entry);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: sortedJournalEntries(group.entries),
    }))
    .sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || "");
      if (dateCompare) return dateCompare;
      const entryCompare = compareEntryDateTime(a.entries[0] || {}, b.entries[0] || {});
      if (entryCompare) return entryCompare;
      return (a.location || "").localeCompare(b.location || "");
    });
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

function emptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

init();
