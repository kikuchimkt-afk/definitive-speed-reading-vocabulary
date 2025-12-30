// Game State
let currentState = {
    mode: null, // 'vocab' or 'fill'
    questions: [],
    currentIndex: 0,
    score: 0,
    isAnswered: false
};

// Favorites & Mistakes State
let favorites = new Set();
let mistakes = new Set(); // New
const FAV_KEY = 'vocabMaster_favorites';
const MISTAKES_KEY = 'vocabMaster_mistakes'; // New

// ...

// Start Game
function startApp(mode, filterType = 'all') { // Changed signature
    currentState.mode = mode;
    currentState.currentIndex = 0;
    currentState.score = 0;
    currentState.isAnswered = false;
    currentState.filterType = filterType; // Store filter type

    // Load Data
    let sourceData = mode === 'vocab' ? VOCAB_DATA : FILL_DATA;

    if (filterType === 'favorites') {
        sourceData = sourceData.filter(item => {
            const uniqueId = `${mode}-${item.id}`;
            return favorites.has(uniqueId);
        });

        if (sourceData.length === 0) {
            alert('お気に入りに登録された問題がありません。\n問題を解いて★ボタンでお気に入りに登録しましょう！');
            return;
        }
    } else if (filterType === 'mistakes') {
        sourceData = sourceData.filter(item => {
            const uniqueId = `${mode}-${item.id}`;
            return mistakes.has(uniqueId);
        });

        if (sourceData.length === 0) {
            alert('ミスした問題はありません。\n素晴らしい！この調子で頑張りましょう！');
            return;
        }
    }

    currentState.questions = sourceData;
    shuffleArray(currentState.questions);

    // Nav Buttons
    document.getElementById('quiz-top-btn').classList.remove('hidden');
    const returnBtn = document.getElementById('quiz-list-return');
    if (returnBtn) returnBtn.classList.add('hidden');

    updateProgress();
    renderQuestion();
    switchScreen('quiz');
}

// ...

// New Function: Start from List
function startAppFromList(mode, questionList, startIndex, filterType = 'favorites') {
    currentState.mode = mode;
    currentState.questions = questionList; // Use the specific filtered list
    currentState.currentIndex = startIndex;
    currentState.score = 0;
    currentState.isAnswered = false;
    currentState.filterType = filterType; // Context

    // Nav Buttons
    document.getElementById('quiz-top-btn').classList.add('hidden');
    const returnBtnContainer = document.getElementById('quiz-list-return');
    const returnBtnEl = document.getElementById('return-list-btn-el');

    if (returnBtnContainer) {
        returnBtnContainer.classList.remove('hidden');
        if (returnBtnEl) {
            if (filterType === 'search') {
                returnBtnEl.innerHTML = '<span class="icon">🔍</span> 検索一覧に戻る';
            } else {
                returnBtnEl.innerHTML = '<span class="icon">📋</span> お気に入り一覧に戻る';
            }
        }
    }

    updateProgress();
    renderQuestion();
    switchScreen('quiz');
}

function returnToList() {
    if (currentState.filterType === 'search') {
        switchScreen('favoritesList');
    } else {
        // Fallback to favorites refresh
        if (typeof openFavoritesList === 'function') {
            openFavoritesList(currentState.mode);
        } else {
            switchScreen('favoritesList');
        }
    }
}

// ...



// ...

function handleAnswer(selectedChoice, selectedBtn, allChoices) {
    if (currentState.isAnswered) return;
    currentState.isAnswered = true;

    const qFn = currentState.questions[currentState.currentIndex];
    const uniqueId = `${currentState.mode}-${qFn.id}`;

    console.log(`Answered. Mode: ${currentState.mode}, ID: ${qFn.id}, UniqueID: ${uniqueId}`);

    const btns = Array.from(ui.choicesContainer.children);

    // Highlight selected
    if (selectedChoice.isCorrect) {
        selectedBtn.classList.add('correct');
        selectedBtn.innerHTML += ` <span style="font-size:1.5rem; margin-left:0.5rem;">⭕</span>`;
        currentState.score++;
        playAudio('correct');

        // Remove from mistakes if correct
        if (mistakes.has(uniqueId)) {
            mistakes.delete(uniqueId);
            saveMistakes();
            console.log(`Removed from mistakes: ${uniqueId}`);
        }

    } else {
        selectedBtn.classList.add('wrong');
        selectedBtn.innerHTML += ` <span style="font-size:1.5rem; margin-left:0.5rem;">❌</span>`;
        playAudio('wrong');

        // Add to mistakes if wrong
        if (!mistakes.has(uniqueId)) {
            mistakes.add(uniqueId);
            saveMistakes();
            console.log(`Added to mistakes: ${uniqueId}`);
        } else {
            console.log(`Already in mistakes: ${uniqueId}`);
        }

        // Highlight correct one
        btns.forEach(btn => {
            if (btn.dataset.isCorrect === 'true') {
                btn.classList.add('correct');
                btn.innerHTML += ` <span style="font-size:1.5rem; margin-left:0.5rem;">⭕</span>`;
            }
        });
    }

    // Disable all
    btns.forEach(btn => btn.classList.add('disabled'));

    // Update Score Display
    ui.score.textContent = currentState.score;

    // Show Post Answer Control Bar instead of Auto Explanation
    document.getElementById('post-answer-bar').classList.remove('hidden');

    // Pre-load explanation content securely but keep hidden
    showExplanation(selectedChoice.isCorrect, true); // true = justRender
}

