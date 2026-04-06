// === CONFIGURATION (Secured with Netlify Proxy) ===
const API_URL = "/.netlify/functions/groq-proxy";
const API_TIMEOUT = 25000; // 25 seconds
const MAX_CONTEXT_LENGTH = 4000;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const TYPING_SPEED = 10; // ms per character (fast but readable)

// === STATE ===
let isListening = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let voiceGender = 'male'; // 'male' or 'female'
let isProcessing = false; // Prevent multiple simultaneous requests
let conversationHistory = []; // Stores last N exchanges for context memory
const MAX_HISTORY = 3; // Number of conversation pairs to remember

// === DOM ELEMENTS ===
let container, header, outputZone, inputField, micBtn, navBtns, btnClose, btnRefresh;

// === INITIALIZATION ===
function initJARVIS() {
    // 0. Initialize DOM Elements
    container = document.getElementById('jarvis-container');
    header = document.getElementById('jarvis-header');
    outputZone = document.getElementById('jarvis-output');
    inputField = document.getElementById('j-input');
    micBtn = document.getElementById('j-mic');
    navBtns = document.querySelectorAll('.jarvis-btn-trigger');
    btnClose = document.getElementById('j-close');
    btnRefresh = document.getElementById('j-refresh');

    if (!container) return; // Exit if JARVIS HTML is missing

    // 1. Setup Voice Recognition
    setupRecognition();

    // 2. Setup Event Listeners
    setupEvents();

    // 3. Setup Accessibility
    setupAccessibility();

    // 4. Setup Keyboard Shortcuts
    setupKeyboardShortcuts();
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to toggle JARVIS
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.toggleJarvis();
        }
        // Escape to close JARVIS
        if (e.key === 'Escape' && container && container.classList.contains('open')) {
            e.preventDefault();
            container.classList.remove('open');
            setTimeout(() => {
                container.style.display = 'none';
                document.body.classList.remove('no-scroll');
                if (recognition && isListening) recognition.stop();
                synthesis.cancel();
            }, 600);
        }
    });
}

function setupEvents() {
    // Navbar Activator
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.toggleJarvis();
            speak("Interface expanded.");
        });
    });

    // Window Controls
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            container.classList.remove('open');
            setTimeout(() => {
                container.style.display = 'none';
                document.body.classList.remove('no-scroll');
                if (recognition && isListening) recognition.stop();
                synthesis.cancel();
            }, 600);
        });
    }

    // Refresh Button - RESET UI
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            // Clear Chat
            outputZone.innerHTML = '';

            // Clear conversation history
            conversationHistory = [];

            // Show Welcome
            const welcomeScreen = document.getElementById('j-welcome');
            if (welcomeScreen) welcomeScreen.style.display = 'flex';

            // Reset Input
            inputField.value = '';

            speak("Interface reset. Memory cleared. Ready for new queries.");
        });
    }

    // Mic Button - Opens Full-Screen Voice Mode
    const micBtn2 = micBtn || document.getElementById('j-mic');
    if (micBtn2) {
        micBtn2.addEventListener('click', () => {
            openVoiceMode();
        });
    }

    // Setup Voice Mode controls
    setupVoiceMode();

    // Text Input - Enter key
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = inputField.value.trim();
            if (text) {
                addMessage(text, 'user');
                processCommand(text);
                inputField.value = '';
            }
        }
    });

    // Send Button
    const sendBtn = document.getElementById('j-send');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const text = inputField.value.trim();
            if (text) {
                addMessage(text, 'user');
                processCommand(text);
                inputField.value = '';
            }
        });
    }

    // Quick Action Pills
    const quickPills = document.querySelectorAll('.quick-pill');
    quickPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const query = pill.dataset.query;
            if (query) {
                addMessage(query, 'user');
                processCommand(query);
            }
        });
    });
}

// === ACCESSIBILITY ===
function setupAccessibility() {
    // Add ARIA labels
    if (container) {
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'JARVIS AI Assistant');
    }
    if (inputField) {
        inputField.setAttribute('aria-label', 'Command input field');
    }
    if (micBtn) {
        micBtn.setAttribute('aria-label', 'Voice command button');
    }
}

