/**
 * Git Workshop - Interactive Presentation System
 * Uses PeerJS for WebRTC-based real-time synchronization
 * 
 * Modes:
 * - Presenter: Controls slides, broadcasts to all clients
 * - Client: Receives slide sync, no controls
 * 
 * Message Protocol (extensible for future quiz features):
 * { type: 'slide', slide: number }
 * { type: 'quiz-start', quizId: string, questions: array }
 * { type: 'quiz-answer', quizId: string, answer: any, clientId: string }
 * { type: 'quiz-results', quizId: string, scores: object }
 */

// =============================================
// CONFIGURATION
// =============================================
const PEER_CONFIG = {
    debug: 2, // 1: errors, 2: warnings, 3: all - helps diagnose connection issues
    // Explicit server config - PeerJS cloud can be flaky; delay + retry helps
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
};

const ROOM_PREFIX = 'git-workshop-'; // Prefix for room IDs to avoid collisions
const CLIENT_ID_STORAGE_KEY = 'git-workshop-client-id';
const QUIZ_STORAGE_KEY = 'git-workshop-quiz-results';
let EXERCISE_SLIDES = [5, 11, 17, 24, 29]; // slide indices for exercises 1-5 (overridable from saved presentation)
const TIME_BONUS_POINTS = [5, 4, 3, 2, 1]; // bonus for 1st, 2nd, 3rd, 4th, 5th submitter