// ...

function loadFavorites() {
    const savedFav = localStorage.getItem(FAV_KEY);
    if (savedFav) {
        try {
            favorites = new Set(JSON.parse(savedFav));
        } catch (e) { console.error(e); }
    }
    updateFavoriteCounts();
    loadMistakes(); // Call loadMistakes too
}

function loadMistakes() {
    const savedMistakes = localStorage.getItem(MISTAKES_KEY);
    console.log('Loading mistakes from storage:', savedMistakes);
    if (savedMistakes) {
        try {
            const arr = JSON.parse(savedMistakes);
            mistakes = new Set(arr);
            console.log('Parsed mistakes set size:', mistakes.size);
        } catch (e) { console.error(e); }
    }
    updateMistakeCounts();
}

function saveMistakes() {
    const arr = Array.from(mistakes);
    console.log('Saving mistakes:', arr);
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(arr));
}

function updateMistakeCounts() {
    console.log('Updating mistake counts. Total:', mistakes.size);
    let vocabCount = 0;
    let fillCount = 0;

    mistakes.forEach(id => {
        if (id.startsWith('vocab-')) vocabCount++;
        else if (id.startsWith('fill-')) fillCount++;
    });

    console.log(`Vocab: ${vocabCount}, Fill: ${fillCount}`);

    const vocabCountEl = document.getElementById('mistake-count-vocab');
    const fillCountEl = document.getElementById('mistake-count-fill');

    if (vocabCountEl) vocabCountEl.textContent = `${vocabCount}問`;
    if (fillCountEl) fillCountEl.textContent = `${fillCount}問`;
}

// updateFavoriteCounts (keep existing)
function updateFavoriteCounts() {
    // Count items for each mode
    let vocabCount = 0;
    let fillCount = 0;

    favorites.forEach(id => {
        if (id.startsWith('vocab-')) vocabCount++;
        else if (id.startsWith('fill-')) fillCount++;
    });

    const vocabCountEl = document.getElementById('fav-count-vocab');
    const fillCountEl = document.getElementById('fav-count-fill');

    if (vocabCountEl) vocabCountEl.textContent = `${vocabCount}問`;
    if (fillCountEl) fillCountEl.textContent = `${fillCount}問`;
}

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    favoritesList: document.getElementById('favorites-list-screen')
};



// New Function: Open Favorites List
function openFavoritesList(mode) {
    let sourceData = mode === 'vocab' ? VOCAB_DATA : FILL_DATA;

    // Filter Favorites
    const favData = sourceData.filter(item => {
        const uniqueId = `${mode}-${item.id}`;
        return favorites.has(uniqueId);
    });

    if (favData.length === 0) {
        alert('お気に入りに登録された問題がありません。\n問題を解いて★ボタンでお気に入りに登録しましょう！');
        return;
    }

    // Render List
    const container = document.getElementById('favorites-list-content');
    container.innerHTML = '';

    favData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'fav-list-item';

        const qText = document.createElement('div');
        qText.className = 'fav-list-item-question';
        qText.textContent = item.question;

        const tText = document.createElement('div');
        tText.className = 'fav-list-item-translation';
        tText.textContent = item.translation || ''; // Safety fallback

        div.appendChild(qText);
        div.appendChild(tText);

        div.onclick = () => {
            startAppFromList(mode, favData, index);
        };

        container.appendChild(div);
    });

    switchScreen('favoritesList');
}



