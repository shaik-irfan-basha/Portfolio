<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=0:000a50,100:00e5ff&text=SHAIK%20IRFAN%20BASHA&fontColor=ffffff&fontSize=50&desc=Artificial%20Intelligence%20Architect&descAlignY=65&descAlign=50" alt="Shaik Irfan Basha API" width="100%" />

  <h3>Sentient Web Architecture & Enterprise AI</h3>
  <p align="center">
    <strong>Engineered with precision. Powered by Groq AI. Designed for the Future.</strong>
    <br />
    <br />
    <a href="https://irfan-basha-portfolio.netlify.app/"><b>🔴 INIT LIVE SYSTEM</b></a> · 
    <a href="mailto:muhammadirfanbasha@gmail.com"><b>📧 UPLINK</b></a> · 
    <a href="https://www.linkedin.com/in/shaik-irfan-basha"><b>👔 CONNECT</b></a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Architecture-Vanilla_JS_&_GSAP-00e5ff?style=for-the-badge&logo=javascript&logoColor=black" />
    <img src="https://img.shields.io/badge/AI_Engine-Llama_3_70B-ff00ea?style=for-the-badge&logo=openai&logoColor=white" />
    <img src="https://img.shields.io/badge/Deployment-Netlify_Edge-00ff88?style=for-the-badge&logo=netlify&logoColor=black" />
    <img src="https://img.shields.io/badge/Theme-Stealth_Mode-39ff14?style=for-the-badge&logo=hackthebox&logoColor=black" />
  </p>
</div>

---

## ⚡ System Overview

This repository houses the source code for my portfolio—a high-performance, interactive neural aesthetic application. It is not just a digital resume; it is a **live demonstration of intelligent web architecture** integrating advanced visual design, robust code, and real-time Artificial Intelligence.

At the core of the experience operates **JARVIS**, an embedded interactive assistant capable of text-to-speech interaction, bidirectional voice comprehension, and context-aware portfolio navigation.

---

## 🚀 Key Technological Capabilities

### 🤖 JARVIS AI Core
| Capability | Details |
|---|---|
| **Serverless API Proxy** | Secure environment integrations through Netlify Edge Functions → **Groq** |
| **Versatile LLM (Llama 3 70B)** | Reasoning, portfolio payload extraction, and instant responsive structures |
| **Multilingual Web Speech API** | Bidirectional voice recognition and speech synthesis (TTS) |
| **Conversation Memory** | Context-aware follow-up responses via conversation history |
| **Zero-Latency State** | Internally bound to employment history, projects, and architecture details |
| **Ctrl+K Quick Launch** | Keyboard shortcut to instantly open or close JARVIS from any section |

### 🎥 Cinematic Engineering
| Feature | Technology |
|---|---|
| **GSAP Physics** | Smooth physics powering the Arc Reactor boot sequence and DOM interactions |
| **CSS 3D Mapping** | Interactive, parallax-shifting 3D tilt geometry across all credentials |
| **Data Decryption Matrices** | Custom JS matrix text-decipher logic running independently on headers |
| **Micro-Animations** | Card shimmer effects, magnetic buttons, floating elements |
| **Stealth Mode** | Dual-theme system — Arc Reactor (blue/purple) & Stealth Mode (green/black) |
| **Responsive Geometry** | CSS Grid & Flexbox layouts scaling from studio monitors to mobile canvases |

---

## 🛠️ Tech Stack & Dependencies

```json
{
  "Front-End": ["HTML5", "CSS3 Properties & Variables", "Vanilla JS (ES6+)"],
  "Artificial Intelligence": ["Groq AI (Llama 3 70B)", "Serverless Proxy Protocol"],
  "Browser APIs": ["IntersectionObserver (Lazy Load)", "Web Speech API", "Local DOM Storage"],
  "Animations": ["GreenSock (GSAP)", "Custom Matrix Math", "Scroll-Driven Animations"],
  "Deployment": ["Netlify", "Netlify Edge Functions", "Environment Variables"]
}
```

---