const PRESENTATION_STORAGE_KEY = 'peerpresent-presentation-v1';

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// =============================================
// QUIZ DATA (exercise index 1-5, multiple choice)
// =============================================
const DEFAULT_QUIZ_DATA = {
    1: {
        title: 'Exercise 1 - Quick Fire Round',
        questions: [
            { id: 1, text: 'What problem does Git solve that sharing ZIP files cannot?', points: 2, options: [
                { key: 'a', text: 'Version history & collaboration without overwriting' },
                { key: 'b', text: 'Faster build times' },
                { key: 'c', text: 'Auto deployment' }
            ], correct: 'a' },
            { id: 2, text: 'Which command moves code from Staging → Local Repo?', points: 2, options: [
                { key: 'a', text: 'git add' },
                { key: 'b', text: 'git commit' },
                { key: 'c', text: 'git push' }
            ], correct: 'b' },
            { id: 3, text: 'True or False: Once you git commit, code is automatically visible on GitHub.', points: 2, options: [
                { key: 'a', text: 'True' },
                { key: 'b', text: 'False' }
            ], correct: 'b' },
            { id: 4, text: 'Why is Git better than email for a team of 4+? (Pick best answer)', points: 4, options: [
                { key: 'a', text: 'Single source of truth, full history, no file overwrites' },
                { key: 'b', text: 'Email is faster' },
                { key: 'c', text: 'Git is easier to learn' }
            ], correct: 'a' }
        ]
    },
    2: {
        title: 'Exercise 2 - Fill in the Command',
        questions: [
            { id: 1, text: 'What should Dev do Monday morning before coding?', points: 3, options: [
                { key: 'a', text: 'git pull first, then start working' },
                { key: 'b', text: 'git push his changes' },
                { key: 'c', text: 'Nothing, code directly' }
            ], correct: 'a' },
            { id: 2, text: 'git add . vs git add src/login.js — when to prefer each?', points: 2, options: [
                { key: 'a', text: 'add . = all files; add file = one file; prefer specific when possible' },
                { key: 'b', text: 'Always use git add .' },
                { key: 'c', text: 'They do the same thing' }
            ], correct: 'a' },
            { id: 3, text: 'Which is a GOOD commit message?', points: 2, options: [
                { key: 'a', text: '"fix stuff"' },
                { key: 'b', text: '"WIP"' },
                { key: 'c', text: '"fix: null pointer in user auth when email is empty"' }
            ], correct: 'c' },
            { id: 4, text: 'Noor committed to main by accident. First command to fix?', points: 3, options: [
                { key: 'a', text: 'git reset --soft HEAD~1' },
                { key: 'b', text: 'git push origin main' },
                { key: 'c', text: 'git checkout main' }
            ], correct: 'a' }
        ]
    },
    3: {
        title: 'Exercise 3 - Scenario Mapping',
        questions: [
            { id: 1, text: 'Branch name for Sam fixing CSV export bug?', points: 3, options: [
                { key: 'a', text: 'fix/csv-export or fix/broken-csv-export' },
                { key: 'b', text: 'feature/csv' },
                { key: 'c', text: 'bugfix/sam' }
            ], correct: 'a' },
            { id: 2, text: 'Branch name for Priya experimenting with caching?', points: 2, options: [
                { key: 'a', text: 'spike/caching or spike/react-18-upgrade' },
                { key: 'b', text: 'feature/cache' },
                { key: 'c', text: 'experiment/priya' }
            ], correct: 'a' },
            { id: 3, text: "Dev's branch is 3 days old. Better to merge or rebase from main?", points: 2, options: [
                { key: 'a', text: 'Merge — adds merge commit' },
                { key: 'b', text: 'Rebase — keeps history linear, replays your commits on top' }
            ], correct: 'b' },
            { id: 4, text: 'git push --force vs --force-with-lease?', points: 3, options: [
                { key: 'a', text: 'Same thing' },
                { key: 'b', text: '--force overwrites remote; --force-with-lease safer, fails if remote changed' }
            ], correct: 'b' }
        ]
    },
    4: {
        title: 'Exercise 4 - Conflict Resolution',
        questions: [
            { id: 1, text: 'In a merge conflict, what does HEAD represent?', points: 2, options: [
                { key: 'a', text: 'Your current branch / your changes' },
                { key: 'b', text: 'The remote branch' },
                { key: 'c', text: 'The base commit' }
            ], correct: 'a' },
            { id: 2, text: 'Sam resolved conflict but forgot git add. What happens on commit?', points: 2, options: [
                { key: 'a', text: 'Git says "no changes added" or merge still in progress' },
                { key: 'b', text: 'Commit succeeds' },
                { key: 'c', text: 'Git auto-adds the file' }
            ], correct: 'a' },
            { id: 3, text: 'After fixing conflicts in 3 files, what do you do?', points: 3, options: [
                { key: 'a', text: 'git add each resolved file, then git commit' },
                { key: 'b', text: 'git commit only' },
                { key: 'c', text: 'git push immediately' }
            ], correct: 'a' },
            { id: 4, text: 'Why prefer git revert over git reset --hard on shared branches?', points: 3, options: [
                { key: 'a', text: 'Revert adds a new commit that undoes changes; safe for shared history' },
                { key: 'b', text: 'Reset is faster' },
                { key: 'c', text: 'They are the same' }
            ], correct: 'a' }
        ]
    },
    5: {
        title: 'Exercise 5 - Team Scenarios',
        questions: [
            { id: 1, text: '"Added dark mode" — correct Conventional Commit prefix?', points: 2, options: [
                { key: 'a', text: 'feat: Added dark mode' },
                { key: 'b', text: 'fix: Added dark mode' },
                { key: 'c', text: 'chore: Added dark mode' }
            ], correct: 'a' },
            { id: 2, text: 'Noor is mid-feature and gets a critical bug. What helps pause work?', points: 2, options: [
                { key: 'a', text: 'git stash push -m "WIP", then switch branch' },
                { key: 'b', text: 'git commit -m "WIP"' },
                { key: 'c', text: 'git reset --hard' }
            ], correct: 'a' },
            { id: 3, text: "Dev needs one fix from Sam's unmerged branch. Command?", points: 2, options: [
                { key: 'a', text: 'git cherry-pick <commit-hash>' },
                { key: 'b', text: 'git merge sam/branch' },
                { key: 'c', text: 'Copy-paste the code' }
            ], correct: 'a' },
            { id: 4, text: 'Priya pushed .env with secrets. First Git step?', points: 4, options: [
                { key: 'a', text: 'git rm --cached .env, add .env to .gitignore, commit, push' },
                { key: 'b', text: 'Delete the file only' },
                { key: 'c', text: 'git reset --hard' }
            ], correct: 'a' }
        ]
    }
};