const ui = {
    currentQ: document.getElementById('current-q'),
    totalQ: document.getElementById('total-q'),
    progressFill: document.getElementById('progress-fill'),
    score: document.getElementById('score'),
    sourceTag: document.getElementById('q-source'),
    modeTag: document.getElementById('q-mode'),
    questionText: document.getElementById('q-text'),
    contextText: document.getElementById('q-context'),
    choicesContainer: document.getElementById('choices-container'),
    explanationPanel: document.getElementById('explanation-panel'),
    expText: document.getElementById('exp-text'),
    finalScore: document.getElementById('final-score'),
    feedbackMsg: document.getElementById('feedback-msg')
};

// Utility: Shuffle Array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}



// ... existing code ...

function showStartScreen() {
    switchScreen('start');
    updateFavoriteCounts();
    updateMistakeCounts();
    updateWelcomeMessage(); // Refresh message
}

// ... existing code ...

function loadFavorites() {
    const saved = localStorage.getItem(FAV_KEY);
    if (saved) {
        try {
            favorites = new Set(JSON.parse(saved));
        } catch (e) {
            console.error('Failed to load favorites', e);
        }
    }
    updateFavoriteCounts();
}

function updateFavoriteCounts() {
    // Count items for each mode
    let vocabCount = 0;
    let fillCount = 0;

    favorites.forEach(id => {
        if (id.startsWith('vocab-')) vocabCount++;
        else if (id.startsWith('fill-')) fillCount++;
    });

    const vocabCountEl = document.getElementById('fav-count-vocab');
    const fillCountEl = document.getElementById('fav-count-fill');

    if (vocabCountEl) vocabCountEl.textContent = `${vocabCount}問`;
    if (fillCountEl) fillCountEl.textContent = `${fillCount}問`;
}

function toggleFavorite() {
    // Unique ID for favorite: "mode-id" (e.g. vocab-1)
    if (!currentState.mode || !currentState.questions[currentState.currentIndex]) return;

    const qId = currentState.questions[currentState.currentIndex].id;
    // Since IDs might duplicate across modes, prefix with mode
    const uniqueId = `${currentState.mode}-${qId}`;

    const btn = document.getElementById('fav-btn');

    if (favorites.has(uniqueId)) {
        favorites.delete(uniqueId);
        btn.classList.remove('active');
    } else {
        favorites.add(uniqueId);
        btn.classList.add('active');
    }

    // Save
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favorites)));
    // Note: Start screen counts update when we go back to start screen
}

function updateProgress() {
    const total = currentState.questions.length;
    const current = currentState.currentIndex + 1;
    ui.currentQ.textContent = current;
    ui.totalQ.textContent = total;
    ui.score.textContent = currentState.score;
    ui.progressFill.style.width = `${(current / total) * 100}%`;
}

