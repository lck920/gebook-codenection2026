# 🔑 Gebook — API Keys & Setup Guide

This guide makes linking any API key (AI, Maps, Weather, Photos, Database) quick and painless. All configuration is managed in the single root `.env` file.

---

## 🚀 Quick Setup (30 Seconds)

1. Open `.env` in your root directory.
2. Add your desired keys below.
3. Start the app:
   ```bash
   pnpm dev
   ```

---

## 🤖 1. AI Co-Planner & Finance AI (Recommended)

Gebook supports OpenAI, Google Gemini, Anthropic Claude, and Minimax out of the box.

### Option A: OpenAI / OpenAI-Compatible (GPT-4o, GPT-4o-mini)
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-your-openai-api-key-here
AI_BASE_URL=
```
👉 *Get a key at: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)*

### Option B: Google Gemini (via OpenAI compatibility endpoint)
```env
AI_PROVIDER=openai
AI_MODEL=gemini-2.0-flash
AI_API_KEY=your-gemini-api-key-here
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```
👉 *Get a free key at: [aistudio.google.com](https://aistudio.google.com/)*

### Option C: Anthropic Claude (Claude 3.5 Sonnet)
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-5-sonnet-20241022
AI_API_KEY=sk-ant-your-key-here
AI_BASE_URL=
```
👉 *Get a key at: [console.anthropic.com](https://console.anthropic.com/)*

---

## 🗺️ 2. Maps & Places (Free OpenStreetMap Default)

- **Default (No key needed)**: Gebook uses OpenStreetMap (Nominatim + Overpass + OSRM) by default without requiring any API key!
- **Optional Google Maps**:
  ```env
  GEO_PROVIDER=google
  GOOGLE_MAPS_API_KEY=AIzaSy...
  ```

---

## 🌦️ 3. Live Weather Forecasts (Optional)

Enables live weather forecasts on each trip day.
```env
OPENWEATHERMAP_API_KEY=your-openweathermap-key-here
```
👉 *Get a free key at: [openweathermap.org/api](https://openweathermap.org/api)*

---

## 📸 4. Unsplash Cover Photos (Optional)

Automatically finds cover photos matching your destination during trip creation.
```env
UNSPLASH_ACCESS_KEY=your-unsplash-access-key-here
```
👉 *Get a free key at: [unsplash.com/developers](https://unsplash.com/developers)*

---

## 🔐 5. Auth & Database (Pre-configured for Local Dev)

- **Local dev default secret**:
  ```env
  BETTER_AUTH_SECRET=dev-secret-change-me-0123456789abcdef
  REALTIME_GRANT_SECRET=dev-realtime-secret-change-me-0123456789abcdef
  ```
- **Database (PostgreSQL / SQLite / MySQL)**:
  ```env
  DATABASE_PROVIDER=postgres
  DATABASE_URL=postgres://opentrip:opentrip@localhost:5430/opentrip
  ```

---

## 🧭 Project Layout

```
Gebook/
├── frontend/             # React + Vite client
│   └── src/pages/
│       ├── landing/      # 🌟 Landing Page
│       ├── finance/      # 💰 Finance & Expense Split Page
│       ├── travel-planner/ # 🗺️ Itinerary & Live Map
│       └── trips/        # 🧭 Trips Hub & Traveller Level
├── backend/              # Hono + Node API & AI
│   └── src/application/
│       ├── finance-ai/   # 🤖 Finance AI & Budget Optimizer
│       └── agent/        # ⚡ Itinerary AI Co-Planner
├── .env                  # 🔑 Your active API keys
└── API_KEYS_GUIDE.md     # 📘 This guide
```