/** Runtime quiz data (may be replaced from localStorage presentation JSON) */
let quizDataEffective = deepClone(DEFAULT_QUIZ_DATA);

/** Slide index where the live leaderboard is shown */
let LEADERBOARD_SLIDE_INDEX = 30;

// =============================================
// STATE
// =============================================
let peer = null;
let connections = []; // For presenter: array of client connections
let presenterConnection = null; // For client: connection to presenter
let isPresenter = false;
let roomCode = '';
let clientId = '';

// Slide state (rebuilt when presentation is loaded from storage)
let slides = [];
let totalSlides = 0;
let currentSlide = 0;

function refreshSlideRefs() {
    slides = document.querySelectorAll('.slide');
    totalSlides = slides.length;
}

// DOM Elements
const startOverlay = document.getElementById('startOverlay');
const startPresenterBtn = document.getElementById('startPresenterBtn');
const joinSessionBtn = document.getElementById('joinSessionBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const connectionStatus = document.getElementById('connectionStatus');
const presenterBar = document.getElementById('presenterBar');
const clientBar = document.getElementById('clientBar');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const clientCount = document.getElementById('clientCount');
const syncStatus = document.getElementById('syncStatus');
const navBar = document.getElementById('navBar');
const keyboardHint = document.getElementById('keyboardHint');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const slideIndicator = document.getElementById('slideIndicator');
const editPresentationBtn = document.getElementById('editPresentationBtn');
const presentationEditorOverlay = document.getElementById('presentationEditorOverlay');
const jsonEditorMount = document.getElementById('jsonEditorMount');
const presentationEditorCancel = document.getElementById('presentationEditorCancel');
const presentationEditorReset = document.getElementById('presentationEditorReset');
const presentationEditorSave = document.getElementById('presentationEditorSave');

let presentationJsonEditor = null;

// =============================================
// PRESENTATION JSON (localStorage + editor)
// =============================================

function applyStoredPresentation() {
    const raw = localStorage.getItem(PRESENTATION_STORAGE_KEY);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        if (!data.slides || !Array.isArray(data.slides) || data.slides.length === 0) return;
        const container = document.querySelector('.presentation');
        if (!container) return;

        if (data.meta && typeof data.meta.pageTitle === 'string') {
            document.title = data.meta.pageTitle;
        }
        if (Array.isArray(data.exerciseSlides) && data.exerciseSlides.length > 0) {
            EXERCISE_SLIDES = data.exerciseSlides;
        }
        if (typeof data.leaderboardSlideIndex === 'number') {
            LEADERBOARD_SLIDE_INDEX = data.leaderboardSlideIndex;
        }
        if (data.quizData && typeof data.quizData === 'object') {
            quizDataEffective = deepClone(data.quizData);
        }

        const html = data.slides.map((s, i) => {
            const rawHtml = typeof s === 'string' ? s : (s.outerHtml || s.html || '');
            const wrapper = document.createElement('div');
            wrapper.innerHTML = rawHtml.trim();
            const slideEl = wrapper.firstElementChild;
            if (!slideEl) return '';
            slideEl.setAttribute('data-slide', String(i));
            slideEl.classList.toggle('active', i === 0);
            return slideEl.outerHTML;
        }).join('');
        container.innerHTML = html;
        currentSlide = 0;
    } catch (e) {
        console.error('Failed to apply stored presentation', e);
    }
}

function buildPresentationJson() {
    const slideEls = document.querySelectorAll('.presentation .slide');
    return {
        version: 1,
        meta: {
            pageTitle: document.title
        },
        slides: Array.from(slideEls).map(el => ({ outerHtml: el.outerHTML })),
        exerciseSlides: EXERCISE_SLIDES.slice(),
        leaderboardSlideIndex: LEADERBOARD_SLIDE_INDEX,
        quizData: deepClone(quizDataEffective)
    };
}

function loadJsonEditorScript() {
    if (window.JSONEditor) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/jsoneditor@10.0.3/dist/jsoneditor.min.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsoneditor@10.0.3/dist/jsoneditor.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load JSONEditor'));
        document.body.appendChild(script);
    });
}

