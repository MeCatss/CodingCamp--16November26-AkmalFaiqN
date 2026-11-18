// =============================================
// LIFE DASHBOARD — app.js
// =============================================

// ── Helpers ──────────────────────────────────
const $ = (id) => document.getElementById(id);
const CIRCUMFERENCE = 2 * Math.PI * 54; // matches r=54 in SVG

// ── Storage Keys ─────────────────────────────
const KEY_THEME  = 'ld_theme';
const KEY_NAME   = 'ld_name';
const KEY_TASKS  = 'ld_tasks';
const KEY_LINKS  = 'ld_links';
const KEY_WORK   = 'ld_work_min';
const KEY_BREAK  = 'ld_break_min';

// =============================================
// THEME
// =============================================
const html       = document.documentElement;
const themeBtn   = $('themeToggle');
const themeIcon  = $('themeIcon');

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(KEY_THEME, theme);
}

themeBtn.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

applyTheme(localStorage.getItem(KEY_THEME) || 'dark');

// =============================================
// CLOCK & GREETING
// =============================================
const clockEl    = $('clock');
const dateEl     = $('date');
const greetEl    = $('greetingText');
const userNameEl = $('userName');

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning, ';
  if (hour >= 12 && hour < 18) return 'Good Afternoon, ';
  if (hour >= 18 && hour < 22) return 'Good Evening, ';
  return 'Good Night, ';
}

