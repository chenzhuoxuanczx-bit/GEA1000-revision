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

// ── Test builder ────────────────────────────────────────
function buildTest(chapter) {
  // chapter: number 1-4 → chapter test; null → full mixed; 'retry' → mistake bank
  let pool;

  if (chapter === 'retry') {
    const mistakes = getMistakes();
    pool = questions.filter(q => mistakes[q.id]);
  } else if (chapter === null) {
    pool = questions; // all chapters
  } else {
    pool = questions.filter(q => q.chapter === chapter);
  }

  const mcq   = shuffle(pool.filter(q => q.type === 'mcq'));
  const short = shuffle(pool.filter(q => q.type === 'short'));

  if (chapter === null) {
    // Full mixed: 10 MCQ + 2 short
    return [...mcq.slice(0, 10), ...short.slice(0, 2)];
  } else if (chapter === 'retry') {
    return [...mcq, ...short]; // all mistakes
  } else {
    // Chapter test: up to 4 MCQ + 1 short
    return [...mcq.slice(0, 4), ...short.slice(0, 1)];
  }
}

// ── Quiz screen ──────────────────────────────────────────
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
  // Highlight selected option visually
  document.querySelectorAll(`[data-qid="${id}"] .option-label`).forEach(el => {
    el.classList.toggle('selected', el.dataset.val === value);
  });
}

function renderQuestion(q, index) {
  const imageHtml = q.image
    ? `<img class="q-image" src="${q.image}" alt="diagram" />`
    : '';
  const svgHtml = q.svg
    ? `<div class="q-svg">${q.svg}</div>`
    : '';

  const bodyHtml = q.type === 'mcq'
    ? `<div class="options">
        ${q.options.map(opt => {
          const letter = opt[0]; // "A", "B", etc.
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
      ${imageHtml}${svgHtml}
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

// ── Results screen ───────────────────────────────────────
function submitQuiz() {
  const mistakes = getMistakes();
  const wrongIds = [];

  const items = currentTest.map((q, i) => {
    const given = (userAnswers[q.id] || '').trim();
    const isShort = q.type === 'short';
    // For short answer: always mark for review (no auto-grade)
    const correct = isShort ? null : (given.toUpperCase() === q.answer.toUpperCase());

    if (!isShort && !correct) wrongIds.push(q.id);

    const icon  = isShort ? '📝' : (correct ? '✅' : '❌');
    const yourAnsText = given || '<em>No answer</em>';
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

  // Record new mistakes and clear ones that were answered correctly
  recordMistakes(wrongIds);
  currentTest.forEach(q => {
    if (q.type === 'mcq') {
      const given = (userAnswers[q.id] || '').trim().toUpperCase();
      if (given === q.answer.toUpperCase()) clearMistake(q.id);
    }
  });

  const mcqCount    = currentTest.filter(q => q.type === 'mcq').length;
  const mcqCorrect  = currentTest.filter(q =>
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
  const body = header.nextElementSibling;
  body.classList.toggle('open');
}

// ── Boot ────────────────────────────────────────────────
async function boot() {
  const res = await fetch('questions.json');
  questions = await res.json();
  showHome();
}

boot();