function openPresentationEditor() {
    loadJsonEditorScript()
        .then(() => {
            presentationEditorOverlay.classList.remove('hidden');
            presentationEditorOverlay.setAttribute('aria-hidden', 'false');

            let data;
            try {
                const raw = localStorage.getItem(PRESENTATION_STORAGE_KEY);
                data = raw ? JSON.parse(raw) : buildPresentationJson();
            } catch (e) {
                console.error(e);
                data = buildPresentationJson();
            }

            jsonEditorMount.innerHTML = '';
            const options = {
                mode: 'code',
                modes: ['code', 'tree', 'view'],
                name: 'presentation',
                statusBar: false,
                mainMenuBar: true
            };
            presentationJsonEditor = new window.JSONEditor(jsonEditorMount, options);
            presentationJsonEditor.set(data);
            requestAnimationFrame(() => {
                if (presentationJsonEditor && typeof presentationJsonEditor.resize === 'function') {
                    presentationJsonEditor.resize();
                }
            });
        })
        .catch(err => {
            console.error(err);
            alert('Could not load the JSON editor. Check your network connection.');
        });
}

function closePresentationEditor() {
    presentationEditorOverlay.classList.add('hidden');
    presentationEditorOverlay.setAttribute('aria-hidden', 'true');
    if (presentationJsonEditor) {
        presentationJsonEditor.destroy();
        presentationJsonEditor = null;
    }
    jsonEditorMount.innerHTML = '';
}

function savePresentationFromEditor() {
    if (!presentationJsonEditor) return;
    try {
        const data = presentationJsonEditor.get();
        if (!data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
            alert('Invalid JSON: "slides" must be a non-empty array.');
            return;
        }
        localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(data));
        window.location.reload();
    } catch (e) {
        alert('Invalid JSON: ' + (e.message || String(e)));
    }
}

function resetPresentationToDefault() {
    if (!confirm('Remove the saved presentation from this browser and reload the built-in default?')) return;
    localStorage.removeItem(PRESENTATION_STORAGE_KEY);
    window.location.reload();
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function showStatus(message, type = 'loading') {
    connectionStatus.textContent = message;
    connectionStatus.className = 'connection-status ' + type;
}

/**
 * Get or create a persistent 8-digit client ID.
 * Stored in localStorage so it survives tabs, browser close, and restart.
 */
function getOrCreateClientId() {
    const stored = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (stored && /^\d{8}$/.test(stored)) {
        return stored;
    }
    const newId = Math.floor(10000000 + Math.random() * 90000000).toString();
    console.log('Creating new client ID:', newId);
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, newId);
    return newId;
}

function hideOverlay() {
    startOverlay.classList.add('hidden');
}

function updateClientCount() {
    const count = connections.filter(c => c.open).length;
    clientCount.textContent = count;
}

// =============================================
// QUIZ (CLIENT: form + submit; PRESENTER: score + store + leaderboard)
// =============================================
let quizStartTime = 0; // set when quiz form is shown
const submittedExercises = {}; // client: { 1: true, 2: true, ... }

function getQuizFormContainer(slideIndex) {
    const slide = document.querySelector(`.slide[data-slide="${slideIndex}"]`);
    return slide ? slide.querySelector('.quiz-form-container') : null;
}

function showQuizForm(exerciseIndex, startTime) {
    if (submittedExercises[exerciseIndex]) return;
    const slideIndex = EXERCISE_SLIDES[exerciseIndex - 1];
    const container = getQuizFormContainer(slideIndex);
    if (!container || !quizDataEffective[exerciseIndex]) return;
    quizStartTime = startTime || Date.now();
    const quiz = quizDataEffective[exerciseIndex];
    container.innerHTML = '';
    const form = document.createElement('form');
    form.className = 'quiz-form';
    form.dataset.exerciseIndex = String(exerciseIndex);
    quiz.questions.forEach((q, i) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'quiz-question';
        qDiv.innerHTML = `<label class="quiz-q-label">Q${i + 1} (${q.points} pts) ${q.text}</label>`;
        const opts = document.createElement('div');
        opts.className = 'quiz-options';
        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'quiz-option';
            label.innerHTML = `<input type="radio" name="q${q.id}" value="${opt.key}" /> <span>${opt.text}</span>`;
            opts.appendChild(label);
        });
        qDiv.appendChild(opts);
        form.appendChild(qDiv);
    });
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'quiz-submit-btn';
    btn.textContent = 'Submit answers';
    form.appendChild(btn);
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitQuiz(exerciseIndex);
    });
    container.appendChild(form);
    container.classList.remove('hidden');
}

