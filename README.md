# ChipChart AI 🖥️🔍

> **Live Application URL**: [https://chipchart-ai.onrender.com](https://chipchart-ai.onrender.com)

ChipChart AI is an AI-powered, real-time laptop and PC recommendation engine. It guides users through an interactive questionnaire about their budget, usage, and preferences, leverages advanced LLMs to generate tailored configurations, and cross-references them live against Indian e-commerce listings to fetch pricing, specs, and purchase links.

---

## 🌟 Key Features

* **Interactive Questionnaire**: Multi-step guide parsing user constraints (device type, budget, primary purpose like gaming/ML/office, aesthetic preferences, display types).
* **AI Configuration Generator**: Direct integration with **Gemini 3.1** and a backup failover to **Groq (Llama 3.3)** to output structured JSON configurations.
* **Real-time Price Tracker**: Web scraping logic using **ScraperAPI** to query Amazon India and match specs/pricing live.
* **Smart Filter & Heuristics**: Spec matching algorithms (Regex filters for RAM/CPU/GPU) to discard accessory listings (e.g., bags, stands) and verify pricing sanity.
* **Performance Visualizations**: Embedded **Recharts** charts calculating and plotting FPS estimates across popular games (Valorant, Cyberpunk 2077, Elden Ring, RDR2, Fortnite, GTA V).
* **Comparison Basket**: Persistent Zustand comparison drawer to add multiple components or builds and review them side-by-side.
* **7-Day Response Caching**: Local caching of generated recommendations to minimize API costs and optimize network latency.
 
---

## 🛠️ Tech Stack

* **Frontend Framework**: React 18 + TypeScript + Vite
* **Styling**: TailwindCSS + Framer Motion (for animations) + Radix UI (accessible primitives)
* **State Management**: Zustand (with local storage persistence)
* **Data Fetching & Cache**: TanStack Query (React Query)
* **Data Visualization**: Recharts
* **AI APIs**: `@google/generative-ai` (Gemini SDK) + Groq API
* **Data Scraper**: ScraperAPI (Amazon India contextualized query engine)

---

## 📂 Project Structure

```text
src/
├── components/          # Reusable UI & Layout Components
│   ├── home/            # Landing page sections
│   ├── layout/          # Navbar, Footer, and comparison BucketSheet
│   └── ui/              # Shadcn/Radix primitive elements
├── hooks/               # Custom React hooks (mobile detection, toasts)
├── lib/                 # Core engine utilities
│   ├── apiCache.ts      # Hashed caching system for API queries
│   ├── geminiApi.ts     # Primary LLM call and failover systems
│   ├── livePricingApi.ts# Heuristic price verification and e-commerce scraping
│   └── recommendationEngine.ts # Insights generator & type definitions
├── pages/               # Main Page Screens (Index, Questionnaire, LaptopResults, PCResults)
├── store/               # Zustand global stores (answers & comparison bucket)
└── App.tsx              # Main routing and provider wrapper
```

---

## ⚙️ Setup & Installation

### Prerequisites
Make sure you have Node.js and npm/bun installed.

### 1. Clone the repository
```bash
git clone https://github.com/STym108/ChipChart-AI.git
cd chipchart-ai
```

### 2. Install dependencies
```bash
npm install
# or if you use Bun:
bun install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory and add your keys:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_SCRAPERAPI_KEY=your_scraperapi_key_here
```
> [!NOTE]
> The application uses a fallback mechanism: if `VITE_GEMINI_API_KEY` hits rate limits, it falls back to `VITE_GROQ_API_KEY`. `VITE_SCRAPERAPI_KEY` is required to fetch live Amazon India pricing; otherwise, it defaults back to AI-estimated values.

### 4. Run the Dev Server
```bash
npm run dev
# or
bun dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚀 Advanced Implementation Details

### Dual-Provider Resiliency
In `src/lib/geminiApi.ts`, if the primary model (`gemini-3.1-flash-lite-preview`) throws an HTTP 429 (Too Many Requests) or hits its quota, the app catches the error and redirects the prompt context to `llama-3.3-70b-versatile` hosted on Groq, ensuring high availability.

### Heuristic Data Cleaning
Raw search listings on e-commerce sites return a lot of noise. The scraper pipeline in `src/lib/livePricingApi.ts` performs the following steps:
1. **Word-based brand check** and category exclusion filters (discards accessories, chargers, stands).
2. **Regex match** on title to confirm exact RAM (e.g. 16GB), CPU series, and GPU series.
3. **Price clamping check** (accepts prices only between 40% and 160% of the AI's estimate).
