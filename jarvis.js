// === CONFIGURATION (Secured with Netlify Proxy) ===
const API_URL = "/.netlify/functions/groq-proxy";
const API_TIMEOUT = 30000; // 30 seconds
const MAX_CONTEXT_LENGTH = 5000;
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Updated active model

// === STATE ===
let isListening = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let voiceGender = 'male'; // 'male' or 'female'
let isProcessing = false; // Prevent multiple simultaneous requests

// === DOM ELEMENTS ===
const container = document.getElementById('jarvis-container');
const header = document.getElementById('jarvis-header');
const outputZone = document.getElementById('jarvis-output');
const inputField = document.getElementById('j-input');
const micBtn = document.getElementById('j-mic');
const navBtns = document.querySelectorAll('.jarvis-btn-trigger');

// Window Controls
const btnClose = document.getElementById('j-close');
const btnRefresh = document.getElementById('j-refresh');

// === INITIALIZATION ===
function initJARVIS() {
    // Netlify Proxy handles API key verification internally.


    // Drag disabled for centered modal design

    // 2. Setup Voice Recognition
    setupRecognition();

    // 3. Setup Event Listeners
    setupEvents();

    // 4. Setup Accessibility
    setupAccessibility();
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

            // Show Welcome
            const welcomeScreen = document.getElementById('j-welcome');
            if (welcomeScreen) welcomeScreen.style.display = 'flex';

            // Reset Input
            inputField.value = '';

            speak("Interface reset. Ready for new queries.");
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
        // Get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;

        // BUG FIX: Remove transform once dragging starts to prevent offset issues
        // We calculate the current actual visual position and stamp it as top/left
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
        // Calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position:
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
        recognition.lang = 'en-US'; // Default, but we'll accept any
        // Note: Web Speech API auto-detects language mostly for Dictation, 
        // but explicit config helps. For "reply in any language", we rely on Gemini.

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            addMessage(transcript, 'user');
            processCommand(transcript);
        };
    } else {
        alert("JARVIS: Voice modules damaged (Browser not supported). Use Chrome.");
    }
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
        outputZone.style.display = 'flex'; // Ensure chat is visible
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
        // Netlify Proxy handles API key internally.

        const context = getPageContext();
        // OpenRouter uses OpenAI-compatible chat format
        const messages = [
            {
                role: "system",
                content: `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the ultra-advanced AI serving Shaik Irfan Basha.
        
STRICT PROTOCOLS:
1. **Multilingual Phase**: If the user speaks in a language (e.g., Hindi, Spanish), REPLY IN THAT SAME LANGUAGE. Detect it automatically.
2. **Persona**: Tone is professional, highly intelligent, slightly robotic but witty (like Iron Man's JARVIS). Address the user as "Sir" or "Ma'am" occasionally.
3. **Rich Project Format**: When asked about a specific project, YOU MUST format the output exactly like this:
   :::PROJECT_CARD
   img: [image_url_from_data_or_placeholder]
   title: [Project Name]
   type: [Mobile App / Web App]
   tech: [Tech1, Tech2, Tech3]
   desc: [Brief 1-sentence description]
   link: [View Project URL]
   :::
   Then add a short conversational comment after.

4. **Context**: Use the provided portfolio data to answer questions about Irfan.

Here is the Data on Shaik Irfan Basha:
${context}`
            },
            {
                role: "user",
                content: input
            }
        ];

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
                max_tokens: 500,
                temperature: 0.8
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
            errorMessage = '⏱️ Request timed out. Please try again, Sir.';
        } else if (error.message.includes('API Error')) {
            errorMessage = `⚠️ ${error.message}`;
        } else if (error.message === 'Failed to fetch' || error instanceof TypeError) {
            // Detect local file:// or missing Netlify proxy
            if (window.location.protocol === 'file:') {
                errorMessage = '🔌 Jarvis requires a live server to operate. Deploy to Netlify or run a local dev server to enable AI responses.';
            } else {
                errorMessage = '🌐 Network error — cannot reach the AI server. Check your internet connection and try again.';
            }
        } else {
            errorMessage = `⚠️ System error: ${error.message}`;
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
            await typeHTML(bubble, finalHtml, 15);

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
            selectedVoice = voices.find(v => 
                v.lang.startsWith('en') && 
                (v.name.toLowerCase().includes('male') || 
                 v.name.toLowerCase().includes('david') || 
                 v.name.toLowerCase().includes('james') || 
                 v.name.toLowerCase().includes('daniel') || 
                 v.name.toLowerCase().includes('google uk english male'))
            ) || voices.find(v => v.name.toLowerCase().includes('male')) || voices.find(v => v.lang.startsWith('en'));
        } else {
            selectedVoice = voices.find(v => 
                v.lang.startsWith('en') && 
                (v.name.toLowerCase().includes('female') || 
                 v.name.toLowerCase().includes('zira') || 
                 v.name.toLowerCase().includes('samantha') || 
                 v.name.toLowerCase().includes('google us english'))
            ) || voices.find(v => v.name.toLowerCase().includes('female')) || voices.find(v => v.lang.startsWith('en'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.pitch = voiceGender === 'male' ? 0.9 : 1.1;
        utterance.rate = 1.0;
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
                speakerBtn.querySelector('i').className = 'bx bx-volume-mute';
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
        // Call the API (reusing existing logic)
        const context = getPageContext();
        const messages = [
            {
                role: "system",
                content: `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the ultra-advanced AI serving Shaik Irfan Basha. 
                Respond conversationally and concisely for voice output. Keep responses under 100 words.
                Portfolio context: ${context.substring(0, 2000)}`
            },
            { role: "user", content: text }
        ];

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
        voiceStatusBar.textContent = 'Error: ' + error.message;

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