function hideAllQuizForms() {
    EXERCISE_SLIDES.forEach(slideIndex => {
        const container = getQuizFormContainer(slideIndex);
        if (container) {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
    });
}

function submitQuiz(exerciseIndex) {
    if (submittedExercises[exerciseIndex]) return;
    const slideIndex = EXERCISE_SLIDES[exerciseIndex - 1];
    const container = getQuizFormContainer(slideIndex);
    const form = container ? container.querySelector('.quiz-form') : null;
    if (!form) return;
    const quiz = quizDataEffective[exerciseIndex];
    const answers = {};
    quiz.questions.forEach(q => {
        const radio = form.querySelector(`input[name="q${q.id}"]:checked`);
        answers[q.id] = radio ? radio.value : null;
    });
    submittedExercises[exerciseIndex] = true;
    const submitTime = Date.now();
    const payload = {
        type: 'quiz-answer',
        exerciseIndex,
        clientId,
        answers,
        submitTime
    };
    if (presenterConnection && presenterConnection.open) {
        presenterConnection.send(JSON.stringify(payload));
    }
    form.remove();
    const msg = document.createElement('p');
    msg.className = 'quiz-submitted-msg';
    msg.textContent = '✓ Answers submitted!';
    container.appendChild(msg);
}

function scoreQuiz(exerciseIndex, answers) {
    const quiz = quizDataEffective[exerciseIndex];
    if (!quiz) return 0;
    let score = 0;
    quiz.questions.forEach(q => {
        if (answers[q.id] === q.correct) score += q.points;
    });
    return score;
}

function loadQuizResults() {
    try {
        const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { exerciseSubmissions: {} };
    } catch (e) {
        return { exerciseSubmissions: {} };
    }
}

function saveQuizSubmission(clientId, exerciseIndex, score, timeBonus, submitTime) {
    const data = loadQuizResults();
    if (!data.exerciseSubmissions) data.exerciseSubmissions = {};
    if (!data.exerciseSubmissions[exerciseIndex]) data.exerciseSubmissions[exerciseIndex] = [];
    const list = data.exerciseSubmissions[exerciseIndex];
    list.push({ clientId, score, timeBonus, submitTime });
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(data));
}

function handleQuizAnswerFromClient(data) {
    const { exerciseIndex, clientId: cid, answers, submitTime } = data;
    const score = scoreQuiz(exerciseIndex, answers);
    const data_ = loadQuizResults();
    const list = (data_.exerciseSubmissions || {})[exerciseIndex] || [];
    const order = list.length;
    const timeBonus = order < TIME_BONUS_POINTS.length ? TIME_BONUS_POINTS[order] : 0;
    saveQuizSubmission(cid, exerciseIndex, score, timeBonus, submitTime);
    if (currentSlide === LEADERBOARD_SLIDE_INDEX) renderLeaderboard();
}

function getLeaderboardData() {
    const data = loadQuizResults();
    const totals = {};
    Object.keys(data.exerciseSubmissions || {}).forEach(exKey => {
        const list = data.exerciseSubmissions[exKey] || [];
        list.forEach(({ clientId: cid, score, timeBonus }) => {
            if (!totals[cid]) totals[cid] = { clientId: cid, totalScore: 0, totalBonus: 0 };
            totals[cid].totalScore += score;
            totals[cid].totalBonus += timeBonus;
        });
    });
    return Object.values(totals).map(o => ({
        ...o,
        total: o.totalScore + o.totalBonus
    })).sort((a, b) => b.total - a.total);
}