// === DRAG LOGIC ===
function dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    // Use the header element directly for dragging
    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;

        const rect = elmnt.getBoundingClientRect();
        elmnt.style.transform = "none";
        elmnt.style.top = rect.top + "px";
        elmnt.style.left = rect.left + "px";
        elmnt.style.bottom = "auto";
        elmnt.style.right = "auto";

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// === SPEECH RECOGNITION ===
function setupRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            if (micBtn) micBtn.classList.add('listening');
        };

        recognition.onend = () => {
            isListening = false;
            if (micBtn) micBtn.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            addMessage(transcript, 'user');
            processCommand(transcript);
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            if (micBtn) micBtn.classList.remove('listening');
            isListening = false;

            if (event.error === 'no-speech') {
                // Silent — user just didn't speak
            } else if (event.error === 'audio-capture') {
                addMessage('🎤 Microphone not detected. Please check your audio input device.', 'jarvis error');
            } else if (event.error === 'not-allowed') {
                addMessage('🔒 Microphone access denied. Please allow microphone permissions in your browser settings.', 'jarvis error');
            }
        };
    } else {
        console.warn("JARVIS: Web Speech API not supported in this browser.");
    }
}

// === JARVIS SYSTEM PROMPT ===
function buildSystemPrompt(context) {
    return `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the ultra-advanced AI assistant serving Shaik Irfan Basha — an Artificial Intelligence Architect.

CORE PROTOCOLS:
1. **Multilingual**: If the user speaks in a non-English language (Hindi, Telugu, Arabic, etc.), REPLY IN THAT SAME LANGUAGE.
2. **Persona**: You are sophisticated, witty, and efficient — exactly like JARVIS from Iron Man. Use dry humor sparingly. Address the user as "Sir" or "Ma'am" once per conversation, not every message. Be CONCISE — aim for 2-4 short paragraphs max. Use bullet points for lists. Never be verbose.
3. **Formatting**: Use **bold** for emphasis, bullet points (- ) for lists, and \`code\` for technical terms. Keep paragraphs SHORT (2-3 sentences max).
4. **Rich Project Format**: When asked about a specific project, format output as:
   :::PROJECT_CARD
   img: [image_url_or_placeholder]
   title: [Project Name]
   type: [Mobile App / Web App]
   tech: [Tech1, Tech2, Tech3]
   desc: [Brief 1-sentence description]
   link: [View Project URL]
   :::
   Then add a short conversational comment.
4. **Context**: Use the provided portfolio data to answer questions about Irfan accurately.

KEY FACTS ABOUT SHAIK IRFAN BASHA:
- AI & Software Architect from Kurnool, Andhra Pradesh, India
- Currently pursuing Diploma in Artificial Intelligence at Govt. Polytechnic, Bethamcherla (2023-2026)
- Active AIML + Gen AI Intern at JASIQ Labs (March 2026 – Present): LLM pipeline architecture, RAG systems, model fine-tuning
- Active AI & ML Intern at Evoastra Ventures (January 2026 – Present): Built NL-to-SQL engine with WikiSQL & Groq API
- Key Projects: Alpha AI (unified 10-model LLM platform), Al-Haqq (Islamic knowledge platform with 114 Surahs + AI Q&A), JARVIS AI Assistant (real-time multimodal with Gemini 2.0), NL-to-SQL Engine, Legacy Code Analyzer
- Skills: Python, Java, C, JavaScript, SQL, AI/ML, Deep Learning, NLP, Computer Vision, LLMs, React.js, RESTful APIs
- Certifications: AI Mastery Bootcamp, AWS Cloud Computing, Power BI Analytics, RPA, Excel VBA
- Portfolio: https://irfan-basha-portfolio.netlify.app/
- GitHub: https://github.com/shaik-irfan-basha
- LinkedIn: https://www.linkedin.com/in/shaik-irfan-basha
- Email: muhammadirfanbasha@gmail.com

LIVE PAGE CONTEXT:
${context}`;
}

