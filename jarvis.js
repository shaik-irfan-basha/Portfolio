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
            container.style.display = 'flex';
            container.classList.remove('minimized');
            speak("Interface expanded.");
            inputField.focus();
        });
    });

    // Window Controls - Close with Reactor Fade-Out First
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            // Stage 1: Fade out reactor system first
            const reactor = container.querySelector('.reactor-system');
            if (reactor) {
                reactor.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                reactor.style.opacity = '0';
                reactor.style.transform = 'scale(0.5)';
            }

            // Stage 2: After reactor fades, fade entire container
            setTimeout(() => {
                container.classList.add('fading-out');
                setTimeout(() => {
                    container.style.display = 'none';
                    container.classList.remove('fading-out');
                    document.body.classList.remove('no-scroll'); // UNLOCK SCROLL

                    // Reset reactor for next open
                    if (reactor) {
                        reactor.style.opacity = '1';
                        reactor.style.transform = 'scale(1)';
                    }
                    if (recognition && isListening) recognition.stop();
                    synthesis.cancel();
                }, 600); // Container fade time
            }, 300); // Wait for reactor to fade
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

    // Sofia-style Thinking State Animation
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
        if (!API_KEY) {
            throw new Error("Security Keys Missing");
        }

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

        let errorMessage = 'Critical Error. ';
        if (error.name === 'AbortError') {
            errorMessage += 'Request timeout. Please try again.';
        } else if (error.message.includes('API Error')) {
            errorMessage += error.message; // Show exact error (e.g., 401, 404)
        } else {
            errorMessage += error.message;
        }

        addMessage(`⚠️ ${errorMessage}`, 'jarvis error');
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

function addMessage(text, type) {
    try {
        const div = document.createElement('div');
        div.className = `msg ${type}`;

        // Create avatar icon
        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        if (type === 'user') {
            avatar.innerHTML = `<i class='bx bx-user'></i>`;
        } else {
            avatar.innerHTML = `<i class='bx bx-bot'></i>`;
        }

        // Create message content wrapper
        const content = document.createElement('div');
        content.className = 'msg-content';

        // Parse Rich Content (Project Cards) for JARVIS messages
        if (type === 'jarvis' && text.includes(':::PROJECT_CARD')) {
            const cardRegex = /:::PROJECT_CARD\s+img:\s*(.*?)\s+title:\s*(.*?)\s+type:\s*(.*?)\s+tech:\s*(.*?)\s+desc:\s*(.*?)\s+link:\s*(.*?)\s+:::/s;
            const match = text.match(cardRegex);

            if (match) {
                const [fullMatch, img, title, pType, tech, desc, link] = match;
                const techTags = tech.split(',').map(t => `<span class="tech-tag">${t.trim()}</span>`).join('');

                const cardHtml = `
                    <div class="rich-project-card">
                        <div class="card-header">
                            <div class="card-icon"><i class='bx bx-layer'></i></div>
                            <div class="card-meta">
                                <div class="card-title">${title} <span class="card-type">${pType}</span></div>
                            </div>
                        </div>
                        <div class="card-tags">${techTags}</div>
                        <div class="card-desc">${desc}</div>
                        <div class="card-actions">
                            <a href="${link}" target="_blank" class="action-btn"><i class='bx bx-link-external'></i> View Project</a>
                            <a href="#" class="action-btn secondary"><i class='bx bx-play-circle'></i> Live Demo</a>
                        </div>
                    </div>
                `;

                // Remove the raw block and append text + card
                const cleanText = text.replace(fullMatch, '').trim();
                content.innerHTML = (cleanText ? parseMarkdown(cleanText) : '') + cardHtml;
            } else {
                content.innerHTML = parseMarkdown(text);
            }
        } else {
            content.innerHTML = parseMarkdown(text);
        }

        // Different structure for user vs jarvis messages
        if (type === 'user') {
            // User: horizontal layout (avatar on right)
            div.appendChild(content);
            div.appendChild(avatar);
        } else {
            // Jarvis: header wrapper with avatar + content
            const header = document.createElement('div');
            header.className = 'msg-header';
            header.appendChild(avatar);
            header.appendChild(content);
            div.appendChild(header);

            // Add Quick Actions for non-error AI responses only
            if (!type.includes('error')) {
                const quickActions = document.createElement('div');
                quickActions.className = 'quick-actions';
                quickActions.innerHTML = `
                    <div class="action-label"><i class='bx bx-bulb'></i> Quick Actions</div>
                    <div class="action-tags">
                        <span class="action-tag" onclick="processCommand('Tell me about Irfan\\'s experience')">📋 Experience</span>
                        <span class="action-tag" onclick="processCommand('What are Irfan\\'s skills?')">⚡ Skills</span>
                        <span class="action-tag" onclick="processCommand('Show best project')">⭐ Best Project</span>
                        <span class="action-tag" onclick="processCommand('Show all projects')">🚀 All Projects</span>
                    </div>
                `;
                div.appendChild(quickActions);
            }
        }

        div.setAttribute('role', 'log');
        div.setAttribute('aria-live', 'polite');

        const outputZone = document.getElementById('jarvis-output');
        outputZone.appendChild(div);
        outputZone.scrollTop = outputZone.scrollHeight;
    } catch (error) {
        console.error('Error adding message:', error);
    }
}

function speak(text) {
    try {
        if (!synthesis) return; // Guard
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthesis.getVoices();

        // Voice Selection Logic
        let selectedVoice = null;
        if (voiceGender === 'male') {
            selectedVoice = voices.find(v => v.name.includes('Google UK English Male')) ||
                voices.find(v => v.name.includes('male') || v.name.includes('David'));
        } else {
            selectedVoice = voices.find(v => v.name.includes('Google US English')) ||
                voices.find(v => v.name.includes('female') || v.name.includes('Zira'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.pitch = voiceGender === 'male' ? 0.9 : 1.1;
        utterance.rate = 1.1;

        // Error handling for speech synthesis
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
        };

        synthesis.speak(utterance);
    } catch (error) {
        console.error('Error in speech synthesis:', error);
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
        document.body.classList.add('no-scroll'); // LOCK SCROLL

        // Reset to Welcome
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }

        document.getElementById('j-input').focus();

        // Ensure reactor is visible
        const reactor = container.querySelector('.reactor-system');
        if (reactor) {
            reactor.style.opacity = '1';
            reactor.style.transform = 'scale(0.6)';
        }
    } else {
        // CLOSE JARVIS (Trigger the close button logic by click to use animation)
        document.getElementById('j-close').click();
    }
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
                synthesis.cancel();
            } else {
                speakerBtn.querySelector('i').className = 'bx bx-volume-full';
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

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                max_tokens: 200,
                temperature: 0.7
            })
        });

        clearInterval(statusInterval);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        // Speaking state
        setVoiceState('speaking', 'Jarvis Speaking', 'Delivering response...');

        // Speak the response with male voice
        if (!voiceMuted) {
            speakWithVoice(responseText, () => {
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

// Speak with male Jarvis voice
function speakWithVoice(text, onEndCallback) {
    if (!synthesis) return;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a male English voice
    const voices = synthesis.getVoices();
    const maleVoice = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('james') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('google uk english male'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (maleVoice) {
        utterance.voice = maleVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 0.9; // Slightly lower pitch for male voice
    utterance.volume = 1.0;

    utterance.onend = () => {
        if (onEndCallback) onEndCallback();
    };

    synthesis.speak(utterance);
}