function renderLeaderboard() {
    const el = document.getElementById('quizLeaderboard');
    if (!el) return;
    const rows = getLeaderboardData();
    if (rows.length === 0) {
        el.innerHTML = '<p class="leaderboard-empty">No quiz submissions yet.</p>';
        return;
    }
    el.innerHTML = `
        <h3 class="leaderboard-title">Live Quiz Leaderboard</h3>
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Participant (ID)</th>
                    <th>Marks</th>
                    <th>Speed bonus</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((r, i) => `
                    <tr class="leaderboard-row">
                        <td class="leaderboard-rank">${i + 1}</td>
                        <td class="leaderboard-id">${r.clientId}</td>
                        <td class="leaderboard-marks">${r.totalScore}</td>
                        <td class="leaderboard-bonus">+${r.totalBonus}</td>
                        <td class="leaderboard-total"><strong>${r.total}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// =============================================
// SLIDE NAVIGATION
// =============================================

function updateUI() {
    progressFill.style.width = ((currentSlide + 1) / totalSlides * 100) + '%';
    progressText.textContent = (currentSlide + 1) + ' / ' + totalSlides;
    slideIndicator.textContent = 'Slide ' + (currentSlide + 1) + ' / ' + totalSlides;

    if (isPresenter) {
        prevBtn.disabled = currentSlide === 0;
        nextBtn.disabled = currentSlide === totalSlides - 1;

        if (currentSlide === totalSlides - 1) {
            nextBtn.innerHTML = '<span>End</span>';
        } else {
            nextBtn.innerHTML = '<span>Next</span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
        }
    }
}

function goToSlide(index, broadcast = true) {
    if (index < 0 || index >= totalSlides) return;

    slides[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    updateUI();

    // Broadcast to clients if presenter
    if (broadcast && isPresenter) {
        broadcastMessage({ type: 'slide', slide: currentSlide });
        // If landing on an exercise slide, broadcast quiz-start so clients can show the form
        const exerciseIndex = EXERCISE_SLIDES.indexOf(currentSlide);
        if (exerciseIndex !== -1) {
            broadcastMessage({
                type: 'quiz-start',
                exerciseIndex: exerciseIndex + 1,
                slide: currentSlide,
                startTime: Date.now()
            });
        }
        if (currentSlide === LEADERBOARD_SLIDE_INDEX) {
            renderLeaderboard();
        }
    }

    // Client: show or hide quiz form when slide changes
    if (!isPresenter) {
        const exIdx = EXERCISE_SLIDES.indexOf(currentSlide);
        if (exIdx !== -1) {
            showQuizForm(exIdx + 1);
        } else {
            hideAllQuizForms();
        }
    }
}

function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
    }
}

// =============================================
// WEBRTC / PEERJS FUNCTIONS
// =============================================

function broadcastMessage(message) {
    const data = JSON.stringify(message);
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
}

function handleMessage(message) {
    try {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        
        switch (data.type) {
            case 'slide':
                goToSlide(data.slide, false);
                break;
            
            case 'quiz-start':
                if (!isPresenter && data.slide === currentSlide) {
                    showQuizForm(data.exerciseIndex, data.startTime);
                }
                break;
            
            case 'quiz-answer':
                if (isPresenter) {
                    handleQuizAnswerFromClient(data);
                }
                break;
            
            case 'quiz-results':
                console.log('Quiz results:', data);
                break;
            
            default:
                console.log('Unknown message type:', data.type);
        }
    } catch (e) {
        console.error('Error handling message:', e);
    }
}

// =============================================
// PRESENTER MODE
// =============================================