// === CORE AI LOGIC ===
async function processCommand(input) {
    // Prevent multiple simultaneous requests
    if (isProcessing) {
        addMessage('Please wait for the current request to complete.', 'jarvis');
        return;
    }

    isProcessing = true;

    // UI TRANSITION: Hide Welcome, Show Chat
    const welcomeScreen = document.getElementById('j-welcome');
    const outputZone = document.getElementById('jarvis-output');

    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
        outputZone.style.display = 'flex';
    }

    // Jarvis-style Thinking State Animation
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'thinking-box';
    thinkingMsg.innerHTML = `
        <i class='bx bx-bot'></i>
        <div class="thinking-content">
            <div class="thinking-text">Just Wait!!! <div class="thinking-dots"><span></span><span></span><span></span></div></div>
            <div class="thinking-sub">Analyzing your question & searching knowledge base</div>
        </div>
    `;
    outputZone.appendChild(thinkingMsg);
    outputZone.scrollTop = outputZone.scrollHeight;

    try {
        const context = getPageContext();
        const systemPrompt = buildSystemPrompt(context);

        // Build messages array with conversation history for context
        const messages = [
            { role: "system", content: systemPrompt }
        ];

        // Add conversation history for follow-up awareness
        conversationHistory.forEach(exchange => {
            messages.push({ role: "user", content: exchange.user });
            messages.push({ role: "assistant", content: exchange.assistant });
        });

        // Add current user message
        messages.push({ role: "user", content: input });

        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                max_tokens: 700,
                temperature: 0.75
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }

        const text = data.choices[0].message.content;

        // Store in conversation history
        conversationHistory.push({ user: input, assistant: text });
        if (conversationHistory.length > MAX_HISTORY) {
            conversationHistory.shift(); // Remove oldest exchange
        }

        // Remove "thinking" msg
        if (thinkingMsg && thinkingMsg.parentNode) {
            thinkingMsg.remove();
        }

        addMessage(text, 'jarvis');

    } catch (error) {
        console.error('JARVIS Error:', error);

        // Remove thinking indicator
        if (thinkingMsg && thinkingMsg.parentNode) {
            thinkingMsg.remove();
        }

        let errorMessage = '';
        if (error.name === 'AbortError') {
            errorMessage = '⏱️ Request timed out after 30 seconds. The AI server may be under heavy load — please wait a moment and try again, Sir.';
        } else if (error.message.includes('API Error 429')) {
            errorMessage = '🚦 Rate limit reached — too many requests sent in a short period. Please wait 30–60 seconds before trying again.';
        } else if (error.message.includes('API Error 401') || error.message.includes('API Error 403')) {
            errorMessage = '🔑 Authentication failed — the API key is missing or invalid. If you are the site owner, verify your GROQ_API_KEY in Netlify environment variables.';
        } else if (error.message.includes('API Error 5')) {
            errorMessage = '🛠️ The Groq AI server is temporarily unavailable. This is not a local issue — please try again in a few minutes.';
        } else if (error.message.includes('API Error')) {
            errorMessage = `⚠️ ${error.message}. If this persists, the AI service may be experiencing issues.`;
        } else if (error.message === 'Failed to fetch' || error instanceof TypeError) {
            if (window.location.protocol === 'file:') {
                errorMessage = '🔌 JARVIS cannot operate from a local file. To run locally, install the Netlify CLI and run "netlify dev" — see the README for setup instructions.';
            } else {
                errorMessage = '🌐 Network error — unable to reach the AI server. Please check your internet connection and try again.';
            }
        } else {
            errorMessage = `⚠️ Unexpected error: ${error.message}. Try refreshing the page or contact the site owner if the issue persists.`;
        }

        addMessage(errorMessage, 'jarvis error');
    } finally {
        isProcessing = false;
    }
}