function updateClock() {
  const now    = new Date();
  const h      = String(now.getHours()).padStart(2, '0');
  const m      = String(now.getMinutes()).padStart(2, '0');
  const s      = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${h}:${m}:${s}`;

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  greetEl.textContent = getGreeting(now.getHours());
}

setInterval(updateClock, 1000);
updateClock();

// ── Editable Name ────────────────────────────
userNameEl.textContent = localStorage.getItem(KEY_NAME) || 'Player';

userNameEl.addEventListener('click', () => {
  userNameEl.contentEditable = 'true';
  userNameEl.classList.add('editing');
  userNameEl.focus();

  // select all text
  const range = document.createRange();
  range.selectNodeContents(userNameEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});

userNameEl.addEventListener('blur', saveName);
userNameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); userNameEl.blur(); }
});

function saveName() {
  userNameEl.contentEditable = 'false';
  userNameEl.classList.remove('editing');
  const name = userNameEl.textContent.trim() || 'Player';
  userNameEl.textContent = name;
  localStorage.setItem(KEY_NAME, name);
}

// =============================================
// FOCUS TIMER
// =============================================
const workInput   = $('workMinutes');
const breakInput  = $('breakMinutes');
const timerLabel  = $('timerLabel');
const timerDisp   = $('timerDisplay');
const ringProg    = $('ringProgress');
const startBtn    = $('startBtn');
const stopBtn     = $('stopBtn');
const resetBtn    = $('resetBtn');

let timerInterval  = null;
let isRunning      = false;
let isBreak        = false;
let totalSeconds   = 0;
let remainSeconds  = 0;

ringProg.style.strokeDasharray  = CIRCUMFERENCE;
ringProg.style.strokeDashoffset = 0;

function getWorkSec()  { return (parseInt(workInput.value)  || 25) * 60; }
function getBreakSec() { return (parseInt(breakInput.value) || 5)  * 60; }

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateRing() {
  const progress = remainSeconds / totalSeconds;
  ringProg.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  isBreak   = false;
  totalSeconds  = getWorkSec();
  remainSeconds = totalSeconds;
  timerLabel.textContent = 'FOCUS';
  timerDisp.textContent  = formatTime(remainSeconds);
  ringProg.style.strokeDashoffset = 0;
}

function tick() {
  if (remainSeconds <= 0) {
    clearInterval(timerInterval);
    isRunning = false;

    if (!isBreak) {
      isBreak = true;
      totalSeconds  = getBreakSec();
      remainSeconds = totalSeconds;
      timerLabel.textContent = 'BREAK';
      timerDisp.textContent  = formatTime(remainSeconds);
      ringProg.style.strokeDashoffset = 0;
      timerInterval = setInterval(tick, 1000);
      isRunning = true;
    } else {
      resetTimer();
    }
    return;
  }
  remainSeconds--;
  timerDisp.textContent = formatTime(remainSeconds);
  updateRing();
}

startBtn.addEventListener('click', () => {
  if (isRunning) return;
  if (remainSeconds === 0) resetTimer();
  isRunning     = true;
  timerInterval = setInterval(tick, 1000);
});

stopBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  isRunning = false;
});

resetBtn.addEventListener('click', resetTimer);

// Persist & restore timer settings
workInput.value  = localStorage.getItem(KEY_WORK)  || 25;
breakInput.value = localStorage.getItem(KEY_BREAK) || 5;
workInput.addEventListener('change',  () => { localStorage.setItem(KEY_WORK,  workInput.value);  if (!isRunning) resetTimer(); });
breakInput.addEventListener('change', () => { localStorage.setItem(KEY_BREAK, breakInput.value); });

resetTimer();

// =============================================
// TO-DO LIST
// =============================================
const taskModal      = $('taskModal');
const taskModalTitle = $('taskModalTitle');
const taskInput      = $('taskInput');
const taskUrgency    = $('taskUrgency');
const taskDuplicate  = $('taskDuplicate');
const saveTaskBtn    = $('saveTaskBtn');
const cancelTaskBtn  = $('cancelTaskBtn');
const openTaskModal  = $('openTaskModal');
const taskList       = $('taskList');

let tasks       = JSON.parse(localStorage.getItem(KEY_TASKS) || '[]');
let editingId   = null;

const URGENCY_ORDER = { high: 0, med: 1, low: 2 };

function saveTasks() {
  localStorage.setItem(KEY_TASKS, JSON.stringify(tasks));
}

function renderTasks() {
  const sorted = [...tasks].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  taskList.innerHTML = '';
  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    li.innerHTML = `
      <input type="checkbox" class="task-check" ${task.done ? 'checked' : ''} />
      <span class="task-name">${escapeHtml(task.name)}</span>
      <span class="urgency-tag ${task.urgency}">${task.urgency === 'med' ? 'Med' : task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}</span>
      <div class="task-actions">
        <button class="btn-edit" title="Edit">✏️</button>
        <button class="btn-delete" title="Delete">🗑️</button>
      </div>
    `;

    li.querySelector('.task-check').addEventListener('change', () => toggleDone(task.id));
    li.querySelector('.btn-edit').addEventListener('click', () => startEditTask(task.id, li));
    li.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));

    taskList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function startEditTask(id, li) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;

  editingId = id;
  taskModalTitle.textContent = 'Edit Task';
  taskInput.value     = t.name;
  taskUrgency.value   = t.urgency;
  taskDuplicate.checked = t.allowDuplicate;
  taskModal.classList.add('open');
}

openTaskModal.addEventListener('click', () => {
  editingId = null;
  taskModalTitle.textContent = 'Add Task';
  taskInput.value       = '';
  taskUrgency.value     = 'med';
  taskDuplicate.checked = false;
  taskModal.classList.add('open');
  taskInput.focus();
});

cancelTaskBtn.addEventListener('click', () => {
  taskModal.classList.remove('open');
  editingId = null;
});

saveTaskBtn.addEventListener('click', () => {
  const name      = taskInput.value.trim();
  const urgency   = taskUrgency.value;
  const allowDup  = taskDuplicate.checked;

  if (!name) { taskInput.focus(); return; }

  if (editingId) {
    // Edit existing
    const t = tasks.find(t => t.id === editingId);
    if (t) { t.name = name; t.urgency = urgency; t.allowDuplicate = allowDup; }
  } else {
    // Check duplicate
    if (!allowDup) {
      const exists = tasks.some(t => t.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        alert(`"${name}" already exists. Enable "Allow duplicates" to add it again.`);
        return;
      }
    }
    tasks.push({
      id: Date.now(),
      name,
      urgency,
      allowDuplicate: allowDup,
      done: false
    });
  }

  saveTasks();
  renderTasks();
  taskModal.classList.remove('open');
  editingId = null;
});

// Close modal on backdrop click
taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal) { taskModal.classList.remove('open'); editingId = null; }
});

renderTasks();

// =============================================
// QUICK LINKS
// =============================================
const linkModal     = $('linkModal');
const linkName      = $('linkName');
const linkUrl       = $('linkUrl');
const saveLinkBtn   = $('saveLinkBtn');
const cancelLinkBtn = $('cancelLinkBtn');
const openLinkModal = $('openLinkModal');
const linksGrid     = $('linksGrid');

let links = JSON.parse(localStorage.getItem(KEY_LINKS) || '[]');

function saveLinks() {
  localStorage.setItem(KEY_LINKS, JSON.stringify(links));
}

function renderLinks() {
  linksGrid.innerHTML = '';
  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'link-item';
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.innerHTML = `
      <span class="link-label">${escapeHtml(link.name)}</span>
      <button class="link-delete" title="Remove">✕</button>
    `;
    a.querySelector('.link-delete').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      links = links.filter(l => l.id !== link.id);
      saveLinks();
      renderLinks();
    });
    linksGrid.appendChild(a);
  });
}

openLinkModal.addEventListener('click', () => {
  linkName.value = '';
  linkUrl.value  = '';
  linkModal.classList.add('open');
  linkName.focus();
});

cancelLinkBtn.addEventListener('click', () => linkModal.classList.remove('open'));

saveLinkBtn.addEventListener('click', () => {
  const name = linkName.value.trim();
  let   url  = linkUrl.value.trim();

  if (!name || !url) { return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  links.push({ id: Date.now(), name, url });
  saveLinks();
  renderLinks();
  linkModal.classList.remove('open');
});

linkModal.addEventListener('click', (e) => {
  if (e.target === linkModal) linkModal.classList.remove('open');
});

renderLinks();
