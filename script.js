// =============================================
// Auth Guard — redirect to login if not logged in
// =============================================
const API = (typeof STUDYCARDS_API_URL !== 'undefined')
    ? STUDYCARDS_API_URL
    : 'http://localhost:3001';
const token = localStorage.getItem('sc_token');
let currentUser = null;

async function checkAuth() {
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    try {
        const res = await fetch(`${API}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            localStorage.removeItem('sc_token');
            localStorage.removeItem('sc_user');
            window.location.href = 'login.html';
            return false;
        }
        const data = await res.json();
        currentUser = data.user;
        renderUserBadge();
        return true;
    } catch (err) {
        // Server offline — allow app to function with cached user
        const cached = localStorage.getItem('sc_user');
        if (cached) {
            currentUser = JSON.parse(cached);
            renderUserBadge();
            return true;
        }
        window.location.href = 'login.html';
        return false;
    }
}

function renderUserBadge() {
    const badge = document.getElementById('user-badge');
    if (badge && currentUser) {
        const firstName = currentUser.name.split(' ')[0];
        badge.textContent = currentUser.plan === 'pro'
            ? `⭐ ${firstName}`
            : firstName;
    }
}

// Logout
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    window.location.href = 'login.html';
});

// =============================================
// Paywall Modal
// =============================================
const paywallModal = document.getElementById('paywall-modal');
const btnClosePaywall = document.getElementById('btn-close-paywall');
const btnUpgrade = document.getElementById('btn-upgrade');

btnClosePaywall?.addEventListener('click', () => paywallModal.classList.add('hidden'));
paywallModal?.addEventListener('click', (e) => {
    if (e.target === paywallModal) paywallModal.classList.add('hidden');
});

btnUpgrade?.addEventListener('click', async () => {
    btnUpgrade.disabled = true;
    btnUpgrade.innerHTML = '<div style="width:18px;height:18px;border:3px solid rgba(255,255,255,.3);border-left-color:white;border-radius:50%;animation:spin 0.8s linear infinite;"></div>';
    try {
        const res = await fetch(`${API}/upgrade`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser.plan = 'pro';
            localStorage.setItem('sc_user', JSON.stringify(currentUser));
            renderUserBadge();
            paywallModal.classList.add('hidden');
            btnUpgrade.innerHTML = '<i class="fa-solid fa-check"></i> Upgraded!';
            // Allow upload now — re-trigger file picker
            setTimeout(() => fileInput.click(), 300);
        }
    } catch {
        btnUpgrade.innerHTML = 'Server offline. Try again.';
    } finally {
        setTimeout(() => {
            btnUpgrade.disabled = false;
            btnUpgrade.innerHTML = '<i class="fa-solid fa-rocket"></i> Upgrade Now';
        }, 2500);
    }
});

// =============================================
// State Management
// =============================================
let flashcards = [
    {
        front: "What is the primary function of CSS?",
        back: "Used to format the layout and design of web pages."
    },
    {
        front: "Explain what DOM stands for.",
        back: "Document Object Model"
    },
    {
        front: "What does an API do?",
        back: "Allows two applications to talk to each other."
    },
    {
        front: "What is a 'Promise' in JavaScript?",
        back: "An object representing the eventual completion or failure of an asynchronous operation."
    },
    {
        front: "What does HTTP stand for?",
        back: "Hypertext Transfer Protocol"
    }
];

let currentIndex = 0;
let isFlipped = false;

// DOM Elements
const flashcardEl = document.getElementById('flashcard');
const frontContent = document.getElementById('card-front-content');
const backContent = document.getElementById('card-back-content');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnFlip = document.getElementById('btn-flip');
const cardCounter = document.getElementById('card-counter');
const progressEl = document.getElementById('progress');

const btnToggleForm = document.getElementById('btn-toggle-form');
const addCardForm = document.getElementById('add-card-form');
const questionInput = document.getElementById('question-input');
const answerInput = document.getElementById('answer-input');

// Add Document Parsing Elements
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const settingsModal = document.getElementById('settings-modal');
const apiKeyInput = document.getElementById('api-key-input');
const btnSaveKey = document.getElementById('btn-save-key');
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const loadingState = document.getElementById('loading-state');
const loadingText = document.getElementById('loading-text');

// Initialize
function init() {
    // Load API Key from local storage if exists
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) apiKeyInput.value = savedKey;

    updateCard();

    // Event Listeners
    flashcardEl.addEventListener('click', flipCard);
    btnFlip.addEventListener('click', flipCard);

    btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextCard();
    });

    btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        prevCard();
    });

    // Form Event Listeners
    btnToggleForm.addEventListener('click', () => {
        addCardForm.classList.toggle('hidden');
        if (!addCardForm.classList.contains('hidden')) {
            questionInput.focus();
            btnToggleForm.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancel';
        } else {
            btnToggleForm.innerHTML = '<i class="fa-solid fa-plus"></i> Add Manual Card';
        }
    });

    addCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addNewCard();
    });

    // Settings Modal Listeners
    btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    btnSaveKey.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('geminiApiKey', key);
            const originalText = btnSaveKey.innerHTML;
            btnSaveKey.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
            setTimeout(() => {
                btnSaveKey.innerHTML = originalText;
                settingsModal.classList.add('hidden');
            }, 1000);
        }
    });

    // Drag and Drop Upload Listeners
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Prevent triggering when typing in inputs
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

        if (e.key === 'ArrowRight') nextCard();
        else if (e.key === 'ArrowLeft') prevCard();
        else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            flipCard();
        }
    });
}

// Actions
function updateCard() {
    if (flashcards.length === 0) {
        frontContent.textContent = "No cards available.";
        backContent.textContent = "Add some cards!";
        cardCounter.textContent = "0 of 0";
        progressEl.style.width = "0%";
        btnPrev.disabled = true;
        btnNext.disabled = true;
        return;
    }

    const currentCard = flashcards[currentIndex];
    flashcardEl.style.opacity = '0';

    setTimeout(() => {
        frontContent.textContent = currentCard.front;
        backContent.textContent = currentCard.back;

        if (isFlipped) {
            flashcardEl.classList.remove('flipped');
            isFlipped = false;
        }

        cardCounter.textContent = `Card ${currentIndex + 1} of ${flashcards.length}`;
        updateProgress();
        updateButtons();

        flashcardEl.style.opacity = '1';
    }, 200);
}

function updateProgress() {
    if (flashcards.length === 0) return;
    const percentage = ((currentIndex + 1) / flashcards.length) * 100;
    progressEl.style.width = `${percentage}%`;
}

function updateButtons() {
    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex >= flashcards.length - 1;
}

function flipCard() {
    if (flashcards.length === 0) return;
    isFlipped = !isFlipped;
    flashcardEl.classList.toggle('flipped');
}

function nextCard() {
    if (currentIndex < flashcards.length - 1) {
        currentIndex++;
        updateCard();
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCard();
    }
}

function addNewCard() {
    const front = questionInput.value.trim();
    const back = answerInput.value.trim();

    if (front && back) {
        flashcards.push({ front, back });

        // Reset form
        questionInput.value = '';
        answerInput.value = '';
        addCardForm.classList.add('hidden');
        btnToggleForm.innerHTML = '<i class="fa-solid fa-plus"></i> Add Manual Card';

        // Go to new card
        currentIndex = flashcards.length - 1;
        updateCard();

        // Success feedback
        const originalText = btnToggleForm.innerHTML;
        const originalColor = btnToggleForm.style.color;
        btnToggleForm.innerHTML = '<i class="fa-solid fa-check"></i> Added Successfully!';
        btnToggleForm.style.background = 'rgba(74, 222, 128, 0.2)';
        btnToggleForm.style.borderColor = '#4ade80';
        btnToggleForm.style.color = '#4ade80';

        setTimeout(() => {
            btnToggleForm.innerHTML = originalText;
            btnToggleForm.style.background = 'transparent';
            btnToggleForm.style.borderColor = 'rgba(255,255,255,0.3)';
            btnToggleForm.style.color = originalColor;
        }, 2000);
    }
}

// Document Processing Logic
async function handleFileUpload(file) {
    // Paywall: only Pro users can upload documents
    if (!currentUser || currentUser.plan !== 'pro') {
        paywallModal.classList.remove('hidden');
        return;
    }

    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        alert('Please enter your Gemini API Key in Settings first.');
        settingsModal.classList.remove('hidden');
        return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();

    uploadZone.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
        loadingText.textContent = `Extracting text from ${file.name}...`;
        let extractedText = '';

        if (fileExtension === 'pdf') {
            extractedText = await extractTextFromPDF(file);
        } else if (fileExtension === 'docx') {
            extractedText = await extractTextFromDocx(file);
        } else {
            throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
        }

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Could not extract any text from the document.');
        }

        loadingText.textContent = 'AI is generating flashcards...';
        await generateFlashcardsFromText(extractedText, apiKey);

    } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
    } finally {
        uploadZone.classList.remove('hidden');
        loadingState.classList.add('hidden');
        fileInput.value = ''; // Reset file input
    }
}

async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';

                // Read up to the first 15 pages to avoid massive prompts
                const maxPages = Math.min(pdf.numPages, 15);

                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + ' \n';
                }
                resolve(fullText);
            } catch (err) {
                reject(new Error('Failed to parse PDF file.'));
            }
        };
        fileReader.readAsArrayBuffer(file);
    });
}

function extractTextFromDocx(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            try {
                const arrayBuffer = this.result;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                // Limit text length to avoid token limits
                resolve(result.value.substring(0, 30000));
            } catch (err) {
                reject(new Error('Failed to parse DOCX file.'));
            }
        };
        fileReader.readAsArrayBuffer(file);
    });
}

async function generateFlashcardsFromText(text, apiKey) {
    const prompt = `
    You are an expert tutor creating study flashcards from a provided document.
    Create exactly 5 high-quality Question & Answer pairs based on the most important concepts in the text below.
    Format your response AS A PURE JSON ARRAY exactly like this example, with no markdown formatting or extra text:
    [
      {"front": "Question 1", "back": "Answer 1"},
      {"front": "Question 2", "back": "Answer 2"}
    ]
    
    TEXT TO ANALYZE:
    ${text.substring(0, 20000)} // truncate to prevent extremely large payloads
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3, // Lower temperature for more factual extraction
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to reach Google Gemini API');
        }

        const data = await response.json();
        const aiResponseText = data.candidates[0].content.parts[0].text;

        // Clean up response if the AI wrapped it in markdown blocks
        let cleanJsonStr = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const generatedCards = JSON.parse(cleanJsonStr);

        if (Array.isArray(generatedCards) && generatedCards.length > 0) {
            flashcards = [...flashcards, ...generatedCards];
            currentIndex = flashcards.length - generatedCards.length; // jump to first new card
            updateCard();

            // Temporary success indicator
            const originalHTML = uploadZone.innerHTML;
            uploadZone.innerHTML = '<i class="fa-solid fa-check" style="color:#4ade80"></i><p style="color:#4ade80">Added ' + generatedCards.length + ' new cards!</p>';
            uploadZone.style.borderColor = '#4ade80';

            setTimeout(() => {
                uploadZone.innerHTML = originalHTML;
                uploadZone.style.borderColor = '';
            }, 3000);
        } else {
            throw new Error("AI didn't return a valid array of flashcards.");
        }

    } catch (error) {
        throw new Error(`AI Generation failed: ${error.message}`);
    }
}

// Start app — run auth check first, then init
(async () => {
    const authed = await checkAuth();
    if (authed) init();
})();