function startAsPresenter() {
    isPresenter = true;
    roomCode = generateRoomCode();
    const peerId = ROOM_PREFIX + roomCode;
    
    showStatus('Creating room...', 'loading');
    startPresenterBtn.disabled = true;
    joinSessionBtn.disabled = true;
    
    peer = new Peer(peerId, PEER_CONFIG);
    
    peer.on('open', (id) => {
        console.log('Presenter peer opened with ID:', id);
        showStatus('Room created! Share the code with participants.', 'success');
        
        setTimeout(() => {
            hideOverlay();
            setupPresenterUI();
        }, 1000);
    });
    
    peer.on('connection', (conn) => {
        console.log('Client connected:', conn.peer);
        connections.push(conn);
        
        conn.on('open', () => {
            updateClientCount();
            // Send current slide to new client
            conn.send(JSON.stringify({ type: 'slide', slide: currentSlide }));
        });
        
        conn.on('data', (data) => {
            handleMessage(data);
        });
        
        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
            updateClientCount();
            console.log('Client disconnected');
        });
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
            connections = connections.filter(c => c !== conn);
            updateClientCount();
        });
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
            showStatus('Room code already in use. Try again.', 'error');
            roomCode = generateRoomCode();
            startPresenterBtn.disabled = false;
            joinSessionBtn.disabled = false;
        } else {
            showStatus('Connection error: ' + err.message, 'error');
            startPresenterBtn.disabled = false;
            joinSessionBtn.disabled = false;
        }
    });
    
    peer.on('disconnected', () => {
        console.log('Peer disconnected, attempting reconnect...');
        peer.reconnect();
    });
}

function setupPresenterUI() {
    document.body.classList.add('presenter-mode');
    presenterBar.classList.remove('hidden');
    navBar.classList.remove('hidden');
    keyboardHint.classList.remove('hidden');
    roomCodeDisplay.textContent = roomCode;
    updateUI();

    editPresentationBtn.onclick = openPresentationEditor;
    
    // Enable keyboard controls
    setupKeyboardControls();
    setupTouchControls();
}

// =============================================
// CLIENT MODE
// =============================================

const MAX_CONNECT_RETRIES = 3;
const RETRY_DELAY_MS = 2500;
let clientConnectRetryCount = 0; // for peer-unavailable retries

function tryConnectToPresenter(presenterPeerId, attempt) {
    if (!peer || peer.destroyed) return;
    
    showStatus(attempt > 0 ? `Retrying... (${attempt + 1}/${MAX_CONNECT_RETRIES})` : 'Connecting to presenter...', 'loading');
    
    presenterConnection = peer.connect(presenterPeerId, { reliable: true });
    
    const timeout = setTimeout(() => {
        if (presenterConnection && !presenterConnection.open) {
            console.warn('Connection timeout, attempt', attempt + 1);
            presenterConnection.close();
            if (attempt < MAX_CONNECT_RETRIES - 1) {
                showStatus(`Timeout. Retrying in ${RETRY_DELAY_MS / 1000}s...`, 'loading');
                setTimeout(() => tryConnectToPresenter(presenterPeerId, attempt + 1), RETRY_DELAY_MS);
            } else {
                showStatus('Could not reach presenter. Check room code and ensure presenter started first.', 'error');
                startPresenterBtn.disabled = false;
                joinSessionBtn.disabled = false;
            }
        }
    }, 10000); // 10s timeout per attempt
    
    presenterConnection.on('open', () => {
        clearTimeout(timeout);
        clientConnectRetryCount = 0; // reset for next session
        console.log('Connected to presenter');
        showStatus('Connected to presenter!', 'success');
        setTimeout(() => {
            hideOverlay();
            setupClientUI();
        }, 1000);
    });
    
    presenterConnection.on('data', (data) => {
        handleMessage(data);
    });
    
    presenterConnection.on('close', () => {
        console.log('Connection to presenter closed');
        updateSyncStatus(false);
    });
    
    presenterConnection.on('error', (err) => {
        console.error('DataConnection error:', err);
        updateSyncStatus(false);
    });
}