function renderQuestion() {
    currentState.isAnswered = false;
    ui.explanationPanel.classList.add('hidden');

    const qFn = currentState.questions[currentState.currentIndex];

    // Determine mode: Priority to question's specific mode (for search/mixed), fallback to state mode
    const currentMode = qFn.mode || currentState.mode;

    // Set Tags
    ui.sourceTag.textContent = `Source: ${qFn.source}`;
    // Mode tag removed as per request

    // Set Text
    let contextHTML = '';
    let hiddenTranslation = '';

    if (currentMode === 'vocab') {
        ui.questionText.textContent = qFn.question; // The English Word

        // Parse "English" (Japanese)
        // Regex looks for the last parentheses group which likely contains the translation
        const exampleRaw = qFn.example || '';
        // Custom regex to handle full-width parents （） too
        const match = exampleRaw.match(/^(.+?)\s*[（(](.+)[)）]$/);

        if (match) {
            contextHTML = match[1]; // English part
            hiddenTranslation = match[2]; // Japanese part
        } else {
            contextHTML = exampleRaw;
        }

        // Apply Bold formatting for **text**
        contextHTML = contextHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        ui.contextText.innerHTML = contextHTML;

        // Store hidden translation in dataset or handled via state
        currentState.currentHiddenTranslation = hiddenTranslation;
        currentState.currentEnglishSentence = contextHTML;

    } else {
        // Fill mode
        // qFn.question is the sentence with (  )
        // Highlight the ( ) or format it with extra space
        // Adding 5 non-breaking spaces to simulate word length
        ui.questionText.innerHTML = qFn.question.replace('(', '<span class="highlight">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ').replace(')', ' )</span>');

        // Initial State for Fill Mode: Show Hint Button instead of Translation
        ui.contextText.innerHTML = ''; // Clear first
        const hintBtn = document.createElement('button');
        hintBtn.className = 'hint-btn';
        hintBtn.innerHTML = '<span class="icon">💡</span> 日本語訳（ヒント）を表示';
        hintBtn.onclick = () => {
            // Show translation with animation
            ui.contextText.innerHTML = `<span style="animation:fadeInUp 0.3s ease; display:block; padding:0.5rem; color:var(--text-main); font-weight:500;">${qFn.translation.replace(/\n/g, '<br>')}</span>`;
        };
        ui.contextText.appendChild(hintBtn);

        // Store translation (Sentence Translation) so it appears in the explanation panel
        currentState.currentHiddenTranslation = qFn.translation;

        // For Fill mode, display the completed sentence in explanation
        currentState.currentEnglishSentence = qFn.question.replace(/\(.*\)/, `<strong>${qFn.correct}</strong>`);
    }

    // Set Choices
    ui.choicesContainer.innerHTML = '';

    // Prepare choices: correct + distractors
    const choices = [
        { text: qFn.correct, isCorrect: true },
        ...qFn.distractors.map(d => ({ text: d, isCorrect: false }))
    ];

    // Shuffle choices
    shuffleArray(choices);

    choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<span style="position:relative; z-index:2;">${choice.text}</span>`;
        // Animation delay for nicer entrance
        btn.style.animation = `fadeInUp 0.3s ease forwards ${index * 0.1}s`;
        btn.onclick = () => handleAnswer(choice, btn, choices);
        // Store correctness in dataset for revealing later
        btn.dataset.isCorrect = choice.isCorrect;
        ui.choicesContainer.appendChild(btn);
    });

    // Hide Post Answer controls
    document.getElementById('post-answer-bar').classList.add('hidden');

    // Ensure explanation panel is hidden on new question
    ui.explanationPanel.classList.add('hidden');
}


// --- Search System ---
function handleSearchKey(e) {
    if (e.key === 'Enter') executeSearch();
}

function executeSearch() {
    const input = document.getElementById('search-input');
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    let results = [];
    if (typeof VOCAB_DATA !== 'undefined') {
        VOCAB_DATA.forEach(q => {
            // For Vocab: q.question
            if (q.question.toLowerCase().includes(query)) {
                results.push({ ...q, mode: 'vocab' });
            }
        });
    }
    if (typeof FILL_DATA !== 'undefined') {
        FILL_DATA.forEach(q => {
            // For Fill: q.correct is the target word
            if (q.correct.toLowerCase().includes(query)) {
                results.push({ ...q, mode: 'fill' });
            }
        });
    }

    if (results.length === 0) {
        alert('見つかりませんでした。');
        return;
    }

    openSearchList(query, results);
}

function openSearchList(query, results) {
    // Update Title
    const titleEl = document.getElementById('fav-list-title');
    if (titleEl) titleEl.textContent = '検索一覧';

    const container = document.getElementById('favorites-list-content');
    container.innerHTML = '';

    // Add dynamic header replacing the static one visually
    const header = document.createElement('h3');
    header.textContent = `検索結果: "${query}" (${results.length}件)`;
    header.style.textAlign = 'center';
    header.style.marginBottom = '1.5rem';
    header.style.color = 'var(--text-main)';
    container.appendChild(header);

    results.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'fav-list-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';

        let mainText = '';
        let subText = '';

        if (item.mode === 'vocab') {
            mainText = item.question;
            subText = item.correct; // Meaning
        } else {
            mainText = item.correct; // Target Word
            subText = item.translation; // Sentence Translation
        }

        // Tag
        const tag = document.createElement('span');
        tag.textContent = item.mode === 'vocab' ? 'Vocab' : 'Fill';
        tag.style.fontSize = '0.75rem';
        tag.style.background = item.mode === 'vocab' ? 'var(--primary)' : 'var(--accent)';
        tag.style.color = '#fff';
        tag.style.padding = '2px 6px';
        tag.style.borderRadius = '4px';
        tag.style.marginLeft = '1rem';

        div.innerHTML = `
            <div>
                <div class="fav-list-item-word">${mainText}</div>
                <div class="fav-list-item-translation" style="font-size:0.85rem; color:var(--text-sub);">${subText}</div>
            </div>
        `;
        div.appendChild(tag);

        div.onclick = () => {
            // Start mixed mode
            startAppFromList('mixed', results, index, 'search');
        };
        container.appendChild(div);
    });

    switchScreen('favoritesList');
}

function openFavoritesList(mode) {
    const listContainer = document.getElementById('favorites-list-content');
    listContainer.innerHTML = '';

    // Reset Title
    const titleEl = document.getElementById('fav-list-title');
    if (titleEl) titleEl.textContent = 'お気に入り一覧';

    const sourceData = mode === 'vocab' ? VOCAB_DATA : FILL_DATA;
    let items = [];

    // Collect items
    favorites.forEach(key => {
        const [m, id] = key.split('-');
        if (m === mode) {
            const item = sourceData.find(d => d.id == id);
            if (item) {
                items.push({ ...item, mode: m });
            }
        }
    });

    if (items.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; margin-top:2rem; color:var(--text-sub);">お気に入りはまだありません。</div>';
        switchScreen('favoritesList');
        return;
    }

    // Sort by ID
    items.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'fav-list-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';

        let mainText = '', subText = '';
        if (item.mode === 'vocab') {
            mainText = item.question;
            subText = item.correct;
        } else {
            mainText = item.correct;
            subText = item.translation;
        }

        div.innerHTML = `
            <div>
                <div class="fav-list-item-word">${mainText}</div>
                <div class="fav-list-item-translation" style="font-size:0.85rem; color:var(--text-sub);">${subText}</div>
            </div>
            <div style="font-size:0.8rem; color:var(--text-sub);">ID:${item.id}</div>
        `;

        div.onclick = () => {
            startAppFromList(mode, items, index, 'favorites');
        };

        listContainer.appendChild(div);
    });

    switchScreen('favoritesList');
}



function openExplanation() {
    ui.explanationPanel.classList.remove('hidden');
}

function closeExplanation() {
    ui.explanationPanel.classList.add('hidden');
}

function showExplanation(isCorrect, justRender = false) {
    const qFn = currentState.questions[currentState.currentIndex];

    // Update Favorite Btn State
    updateFavoriteBtn();

    let expRaw = qFn.explanation;
    let expBody = '';

    // Normalize tags to standard format
    expRaw = expRaw.replace('【正解のポイント】', '【正解】').replace('【紛らわしい選択肢】', '【誤答】');

    // Check if we have formatted explanation with tags
    const correctTag = '【正解】';
    const wrongTag = '【誤答】';

    if (expRaw.includes(correctTag) && expRaw.includes(wrongTag)) {
        // Parsing
        const correctTagIdx = expRaw.indexOf(correctTag);
        const wrongIdx = expRaw.indexOf(wrongTag);

        // Preamble (Text before the first tag, e.g., Sentence Translation)
        let preText = expRaw.substring(0, correctTagIdx).trim();
        if (preText) {
            expBody += `<div style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #e5e7eb; line-height:1.6;">${preText}</div>`;
        }

        let correctText = expRaw.substring(correctTagIdx + correctTag.length, wrongIdx).trim();
        let wrongText = expRaw.substring(wrongIdx + wrongTag.length).trim();

        // Regex to match "Word (Meaning)" pattern for swap
        wrongText = wrongText.replace(/([a-zA-Z\s]+)\s*[（(]([^)）]+)[)）]/g, '$2 ($1)');

        expBody += `<div class="exp-section">
            <h4><span class="icon">✅</span> 正解のポイント</h4>
            <p>${correctText}</p>
        </div>`;

        expBody += `<div class="exp-section wrong-choices">
            <h4><span class="icon">⚠️</span> 紛らわしい選択肢</h4>
            <p>${wrongText}</p>
        </div>`;
    } else {
        // Fallback for data without tags (simple display)
        expBody = `<p>${expRaw.replace(/\n/g, '<br>')}</p>`;
    }

    let topContent = '';

    // Add Result Header
    const resultText = isCorrect ? '⭕ 正解！' : '❌ 不正解...';
    const resultColor = isCorrect ? 'var(--correct)' : 'var(--wrong)';
    topContent += `<div style="text-align:center; font-size:1.5rem; font-weight:800; color:${resultColor}; margin-bottom:1rem;">${resultText}</div>`;

    // Add English Sentence
    if (currentState.currentEnglishSentence) {
        topContent += `<div style="margin-bottom:0.5rem; font-size:1.1rem; line-height:1.4;">${currentState.currentEnglishSentence}</div>`;
    }

    // Add Translation (Vocab mode) OR Meaning (Fill mode)
    if (currentState.currentHiddenTranslation) {
        topContent += `<div style="font-weight:bold; color:var(--text-sub); margin-bottom:1rem;">訳: ${currentState.currentHiddenTranslation}</div>`;
    }

    let finalHTML = '';
    if (topContent) {
        finalHTML += `<div class="translation-box">${topContent}</div>`;
    }
    finalHTML += expBody;

    ui.expText.innerHTML = finalHTML;

    if (!justRender) {
        ui.explanationPanel.classList.remove('hidden');
    }
}

