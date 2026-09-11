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

### Option B: Google Gemini — **what this project runs on**
```env
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
AI_API_KEY=AIza-your-gemini-api-key-here
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
```
👉 *Get a free key at: [aistudio.google.com](https://aistudio.google.com/)*

> Measured on this trip's workload (21 tool schemas, an 11-day itinerary):
> a full 5-step turn — research with `placeSearch`, then write the stops —
> takes about **12 seconds** end to end, with no rate-limit queueing.
>
> `gemini-2.0-flash` is **retired** (404, "no longer available"). The 3.x flash
> models exist on the free tier but returned `503 high demand` when tested;
> `gemini-2.5-flash` was reliable.
>
> `reasoning_effort` is a tuning lever if replies feel slow: unset (the default)
> took ~14s for one step and researched before writing, `low` ~7s, `none` ~3s.
> At `none` the model skipped `placeSearch` and invented coordinates, which is
> how stops end up at the wrong namesake — so the default is the safe choice.

### Option C: Groq (fast, OpenAI-compatible)
```env
AI_PROVIDER=groq
AI_MODEL=qwen/qwen3.8-27b
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your-groq-key-here
```
👉 *Get a key at: [console.groq.com/keys](https://console.groq.com/keys)*

> The co-planner edits the itinerary through tool calls, so pick a
> tool-calling model. Run
> `curl -H "Authorization: Bearer $KEY" https://api.groq.com/openai/v1/models`
> to see what your key actually has — model availability varies per account,
> and smaller instruct models often ignore tools and only talk.
>
> **Avoid `openai/gpt-oss-*` here.** They return a `reasoning` field that the AI
> SDK replays as `reasoning_content` on the next step, which Groq then rejects
> (`property 'reasoning_content' is unsupported`), so every multi-step turn dies.
> `qwen/qwen3.8-27b` does not emit that field and works.
>
> **The free tier is the real constraint.** Groq allows 8,000 tokens/minute, and
> the agent's 21 tool schemas cost ~5,700 prompt tokens on *every* step (the
> schemas are ~92% of the request; the trip snapshot is only ~440). That is one
> step per minute — a multi-step planning turn spends minutes queueing
> (`queue_time: 8.8s` on step one, then a 45s wait for the bucket to refill).
> Gemini's free tier does not have this problem, which is why Option B is the
> default here.

### Option D: Anthropic Claude (Claude 3.5 Sonnet)
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
  DATABASE_URL=postgres://gebook:gebook@localhost:5430/gebook
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
