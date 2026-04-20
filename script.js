// GEA1000 / ME2015 Study Companion
const app = document.getElementById('app');

// ── State ──────────────────────────────────────────────
let questions      = [];
let currentTest    = [];
let userAnswers    = {};
let currentChapter = null;
let currentModule  = null;   // 'gea1000' | 'me2015'

// ── Module config ───────────────────────────────────────
const MODULES = {
  gea1000: {
    name:        'GEA1000',
    subtitle:    'Quantitative Reasoning with Data',
    emoji:       '📊',
    file:        'questions_gea1000.json',
    mistakesKey: 'gea1000_mistakes',
    fullTest:    { mcq: 10, short: 2 },
    chapterTest: { mcq: 4,  short: 1 },
    chapters: [
      { num: 1, emoji: '🔬', title: 'Chapter 1', topic: 'Study Design' },
      { num: 2, emoji: '📈', title: 'Chapter 2', topic: 'Data & Rates' },
      { num: 3, emoji: '📉', title: 'Chapter 3', topic: 'Descriptive Stats' },
      { num: 4, emoji: '🎲', title: 'Chapter 4', topic: 'Probability' },
    ],
  },
  me2015: {
    name:        'ME2015',
    subtitle:    'Electrical Engineering',
    emoji:       '⚡',
    file:        'questions_me2015.json',
    mistakesKey: 'me2015_mistakes',
    fullTest:    { mcq: 10, short: 2 },
    chapterTest: { mcq: 3,  short: 1 },
    chapters: [
      { num: 1,  emoji: '🔌', title: 'Chapter 1',  topic: 'Circuits I — KVL & KCL' },
      { num: 2,  emoji: '⚡', title: 'Chapter 2',  topic: 'Circuits II — Series & Parallel' },
      { num: 3,  emoji: '🔋', title: 'Chapter 3',  topic: 'Thevenin & Norton' },
      { num: 4,  emoji: '📡', title: 'Chapter 4',  topic: 'Sensors' },
      { num: 5,  emoji: '🌀', title: 'Chapter 5',  topic: 'Capacitors & Inductors' },
      { num: 6,  emoji: '🔧', title: 'Chapter 6',  topic: 'Op-Amps' },
      { num: 7,  emoji: '🧲', title: 'Chapter 7',  topic: 'Magnetic Fields' },
      { num: 8,  emoji: '⚙️', title: 'Chapter 8',  topic: 'DC Motors' },
      { num: 9,  emoji: '〰️', title: 'Chapter 9',  topic: 'AC Signals & Power' },
      { num: 10, emoji: '🔄', title: 'Chapter 10', topic: 'AC Motors' },
    ],
  },
};

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

function mod() { return MODULES[currentModule]; }

