# Interview Bot Clone

An open-source interview bot clone inspired by Claude's conversational interview system. This project replicates the dynamic, probing interview capabilities using OpenAI's GPT models. Built with Next.js, LangChain, and deployed on Vercel.

## About the Original Claude Interview Bot

This project is inspired by Claude's interview bot, which demonstrates how AI can conduct in-depth, conversational interviews with dynamic probing. The original system leverages Claude's conversational strengths to:

- Generate comprehensive interview plans based on topics
- Conduct natural, flowing conversations with intelligent follow-up questions
- Probe deeper into topics through contextual understanding
- Analyze interview transcripts to extract key insights

This clone implements similar functionality using OpenAI's GPT-4o model (with support for other OpenAI chat models), making it accessible as an open-source alternative.

## ⚠️ Privacy & Data Protection

**IMPORTANT: No Personal Information Collection**

- **No login required**: This application does not collect any personally identifiable information (PII)
- **No user accounts**: All interviews are anonymous and session-based
- **Please do not share personal information**: While we don't collect PII, we strongly advise users not to share personal, sensitive, or confidential information during interviews
- **Local storage**: Interview transcripts are stored locally in SQLite and can be exported/deleted at any time
- **No tracking**: No analytics, tracking, or user profiling is performed

This application is designed for research and educational purposes. Use responsibly and do not share sensitive personal information.

## Features

- **Dynamic Interview Planning**: AI generates interview questions based on context
- **Conversational Interviewing**: Natural, probing follow-up questions
- **Transcript Analysis**: Automatic analysis and insights from interviews
- **Secure Storage**: SQLite database for transcript storage
- **Cost Tracking**: Monitor token usage and costs per interview

## Tech Stack

- **Frontend**: Next.js 14 with React
- **Backend**: Next.js API Routes
- **LLM**: OpenAI GPT-4o (default)
  - **Why GPT-4o?**
    - Great balance of cost and quality for conversational flows
    - Multimodal support when you enable image/audio inputs
    - Widely available and stable in production
  - **Other models you can use:**
    - **gpt-4o-mini**: Lower cost for lighter workloads
    - **gpt-3.5-turbo**: Legacy budget option
  
  To switch models, set `OPENAI_MODEL` in your `.env` (fallbacks to `gpt-4o`). The backend is wired to use this value across the orchestration and message endpoints.
- **Orchestration**: LangChain
- **Database**: SQLite (better-sqlite3)
- **Deployment**: Vercel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-your-key-here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your `OPENAI_API_KEY` as an environment variable in Vercel
4. Deploy!

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── interview/     # Interview endpoints
│   │   └── analysis/      # Analysis endpoints
│   ├── page.tsx           # Main chat interface
│   └── layout.tsx         # Root layout
├── lib/                   # Core logic
│   ├── db/               # Database setup
│   ├── orchestration/    # LangChain workflows
│   └── utils/            # Utilities
└── types/                # TypeScript types
```

## License

MIT