function prevQuestion() {
    if (currentState.currentIndex > 0) {
        currentState.currentIndex--;
        updateProgress();
        renderQuestion();
        // Previous question should probably be in "answered" state if going back?
        // For simplicity in this prototype, we'll re-render it fresh allowing re-answer, 
        // or we could store answered state per question index.
        // User didn't specify, but "review" usually implies seeing the answer again.
        // Let's just treat it as a fresh render for now to keep it simple, 
        // as storing history was not explicitly requested beyond "go back".
    }
}

function nextQuestion() {
    if (currentState.currentIndex < currentState.questions.length - 1) {
        currentState.currentIndex++;
        updateProgress();
        renderQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    const total = currentState.questions.length;
    const score = currentState.score;
    const percentage = (score / total) * 100;

    ui.finalScore.textContent = `${score} / ${total}`;

    let msg = '';
    if (percentage === 100) msg = 'Perfect! 素晴らしい！';
    else if (percentage >= 80) msg = 'Great Job! その調子！';
    else if (percentage >= 60) msg = 'Good! あと少し！';
    else msg = 'Keep Practicing! 復習しよう！';

    ui.feedbackMsg.textContent = msg;
    switchScreen('result');
}



function updateFavoriteBtn() {
    if (!currentState.mode || !currentState.questions[currentState.currentIndex]) return;

    const qId = currentState.questions[currentState.currentIndex].id;
    const uniqueId = `${currentState.mode}-${qId}`;
    const btn = document.getElementById('fav-btn');

    if (favorites.has(uniqueId)) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

// Simple Audio Context or HTML5 Audio
function playAudio(type) {
    // Optional: Add simple audio feedback
    // const audio = new Audio(`sounds/${type}.mp3`);
    // audio.play().catch(e => {});
}

// Initialize
// Check if data loaded
if (typeof VOCAB_DATA === 'undefined' || typeof FILL_DATA === 'undefined') {
    alert('Error: Data not loaded. Check data.js');
}

// Load favs on start
// Load favs on start
loadFavorites();

// --- Settings Logic ---
const SETTINGS_KEY = 'vocabMaster_settings';
let userSettings = {
    name: '',
    theme: 'default'
};

// Cheer Messages
const CHEER_MESSAGES = {
    morning: [ // 4-9
        "おはようございます！朝の勉強は効果抜群です！",
        "素晴らしい朝ですね！今日も一日頑張りましょう！",
        "早起きは三文の徳。集中力が高まっています！"
    ],
    day: [ // 9-17
        "こんにちは！隙間時間を活用して語彙力アップ！",
        "継続は力なり。一歩ずつ進んでいきましょう。",
        "良い調子ですね！この調子で解いていきましょう！"
    ],
    evening: [ // 17-20
        "お疲れ様です！今日の仕上げに語彙チェック！",
        "夕方のひと踏ん張り。ここでの努力が差をつけます！",
        "リラックスしながら、少しずつ進めましょう。"
    ],
    night: [ // 20-0
        "こんばんは！寝る前の暗記は記憶に定着しやすいですよ。",
        "今日一日の積み重ねをここで形にしましょう。",
        "今日も一日お疲れ様でした。ラストスパート！"
    ],
    late: [ // 0-4
        "夜遅くまでお疲れ様です！無理せず頑張ってくださいね。",
        "静かな夜は集中するチャンス。でも睡眠も大切に！",
        "すごい集中力です！でも明日に備えて休憩も忘れずに。"
    ]
};

function updateWelcomeMessage() {
    const hours = new Date().getHours();
    let timeKey = 'day';

    if (hours >= 4 && hours < 9) {
        timeKey = 'morning';
    } else if (hours >= 9 && hours < 17) {
        timeKey = 'day';
    } else if (hours >= 17 && hours < 20) {
        timeKey = 'evening';
    } else if (hours >= 20 || hours <= 23) {
        timeKey = 'night';
    }

    if (hours >= 0 && hours < 4) {
        timeKey = 'late';
    }

    const messages = CHEER_MESSAGES[timeKey];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const name = userSettings.name || 'ゲスト';

    const el = document.getElementById('welcome-message');
    if (el) {
        el.innerHTML = `Welcome, ${name}さん。<br>${randomMsg}`;
    }
}

const settingsModal = document.getElementById('settings-modal');
const userNameInput = document.getElementById('user-name-input');
// const userGreeting = document.getElementById('user-greeting'); // Removed from HTML

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        try {
            userSettings = { ...userSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Json parse error', e);
        }
    }
    applySettings();
}

function applySettings() {
    // Apply Theme
    document.body.className = ''; // Reset
    if (userSettings.theme !== 'default') {
        document.body.classList.add(`theme-${userSettings.theme}`);
    }

    // Apply Name & Message
    updateWelcomeMessage();
}

function openSettings() {
    settingsModal.classList.remove('hidden');
    // Pre-fill inputs
    userNameInput.value = userSettings.name;
    // Highlight current theme
    updateThemeSelectionUI(userSettings.theme);
}

function closeSettings() {
    settingsModal.classList.add('hidden');
    // Revert to saved settings (cancels preview if not saved)
    applySettings();
}

function selectTheme(themeName) {
    updateThemeSelectionUI(themeName);
    // Instant Preview: Apply to body immediately
    document.body.className = '';
    if (themeName !== 'default') {
        document.body.classList.add(`theme-${themeName}`);
    }
}

function updateThemeSelectionUI(activeTheme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === activeTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function saveSettings() {
    const newName = userNameInput.value.trim();
    const activeBtn = document.querySelector('.theme-btn.active');
    const newTheme = activeBtn ? activeBtn.dataset.theme : 'default';

    userSettings = {
        name: newName,
        theme: newTheme
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    applySettings();
    closeSettings();
}

// ...

// Range Practice Logic
function startMode(mode) {
    const rawData = mode === 'vocab' ? VOCAB_DATA : FILL_DATA;
    if (!rawData || rawData.length === 0) {
        alert('データが読み込まれていません。');
        return;
    }

    const startInput = document.getElementById(`${mode}-start`);
    const endInput = document.getElementById(`${mode}-end`);
    const randomInput = document.getElementById(`${mode}-random`);

    let start = parseInt(startInput.value);
    let end = parseInt(endInput.value);
    let isRandom = randomInput.checked;

    if (isNaN(start) || start < 1) start = 1;
    if (isNaN(end) || end > rawData.length) end = rawData.length;
    if (start > end) {
        alert('範囲指定が不正です（開始番号が終了番号より大きいです）。');
        return;
    }

    // Filter
    const filtered = rawData.filter(d => {
        const id = parseInt(d.id);
        return id >= start && id <= end;
    });

    if (filtered.length === 0) {
        alert('指定された範囲に問題がありません。');
        return;
    }

    currentState.mode = mode;
    currentState.questions = [...filtered];

    if (isRandom) {
        shuffleArray(currentState.questions);
    } else {
        currentState.questions.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    }

    currentState.currentIndex = 0;
    currentState.score = 0;
    currentState.isAnswered = false;
    currentState.filterType = 'range';

    // Nav Buttons
    document.getElementById('quiz-top-btn').classList.remove('hidden');
    const returnBtn = document.getElementById('quiz-list-return');
    if (returnBtn) returnBtn.classList.add('hidden');

    updateProgress();
    renderQuestion();
    switchScreen('quiz');
}

function updateModeCounts() {
    const vocabMax = typeof VOCAB_DATA !== 'undefined' ? VOCAB_DATA.length : 0;
    const fillMax = typeof FILL_DATA !== 'undefined' ? FILL_DATA.length : 0;

    // Display Totals
    const vTotal = document.getElementById('vocab-total');
    const fTotal = document.getElementById('fill-total');
    if (vTotal) vTotal.textContent = vocabMax;
    if (fTotal) fTotal.textContent = fillMax;

    // Set Input Max and Default Values if empty
    const vEnd = document.getElementById('vocab-end');
    if (vEnd) {
        vEnd.max = vocabMax;
        if (!vEnd.value) vEnd.value = vocabMax;
    }
    const vStart = document.getElementById('vocab-start');
    if (vStart) vStart.max = vocabMax;

    const fEnd = document.getElementById('fill-end');
    if (fEnd) {
        fEnd.max = fillMax;
        if (!fEnd.value) fEnd.value = fillMax;
    }
    const fStart = document.getElementById('fill-start');
    if (fStart) fStart.max = fillMax;
}

// ...

// ...

function generatePDF(type, targetMode) {
    let items = [];
    const sourceSet = type === 'favorites' ? favorites : mistakes;
    let title = type === 'favorites' ? 'お気に入りリスト' : 'ミス単語リスト';

    if (targetMode === 'vocab') title += '（日本語訳選択）';
    else if (targetMode === 'fill') title += '（英語空所補充）';

    if (sourceSet.size === 0) {
        alert('リストが空です。');
        return;
    }

    // data is strings "mode-id"
    sourceSet.forEach(key => {
        const [mode, id] = key.split('-');

        // Filter by target mode
        if (mode !== targetMode) return;

        const sourceData = mode === 'vocab' ? VOCAB_DATA : FILL_DATA;
        const item = sourceData.find(d => d.id == id);
        if (item) {
            let main, sub;
            if (mode === 'vocab') {
                main = item.question;
                sub = item.correct;
            } else {
                main = item.correct;
                // Try to find meaning in VOCAB_DATA
                const vocabMatch = VOCAB_DATA.find(v => v.question === item.correct);
                if (vocabMatch) {
                    sub = vocabMatch.correct;
                } else {
                    // Try to extract from explanation: word（Meaning）
                    const escaped = main.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escaped + '[^（]*（([^）]+)）');
                    const match = item.explanation.match(regex);
                    if (match && match[1]) {
                        sub = match[1];
                    } else {
                        sub = item.translation; // Fallback
                    }
                }
            }
            items.push({ main, sub, mode });
        }
    });

    if (items.length === 0) {
        alert('指定されたモードのデータがありません。');
        return;
    }

    // Chunk into 50
    const pages = [];
    for (let i = 0; i < items.length; i += 50) {
        pages.push(items.slice(i, i + 50));
    }

    // ... rest of PDF generation ...

    // Generate HTML
    const win = window.open('', '_blank');
    if (!win) {
        alert('ポップアップがブロックされました。');
        return;
    }

    win.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page { size: A4; margin: 20mm; }
                body { 
                    font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", sans-serif; 
                    color: #333; 
                    margin: 0; 
                    padding: 0 5mm; /* Extra padding for safety */
                }
                .page { 
                    width: 100%; 
                    min-height: 250mm;
                    box-sizing: border-box; 
                    column-count: 2; 
                    column-gap: 15mm; 
                    page-break-after: always;
                }
                .page:last-child { page-break-after: auto; }
                .header-title { 
                    column-span: all; 
                    text-align: center; 
                    margin-bottom: 5mm; 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 2mm; 
                    font-size: 14pt;
                    font-weight: bold;
                }
                .item { 
                    break-inside: avoid; 
                    margin-bottom: 4mm; 
                    padding-bottom: 2mm; 
                    border-bottom: 1px dotted #ccc; 
                }
                .main { font-weight: bold; font-size: 11pt; margin-bottom: 1mm;}
                .sub { font-size: 9pt; color: #444; line-height: 1.4; }
                .meta { font-size: 7pt; color: #999; text-align: right; margin-top: 1mm; }
            </style>
        </head>
        <body>
    `);

    pages.forEach((pageItems, pageIdx) => {
        win.document.write(`<div class="page">`);
        win.document.write(`<div class="header-title">${title} (${pageIdx + 1}/${pages.length})</div>`);

        pageItems.forEach(item => {
            win.document.write(`
                <div class="item">
                    <div class="main">${item.main}</div>
                    <div class="sub">${item.sub}</div>
                    <div class="meta">${item.mode === 'vocab' ? 'Vocab' : 'Fill'}</div>
                </div>
            `);
        });

        win.document.write(`</div>`);
    });

    win.document.write(`</body></html>`);
    win.document.close();

    // Win print after delay to allow styles to parse
    setTimeout(() => {
        win.focus();
        win.print();
    }, 500);
}

// --- Range Settings Auto-Save ---
const RANGE_KEY = 'vocabMaster_rangeSettings';

function saveRangeSettings() {
    const settings = {
        vocabStart: document.getElementById('vocab-start').value,
        vocabEnd: document.getElementById('vocab-end').value,
        fillStart: document.getElementById('fill-start').value,
        fillEnd: document.getElementById('fill-end').value
    };
    localStorage.setItem(RANGE_KEY, JSON.stringify(settings));
}

function loadRangeSettings() {
    const saved = localStorage.getItem(RANGE_KEY);
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);
        const vs = document.getElementById('vocab-start');
        const ve = document.getElementById('vocab-end');
        const fs = document.getElementById('fill-start');
        const fe = document.getElementById('fill-end');

        if (vs && settings.vocabStart) vs.value = settings.vocabStart;
        if (ve && settings.vocabEnd) ve.value = settings.vocabEnd;
        if (fs && settings.fillStart) fs.value = settings.fillStart;
        if (fe && settings.fillEnd) fe.value = settings.fillEnd;
    } catch (e) {
        console.error('Failed to load range settings', e);
    }
}

// Attach listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-input').forEach(input => {
        input.addEventListener('change', saveRangeSettings);
        input.addEventListener('input', saveRangeSettings);
    });
});


// Initial Load
loadSettings();
loadFavorites();
updateModeCounts();
loadRangeSettings(); // Load user ranges after init

// Force scroll to top on load
window.scrollTo(0, 0);
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.scrollTop = 0);
});