// ── Mistake tracking (localStorage) ────────────────────
function getMistakes() {
  return JSON.parse(localStorage.getItem(mod().mistakesKey) || '{}');
}
function saveMistakes(mistakes) {
  localStorage.setItem(mod().mistakesKey, JSON.stringify(mistakes));
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

// ── Module selector (landing page) ─────────────────────
function showModuleSelect() {
  render(`
    <div class="home-header">
      <h1>Study Companion</h1>
      <p>Select your module to begin</p>
    </div>

    <div class="module-grid">
      ${Object.entries(MODULES).map(([key, m]) => `
        <div class="module-card" onclick="loadModule('${key}')">
          <div class="emoji">${m.emoji}</div>
          <h3>${m.name}</h3>
          <p>${m.subtitle}</p>
        </div>
      `).join('')}
    </div>
  `);
}

// ── Load a module (fetch questions then show home) ──────
async function loadModule(moduleKey) {
  currentModule = moduleKey;
  const m = mod();
  try {
    const res = await fetch(m.file);
    questions = await res.json();
    showHome();
  } catch (e) {
    render(`<p style="color:var(--red)">Failed to load ${m.file}. Make sure the file exists.</p>`);
  }
}

// ── Homepage ────────────────────────────────────────────
function showHome() {
  const m = mod();
  const mistakes     = getMistakes();
  const mistakeCount = Object.keys(mistakes).length;

  render(`
    <div class="home-header">
      <button class="btn btn-secondary back-btn" onclick="showModuleSelect()">← Modules</button>
      <h1>${m.emoji} ${m.name}</h1>
      <p>${m.subtitle}</p>
    </div>

    <div class="chapter-grid">
      ${m.chapters.map(ch => `
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

// ── Test builder ─────────────────────────────────────────
function buildTest(chapter) {
  const m = mod();
  let pool;

  if (chapter === 'retry') {
    const mistakes = getMistakes();
    pool = questions.filter(q => mistakes[q.id]);
  } else if (chapter === null) {
    pool = questions;
  } else {
    pool = questions.filter(q => q.chapter === chapter);
  }

  const mcq   = shuffle(pool.filter(q => q.type === 'mcq'));
  const short = shuffle(pool.filter(q => q.type === 'short'));

  if (chapter === null) {
    return [...mcq.slice(0, m.fullTest.mcq), ...short.slice(0, m.fullTest.short)];
  } else if (chapter === 'retry') {
    return [...mcq, ...short];
  } else {
    return [...mcq.slice(0, m.chapterTest.mcq), ...short.slice(0, m.chapterTest.short)];
  }
}

// ── Quiz screen ───────────────────────────────────────────
function startTest(chapter) {
  currentChapter = chapter;
  currentTest    = buildTest(chapter);
  userAnswers    = {};
  showQuiz();
}

function startRetry() {
  currentChapter = 'retry';
  currentTest    = buildTest('retry');
  userAnswers    = {};
  showQuiz();
}

function recordAnswer(id, value) {
  userAnswers[id] = value;
  document.querySelectorAll(`[data-qid="${id}"] .option-label`).forEach(el => {
    el.classList.toggle('selected', el.dataset.val === value);
  });
}

function renderQuestion(q, index) {
  const bodyHtml = q.type === 'mcq'
    ? `<div class="options">
        ${q.options.map(opt => {
          const letter = opt[0];
          return `<label class="option-label" data-val="${letter}"
                         onclick="recordAnswer('${q.id}','${letter}')">
                    <input type="radio" name="q_${q.id}" value="${letter}" />
                    ${opt}
                  </label>`;
        }).join('')}
       </div>`
    : `<div class="short-answer">
        <textarea placeholder="Type your answer here…"
                  oninput="recordAnswer('${q.id}', this.value)"></textarea>
       </div>`;

  const typeTag = q.type === 'mcq' ? 'MCQ' : 'Short Answer';
  return `
    <div class="question-block" data-qid="${q.id}">
      <div class="q-label">Q${index + 1} &middot; ${typeTag}</div>
      <p class="q-text">${q.question}</p>
      ${bodyHtml}
    </div>`;
}

function showQuiz() {
  const label = currentChapter === null    ? 'Full Mixed Test'
              : currentChapter === 'retry' ? 'Retry Mistakes'
              : `Chapter ${currentChapter} Test`;

  render(`
    <div class="quiz-header">
      <button class="btn btn-secondary" onclick="showHome()">← Home</button>
      <h2>${label}</h2>
      <span class="quiz-progress">${currentTest.length} questions</span>
    </div>

    ${currentTest.map((q, i) => renderQuestion(q, i)).join('')}

    <div class="quiz-footer">
      <button class="btn btn-secondary" onclick="showHome()">← Home</button>
      <button class="btn btn-primary" onclick="submitQuiz()">Submit &amp; See Results →</button>
    </div>
  `);
}

// ── Results screen ────────────────────────────────────────
function submitQuiz() {
  const wrongIds = [];

  const items = currentTest.map((q, i) => {
    const given   = (userAnswers[q.id] || '').trim();
    const isShort = q.type === 'short';
    const correct = isShort ? null : (given.toUpperCase() === q.answer.toUpperCase());

    if (!isShort && !correct) wrongIds.push(q.id);

    const icon        = isShort ? '📝' : (correct ? '✅' : '❌');
    const correctLine = isShort
      ? `<div class="result-correct-ans">Model answer: ${q.answer}</div>`
      : (correct
          ? `<div class="result-correct-ans">Correct! Answer: ${q.answer}</div>`
          : `<div class="result-your-ans">Your answer: ${given || '—'}</div>
             <div class="result-correct-ans">Correct answer: ${q.answer}</div>`);

    return `
      <div class="result-item">
        <div class="result-item-header" onclick="toggleResultItem(this)">
          <span class="result-icon">${icon}</span>
          <span class="result-q-text">Q${i + 1}: ${q.question.slice(0, 80)}${q.question.length > 80 ? '…' : ''}</span>
        </div>
        <div class="result-item-body">
          ${correctLine}
          <div class="result-explanation">💡 ${q.explanation}</div>
        </div>
      </div>`;
  });

  recordMistakes(wrongIds);
  currentTest.forEach(q => {
    if (q.type === 'mcq') {
      const given = (userAnswers[q.id] || '').trim().toUpperCase();
      if (given === q.answer.toUpperCase()) clearMistake(q.id);
    }
  });

  const mcqCount   = currentTest.filter(q => q.type === 'mcq').length;
  const mcqCorrect = currentTest.filter(q =>
    q.type === 'mcq' &&
    (userAnswers[q.id] || '').trim().toUpperCase() === q.answer.toUpperCase()
  ).length;

  render(`
    <div class="results-header">
      <div class="score-badge">${mcqCorrect} / ${mcqCount}</div>
      <div class="results-meta">MCQ score &nbsp;·&nbsp; Short answers for self-review</div>
    </div>

    <div class="result-list">${items.join('')}</div>

    <div class="results-footer">
      <button class="btn btn-primary full-test-btn" onclick="showHome()">← Back to Home</button>
      <button class="btn btn-secondary full-test-btn"
              onclick="startTest(currentChapter)">🔄 Retake This Test</button>
    </div>
  `);
}

function toggleResultItem(header) {
  header.nextElementSibling.classList.toggle('open');
}

// ── Boot ──────────────────────────────────────────────────
function boot() { showModuleSelect(); }
boot();
