// GEA1000 Study Companion
const app = document.getElementById('app');

// ── State ──────────────────────────────────────────────
let questions = [];
let currentTest = [];
let userAnswers = {};
let currentChapter = null;

// ── Helpers ────────────────────────────────────────────
function render(html) { app.innerHTML = html; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Mistake tracking (localStorage) ────────────────────
const MISTAKES_KEY = 'gea1000_mistakes';

function getMistakes() {
  return JSON.parse(localStorage.getItem(MISTAKES_KEY) || '{}');
}

function saveMistakes(mistakes) {
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
}

function recordMistakes(wrongIds) {
  const mistakes = getMistakes();
  wrongIds.forEach(id => { mistakes[id] = (mistakes[id] || 0) + 1; });
  saveMistakes(mistakes);
}

function clearMistake(id) {
  const mistakes = getMistakes();
  if (mistakes[id]) {
    mistakes[id]--;
    if (mistakes[id] <= 0) delete mistakes[id];
  }
  saveMistakes(mistakes);
}

// ── Homepage ────────────────────────────────────────────
const CHAPTERS = [
  { num: 1, emoji: '📊', title: 'Chapter 1', topic: 'Study Design' },
  { num: 2, emoji: '📈', title: 'Chapter 2', topic: 'Data & Rates' },
  { num: 3, emoji: '📉', title: 'Chapter 3', topic: 'Descriptive Stats' },
  { num: 4, emoji: '🎲', title: 'Chapter 4', topic: 'Probability' },
];

function showHome() {
  const mistakes = getMistakes();
  const mistakeCount = Object.keys(mistakes).length;

  render(`
    <div class="home-header">
      <h1>GEA1000 Study Companion</h1>
      <p>Quantitative Reasoning with Data</p>
    </div>

    <div class="chapter-grid">
      ${CHAPTERS.map(ch => `
        <div class="chapter-card" onclick="startTest(${ch.num})">
          <div class="emoji">${ch.emoji}</div>
          <h3>${ch.title}</h3>
          <p>${ch.topic}</p>
        </div>
      `).join('')}
    </div>

    <button class="btn btn-primary full-test-btn" onclick="startTest(null)">
      🎯 Full Mixed Test — All Chapters
    </button>

    ${mistakeCount > 0 ? `
      <button class="btn btn-danger full-test-btn" style="margin-top:10px" onclick="startRetry()">
        🔁 Retry Mistakes (${mistakeCount} question${mistakeCount > 1 ? 's' : ''})
      </button>
    ` : ''}
  `);
}

// ── Stubs (implemented in later tasks) ─────────────────
function startTest(chapter) { render(`<p>startTest(${chapter}) — coming in Task 4</p>`); }
function startRetry()       { render(`<p>startRetry — coming in Task 4</p>`); }

// ── Boot ────────────────────────────────────────────────
async function boot() {
  const res = await fetch('questions.json');
  questions = await res.json();
  showHome();
}

boot();