function joinSession() {
    const code = roomCodeInput.value.trim();
    
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
        showStatus('Please enter a valid 4-digit code', 'error');
        return;
    }
    
    isPresenter = false;
    roomCode = code;
    const presenterPeerId = ROOM_PREFIX + roomCode;
    
    showStatus('Connecting to session...', 'loading');
    startPresenterBtn.disabled = true;
    joinSessionBtn.disabled = true;
    clientConnectRetryCount = 0;
    
    // Use persistent 8-digit client ID (from localStorage, or create and store)
    clientId = getOrCreateClientId();
    const peerId = ROOM_PREFIX + 'client-' + clientId;
    
    peer = new Peer(peerId, PEER_CONFIG);
    
    peer.on('open', () => {
        console.log('Client peer opened, connecting to presenter...', clientId, '→', presenterPeerId);
        // Small delay helps signaling server sync; PeerJS cloud can be flaky
        setTimeout(() => tryConnectToPresenter(presenterPeerId, 0), 500);
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', err.type, err.message);
        // peer-unavailable = presenter not found; retry a few times (presenter may still be connecting)
        if (err.type === 'peer-unavailable') {
            clientConnectRetryCount++;
            if (clientConnectRetryCount < MAX_CONNECT_RETRIES) {
                showStatus(`Presenter not ready. Retrying (${clientConnectRetryCount}/${MAX_CONNECT_RETRIES})...`, 'loading');
                setTimeout(() => tryConnectToPresenter(presenterPeerId, clientConnectRetryCount), RETRY_DELAY_MS);
            } else {
                clientConnectRetryCount = 0;
                showStatus('Session not found. Is the presenter running? Check the 4-digit room code.', 'error');
                startPresenterBtn.disabled = false;
                joinSessionBtn.disabled = false;
            }
        } else if (err.type === 'network') {
            showStatus('Network error. Check your connection and try again.', 'error');
            startPresenterBtn.disabled = false;
            joinSessionBtn.disabled = false;
        } else if (err.type === 'server-error') {
            showStatus('Signaling server error. Try again in a moment.', 'error');
            startPresenterBtn.disabled = false;
            joinSessionBtn.disabled = false;
        } else {
            showStatus('Connection error: ' + (err.message || err.type), 'error');
            startPresenterBtn.disabled = false;
            joinSessionBtn.disabled = false;
        }
    });
    
    peer.on('disconnected', () => {
        console.log('Peer disconnected, attempting reconnect...');
        peer.reconnect();
        updateSyncStatus(false);
    });
}

function setupClientUI() {
    document.body.classList.add('client-mode');
    clientBar.classList.remove('hidden');
    // Nav bar stays hidden for clients
    updateUI();
    updateSyncStatus(true);
}

function updateSyncStatus(connected) {
    if (connected) {
        syncStatus.innerHTML = clientId +' <span class="sync-dot"></span> Synced with presenter';
        syncStatus.classList.remove('disconnected');
    } else {
        syncStatus.innerHTML = '<span class="sync-dot"></span> Disconnected - trying to reconnect...';
        syncStatus.classList.add('disconnected');
    }
}

// =============================================
// EVENT HANDLERS
// =============================================

function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (!isPresenter) return;
        if (presentationEditorOverlay && !presentationEditorOverlay.classList.contains('hidden')) return;

        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
        } else if (e.key === 'Home') {
            e.preventDefault();
            goToSlide(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            goToSlide(totalSlides - 1);
        }
    });
}

function setupTouchControls() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
        if (!isPresenter) return;
        if (presentationEditorOverlay && !presentationEditorOverlay.classList.contains('hidden')) return;

        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide();
            else prevSlide();
        }
    });
}

// =============================================
// INITIALIZATION
// =============================================

function init() {
    applyStoredPresentation();
    refreshSlideRefs();

    presentationEditorCancel.addEventListener('click', closePresentationEditor);
    presentationEditorReset.addEventListener('click', resetPresentationToDefault);
    presentationEditorSave.addEventListener('click', savePresentationFromEditor);

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (presentationEditorOverlay && !presentationEditorOverlay.classList.contains('hidden')) {
            closePresentationEditor();
        }
    });

    // Show "Start as Presenter" only when ?mode=presenter is in the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'presenter') {
        document.getElementById('presenterStartSection').classList.remove('hidden');
    }

    // Button click handlers
    startPresenterBtn.addEventListener('click', startAsPresenter);
    joinSessionBtn.addEventListener('click', joinSession);
    
    // Allow Enter key in room code input
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinSession();
        }
    });
    
    // Only allow numbers in room code input
    roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    
    // Navigation buttons (for presenter)
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    
    // Initialize slide indicator
    updateUI();
}

// Start the app
init();