## 🖥️ Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
- A free API key from [Groq Console](https://console.groq.com/keys)

### 1. Clone the Repository

```bash
git clone https://github.com/shaik-irfan-basha/Portfolio.git
cd Portfolio
```

### 2. Install Netlify CLI

```bash
npm install netlify-cli -g
```

### 3. Create Your Environment File

Create a `.env` file in the project root (it's already in `.gitignore`):

```env
# Get your key from: https://console.groq.com/keys
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 4. Start the Local Dev Server

```bash
netlify dev
```

This will:
- Serve the portfolio at `http://localhost:8888`
- Automatically inject your `.env` variables into the serverless function
- Enable full JARVIS AI functionality locally

> **⚠️ Important:** Opening `index.html` directly as a file (`file://`) will **not** work for JARVIS because the AI requires the Netlify serverless proxy to securely pass API keys. Always use `netlify dev`.

---

## ☁️ Netlify Deployment & Environment Variables

### Deploying to Netlify

1. Push your code to GitHub
2. Go to [Netlify Dashboard](https://app.netlify.com/) → **Add new site** → **Import from Git**
3. Select your repository and deploy

### Setting Up the API Key on Netlify

Your `GROQ_API_KEY` must be set as an environment variable on Netlify (never hardcoded):

1. Go to your Netlify site dashboard
2. Navigate to **Site configuration** → **Environment variables**
3. Click **Add a variable**
4. Set:
   - **Key**: `GROQ_API_KEY`
   - **Value**: Your Groq API key from [console.groq.com/keys](https://console.groq.com/keys)
5. Click **Save**
6. **Redeploy** your site for the changes to take effect

> **🔒 Security:** Never commit your API key to the repository. The `.env` file is excluded via `.gitignore`, and the serverless function reads the key from Netlify's secure environment at runtime.

---

## 🧬 Architectural Overview

```text
/Portfolio
│── /images/               # Core Assets & SVGs
│── /videos/               # Background Blackhole & Cinematic Showcase Compilations
│── /Documents/            # Resume, Certificates & Credential PDFs
│── /netlify/functions/    # Node.js proxies protecting the AI logic
│── .env                   # Local API keys (git-ignored)
│── .gitignore             # Excludes .env, node_modules, .netlify
│── netlify.toml           # Build config & redirect rules
│── index.html             # The Master DOM
│── style.css              # Grid, Flexbox, Themes & Typography
│── app.js                 # GSAP Timelines, Lazy Loading & Viewport Listeners
│── jarvis.css             # AI Dialog Box Styles & Chat Configurations
└── jarvis.js              # AI Brain Mapping, Conversation Memory & Web Speech
```

---

## 📡 Live Demonstration Commands

When accessing the live application, initialize JARVIS (`Ctrl+K` or click the button) and try:

| Command | What It Does |
|---|---|
| _"Who are you?"_ | JARVIS introduces himself and Irfan |
| _"Show me Irfan's active deployments."_ | Lists all live projects with links |
| _"What are his core competencies in AI?"_ | Detailed breakdown of AI skills |
| _"Open voice mode."_ | Activates full-screen voice interaction |
| _"Tell me about his experience at JASIQ Labs."_ | Work experience deep-dive |

---

## 🎨 Theme System

The portfolio includes a **dual-theme system** toggled via the header:

| Theme | Aesthetic | Primary Colors |
|---|---|---|
| **Arc Reactor** (Default) | Blue/Purple cinematic sci-fi | `#72a1de`, `#6600c5`, `#00e5ff` |
| **Stealth Mode** | Green/Black tactical ops | `#39ff14`, `#0a0a0a`, `#00ff41` |

---

## 📄 Licensing & Security

> **Notice:** The architecture and primary codebase layout within this repository are the property of Shaik Irfan Basha. You may fork or clone for educational purposes, but direct cloning for commercial portfolios without heavy modification is discouraged.

Distributed under the **MIT License**.

<p align="center">
  <i>Written & Compiled by Shaik Irfan Basha. The Architecture.</i>
</p>
