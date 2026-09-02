<p align="center">
  <img src="docs/assets/logo.png" width="96" height="96" alt="Gebook logo" />
</p>

<h1 align="center">Gebook</h1>

<p align="center">
  <strong>Gepuk the chaos, book the dream.</strong>
</p>

<p align="center">
  All-in-one collaborative trip planner for modern travellers - interactive maps, day-by-day itineraries,
  multi-currency expense splitting, group consensus sync, Duolingo-style milestones, and an emergency re-plan AI companion.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="#project-structure">Project structure</a> ·
  <a href="#api-keys-setup">API keys setup</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="Hono" src="https://img.shields.io/badge/Hono-API-E36002?logo=hono&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-ready-4169E1?logo=postgresql&logoColor=white" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white" />
</p>

---

## 🧭 Project Structure

```
Gebook/
├── frontend/                     # All front-end UI & client logic
│   └── src/
│       ├── pages/
│       │   ├── landing/          # 🌟 Landing Page (Hero, CTAs, Features)
│       │   ├── finance/          # 💰 Dedicated Finance & Expense Splitting (/finance)
│       │   ├── travel-planner/   # 🗺️ Interactive Itinerary & Live Map
│       │   └── trips/            # 🧭 Trips Hub & Duolingo-style Levels
│       ├── entities/             # Gamification, Expenses, Trips
│       └── shared/               # UI components, auth client, API
│
├── backend/                      # All back-end services, APIs & AI
│   └── src/
│       ├── application/
│       │   ├── finance-ai/       # 🤖 Finance AI & Budget Optimizer
│       │   ├── agent/            # ⚡ Trip Planner AI Agent
│       │   └── fx/               # 💱 Multi-Currency FX Engine
│       ├── domain/               # Core business models
│       ├── infrastructure/       # Database (Prisma), AI providers, Geo
│       └── interfaces/http/      # REST API routes
│
├── .env                          # 🔑 Centralized API Key configuration
├── API_KEYS_GUIDE.md             # 📘 Visual guide to link any API key easily
└── package.json                  # Root monorepo configuration
```

---

## 🚀 Quick Start

1. **Clone & install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment & API keys**:
   Copy `.env.example` to `.env` or open `.env` to plug in your AI / Map / Weather keys.
   See [`API_KEYS_GUIDE.md`](API_KEYS_GUIDE.md) for 30-second setup instructions.

3. **Start local development**:
   ```bash
   pnpm dev
   ```
   - Frontend: `http://localhost:5170`
   - Backend API: `http://localhost:8780`

---

## 🎮 Key Features

| Capability | What you get |
| :--- | :--- |
| **🎮 Duolingo-Style Gamification** | Level 1–5 traveller milestones, planning streaks 🔥, XP, and unlockable achievement trophies. |
| **⚡ Re-Plan on the Fly** | Emergency 1-click itinerary adaptation for flight delays ✈️, rainy weather 🌧️, closed attractions 🔒, or budget alerts 💰. |
| **👥 Group Preferences Sync** | Harmonize budget ranges, travel paces, and vibe tags across group members with match alignment scores. |
| **💰 Dedicated Finance Page** | Real-time multi-currency expense ledger, category breakdown, debt minimization (Smart Settle-Up), and AI budget insights. |
| **🗺️ Live Map & Scheduling** | Numbered stop markers, interactive per-day routes, OSM/Google Maps place search, and route optimization. |
| **🤖 AI Trip Co-Planner** | Collaborative AI assistant that suggests stops, re-sequences days, and answers travel questions. |
| **📱 Desktop + Installable PWA** | Responsive layout optimized for desktop, tablet, and mobile PWA installation. |

---

## 📘 Documentation & Reference

- [API Keys Guide](API_KEYS_GUIDE.md) — Connect OpenAI, Gemini, Claude, Weather, and Map keys.
- [Architecture Guide](docs/project/architecture.md) — Frontend (FSD v2.1) + Backend (DDD/Hexagonal).