// === UTILS ===
function parseMarkdown(text) {
    if (!text) return '';

    let html = text
        .replace(/```(\w*)([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    let lines = html.split('\n');
    let output = '';
    let inList = false;

    for (let line of lines) {
        if (line.trim().startsWith('- ')) {
            if (!inList) {
                output += '<ul>';
                inList = true;
            }
            output += `<li>${line.trim().substring(2)}</li>`;
        } else {
            if (inList) {
                output += '</ul>';
                inList = false;
            }
            if (line.trim().length > 0) output += line + '<br>';
        }
    }
    if (inList) output += '</ul>';

    return output;
}

function getPageContext() {
    try {
        return document.body.innerText.substring(0, MAX_CONTEXT_LENGTH);
    } catch (error) {
        console.error('Error getting page context:', error);
        return 'Portfolio page for AI Architect Shaik Irfan Basha';
    }
}

async function typeHTML(element, htmlString, speed = 15) {
    element.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'j-cursor';

    let i = 0;
    let isTag = false;
    let currentHtml = '';

    return new Promise(resolve => {
        function typeChar() {
            if (i < htmlString.length) {
                const char = htmlString.charAt(i);
                currentHtml += char;
                if (char === '<') isTag = true;
                if (char === '>') isTag = false;

                element.innerHTML = currentHtml;
                element.appendChild(cursor);
                i++;

                // Auto-scroll while typing
                const outputZone = document.getElementById('jarvis-output');
                if (outputZone) outputZone.scrollTop = outputZone.scrollHeight;

                // Speed up instantly for HTML tags so they don't render as text breaks
                setTimeout(typeChar, isTag ? 0 : speed);
            } else {
                cursor.remove();
                resolve();
            }
        }
        typeChar();
    });
}

async function addMessage(text, type) {
    try {
        const div = document.createElement('div');
        div.className = `j-message ${type === 'jarvis error' ? 'jarvis error' : type}`;

        // Create message bubble
        const bubble = document.createElement('div');
        bubble.className = 'j-bubble';

        // Different structure for user vs jarvis messages
        if (type === 'user') {
            bubble.innerHTML = parseMarkdown(text);
            div.appendChild(bubble);
        } else {
            // Setup JARVIS layout
            const header = document.createElement('div');
            header.className = 'j-header-icon';
            header.innerHTML = `<i class='bx bx-bot'></i>`;

            div.appendChild(bubble); // Just the bubble for JARVIS

            // Determine content
            let finalHtml = '';
            if (text.includes(':::PROJECT_CARD')) {
                const cardRegex = /:::PROJECT_CARD\s+img:\s*(.*?)\s+title:\s*(.*?)\s+type:\s*(.*?)\s+tech:\s*(.*?)\s+desc:\s*(.*?)\s+link:\s*(.*?)\s+:::/s;
                const match = text.match(cardRegex);

                if (match) {
                    const [fullMatch, img, title, pType, tech, desc, link] = match;
                    const techTags = tech.split(',').map(t => `<span class="category-tags" style="display:inline-block; padding: 2px 6px; font-size:0.7rem;">${t.trim()}</span>`).join('');

                    const cardHtml = `
                        <div class="j-card" style="flex-direction: column; align-items: flex-start; margin-top: 10px;">
                            <div class="title" style="color: var(--j-cyan); font-size: 1rem;">${title} <span style="color:#fff; font-size:0.75rem;">— ${pType}</span></div>
                            <div style="display:flex; gap:5px; flex-wrap:wrap; margin: 5px 0;">${techTags}</div>
                            <div class="sub" style="margin-bottom: 10px;">${desc}</div>
                            <a href="${link}" target="_blank" style="color: var(--j-purple); text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;"><i class='bx bx-link-external'></i> Access System</a>
                        </div>
                    `;
                    const cleanText = text.replace(fullMatch, '').trim();
                    finalHtml = (cleanText ? parseMarkdown(cleanText) : '') + cardHtml;
                } else {
                    finalHtml = parseMarkdown(text);
                }
            } else {
                finalHtml = parseMarkdown(text);
            }

            // Append to DOM first so typewriter can target it
            const outputZone = document.getElementById('jarvis-output');
            outputZone.appendChild(div);

            // Execute Typewriter for Jarvis
            await typeHTML(bubble, finalHtml, TYPING_SPEED);

            // Once typing finishes, ensure final scroll
            outputZone.scrollTop = outputZone.scrollHeight;
            return; // Exit early since we've already appended
        }

        const outputZone = document.getElementById('jarvis-output');
        outputZone.appendChild(div);
        outputZone.scrollTop = outputZone.scrollHeight;

    } catch (error) {
        console.error('Error adding message:', error);
    }
}

function speak(text, onEndCallback = null) {
    try {
        if (!synthesis) {
            if (onEndCallback) onEndCallback();
            return;
        }
        synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthesis.getVoices();

        let selectedVoice = null;
        if (voiceGender === 'male') {
            // Prioritize premium/natural neural voices first
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('google uk english male')) || 
                            voices.find(v => v.name.toLowerCase().includes('microsoft mark online')) ||
                            voices.find(v => v.name.toLowerCase().includes('microsoft brian online')) ||
                            voices.find(v => v.name.toLowerCase().includes('daniel')) ||
                            voices.find(v => v.lang.startsWith('en-GB') && v.name.toLowerCase().includes('male')) ||
                            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) || 
                            voices.find(v => v.lang.startsWith('en'));
        } else {
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('google uk english female')) || 
                            voices.find(v => v.name.toLowerCase().includes('microsoft jenny online')) ||
                            voices.find(v => v.name.toLowerCase().includes('samantha')) ||
                            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) || 
                            voices.find(v => v.lang.startsWith('en'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;
        
        // Reset pitch to 1.0 for neural voices (0.85 sounds bad on them)
        utterance.pitch = 1.0; 
        utterance.rate = 1.05;
        utterance.volume = 1.0;

        utterance.onend = () => {
            if (onEndCallback) onEndCallback();
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            if (onEndCallback) onEndCallback();
        };

        synthesis.speak(utterance);
    } catch (error) {
        console.error('Error in speech synthesis:', error);
        if (onEndCallback) onEndCallback();
    }
}

// Auto-run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJARVIS);
} else {
    initJARVIS();
}

// === NEW GLOBAL FUNCTIONS ===
window.toggleJarvis = function () {
    const container = document.getElementById('jarvis-container');
    const welcomeScreen = document.getElementById('j-welcome');

    if (container.style.display === 'none' || !container.style.display) {
        // OPEN JARVIS
        container.style.display = 'flex';
        container.classList.remove('minimized');
        container.classList.remove('fading-out');

        requestAnimationFrame(() => {
            container.classList.add('open');
            document.body.classList.add('no-scroll');
        });

        // Reset to Welcome
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }

        document.getElementById('j-input').focus();
    } else {
        // CLOSE JARVIS
        container.classList.remove('open');
        setTimeout(() => {
            container.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }, 600);
    }
};

window.handleQuickQuery = function(query) {
    if (isProcessing) return;
    addMessage(query, 'user');
    processCommand(query);
};

// Make processCommand global for HTML onclicks
window.processCommand = processCommand;

// === FULL-SCREEN VOICE MODE ===
let voiceModeActive = false;
let voiceMuted = false;

// Voice Mode Elements
const voiceOverlay = document.getElementById('voice-mode');
const voiceStatus = document.getElementById('voice-status');
const voiceTranscript = document.getElementById('voice-transcript');
const voiceStatusBar = document.getElementById('voice-status-bar');

function openVoiceMode() {
    if (!voiceOverlay) return;

    voiceModeActive = true;
    voiceOverlay.classList.add('active');
    voiceOverlay.classList.remove('thinking', 'speaking');

    // Reset UI
    voiceStatus.textContent = 'Listening...';
    voiceTranscript.textContent = '';
    voiceStatusBar.textContent = 'Initializing speech recognition...';

    // Start listening
    if (recognition) {
        try {
            recognition.start();
            voiceStatusBar.textContent = 'Listening for your voice...';
        } catch (e) {
            voiceStatusBar.textContent = 'Speech recognition error. Please try again.';
        }
    } else {
        voiceStatusBar.textContent = 'Voice recognition not available in this browser.';
    }
}

function closeVoiceMode() {
    if (!voiceOverlay) return;

    voiceModeActive = false;
    voiceOverlay.classList.remove('active', 'thinking', 'speaking');

    // Stop listening
    if (recognition && isListening) {
        recognition.stop();
    }
    synthesis.cancel();
}

function setVoiceState(state, message, statusBarText) {
    if (!voiceOverlay) return;

    voiceOverlay.classList.remove('listening', 'thinking', 'speaking');
    voiceOverlay.classList.add(state);
    voiceStatus.textContent = message;
    if (statusBarText) voiceStatusBar.textContent = statusBarText;
}

function setupVoiceMode() {
    // Close button
    const closeBtn = document.getElementById('voice-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVoiceMode);
    }

    // Cancel button
    const cancelBtn = document.getElementById('voice-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeVoiceMode);
    }

    // Mic toggle button
    const micToggle = document.getElementById('voice-mic-toggle');
    if (micToggle) {
        micToggle.addEventListener('click', () => {
            if (isListening && recognition) {
                recognition.stop();
                micToggle.classList.add('muted');
            } else if (recognition) {
                recognition.start();
                micToggle.classList.remove('muted');
            }
        });
    }

    // Speaker toggle button
    const speakerBtn = document.getElementById('voice-speaker');
    if (speakerBtn) {
        speakerBtn.addEventListener('click', () => {
            voiceMuted = !voiceMuted;
            if (voiceMuted) {
                speakerBtn.querySelector('i').className = 'bx bxs-volume-mute';
                if (synthesis) synthesis.cancel();
            } else {
                speakerBtn.querySelector('i').className = 'bx bxs-volume-full';
            }
        });
    }

    // Override recognition handlers for voice mode
    if (recognition) {
        const originalOnResult = recognition.onresult;
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            if (voiceModeActive) {
                // Update transcript display
                voiceTranscript.textContent = `"${transcript}"`;

                // Change to thinking state
                setVoiceState('thinking', 'Thinking...', 'Analyzing your query...');

                // Process the command
                processVoiceCommand(transcript);
            } else {
                // Use original handler for normal mode
                if (originalOnResult) originalOnResult(event);
            }
        };

        recognition.onstart = () => {
            isListening = true;
            if (voiceModeActive) {
                setVoiceState('listening', 'Listening...', 'Speak now...');
            }
        };

        recognition.onend = () => {
            isListening = false;
        };
    }
}

// Process voice command with voice-specific flow
async function processVoiceCommand(text) {
    if (isProcessing) return;
    isProcessing = true;

    const statusMessages = [
        'Compiling edge intelligence model...',
        'Analyzing semantic patterns...',
        'Querying knowledge base...',
        'Synthesizing response...',
        'Evaluating optimal response path...'
    ];

    // Cycle through status messages
    let msgIndex = 0;
    const statusInterval = setInterval(() => {
        voiceStatusBar.textContent = statusMessages[msgIndex % statusMessages.length];
        msgIndex++;
    }, 2000);

    try {
        const context = getPageContext();
        const systemPrompt = buildSystemPrompt(context.substring(0, 2000));

        // Build messages with history
        const messages = [
            { role: "system", content: systemPrompt + "\nRespond conversationally and concisely for voice output. Keep responses under 100 words." }
        ];

        conversationHistory.forEach(exchange => {
            messages.push({ role: "user", content: exchange.user });
            messages.push({ role: "assistant", content: exchange.assistant });
        });

        messages.push({ role: "user", content: text });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        clearInterval(statusInterval);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }
        
        const responseText = data.choices[0].message.content;

        // Store in conversation history
        conversationHistory.push({ user: text, assistant: responseText });
        if (conversationHistory.length > MAX_HISTORY) {
            conversationHistory.shift();
        }

        // Speaking state
        setVoiceState('speaking', 'Jarvis Speaking', 'Delivering response...');

        // Speak the response using consolidated speak function
        if (!voiceMuted) {
            speak(responseText, () => {
                // After speaking, go back to listening
                if (voiceModeActive) {
                    setVoiceState('listening', 'Listening...', 'Ready for next query...');
                    if (recognition) recognition.start();
                }
            });
        } else {
            // If muted, just wait and go back to listening
            setTimeout(() => {
                if (voiceModeActive) {
                    setVoiceState('listening', 'Listening...', 'Ready for next query...');
                    if (recognition) recognition.start();
                }
            }, 2000);
        }

        // Also add to chat for history
        addMessage(text, 'user');
        addMessage(responseText, 'jarvis');

    } catch (error) {
        clearInterval(statusInterval);
        console.error('Voice mode error:', error);

        let voiceError = 'Something went wrong. Please try again.';
        if (error.name === 'AbortError') {
            voiceError = 'Request timed out. The AI server may be busy — try again shortly.';
        } else if (error.message.includes('429')) {
            voiceError = 'Rate limit reached. Please wait a moment before trying again.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            voiceError = 'API key error. The site owner needs to verify the GROQ_API_KEY.';
        } else if (error.message === 'Failed to fetch') {
            voiceError = 'Network error. Check your connection and try again.';
        }
        voiceStatusBar.textContent = voiceError;

        setTimeout(() => {
            if (voiceModeActive) {
                setVoiceState('listening', 'Listening...', 'Ready to try again...');
                if (recognition) recognition.start();
            }
        }, 3000);
    } finally {
        isProcessing = false;
    }
}
