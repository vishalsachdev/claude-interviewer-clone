# Interview Bot Clone

An open-source interview bot clone inspired by Claude's conversational interview system. This project replicates the dynamic, probing interview capabilities using OpenAI's GPT models. Built with Next.js, LangChain, and deployed on Vercel.

## About the Original Claude Interview Bot

This project is inspired by Claude's interview bot, which demonstrates how AI can conduct in-depth, conversational interviews with dynamic probing. The original system leverages Claude's conversational strengths to:

- Generate comprehensive interview plans based on topics
- Conduct natural, flowing conversations with intelligent follow-up questions
- Probe deeper into topics through contextual understanding
- Analyze interview transcripts to extract key insights

This clone implements similar functionality using OpenAI's GPT-4o model (with support for other OpenAI chat models), making it accessible as an open-source alternative.

## Privacy & Data Protection

**IMPORTANT: No Personal Information Collection**

- **No login required**: This application does not collect any personally identifiable information (PII)
- **No user accounts**: All interviews are anonymous and session-based
- **Please do not share personal information**: While we don't collect PII, we strongly advise users not to share personal, sensitive, or confidential information during interviews
- **Cloud storage**: Interview transcripts are stored in Supabase (PostgreSQL)
- **No tracking**: No analytics, tracking, or user profiling is performed

This application is designed for research and educational purposes. Use responsibly and do not share sensitive personal information.

## Features

- **Dynamic Interview Planning**: AI generates interview questions based on context
- **Conversational Interviewing**: Natural, probing follow-up questions
- **Transcript Analysis**: Automatic analysis and insights from interviews
- **Cloud Database**: Supabase (PostgreSQL) for reliable storage
- **Cost Tracking**: Monitor token usage and costs per interview

## Tech Stack

- **Frontend**: Next.js 14 with React
- **Backend**: Next.js API Routes
- **LLM**: OpenAI GPT-4o (default)
- **Orchestration**: LangChain
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings > API** and copy your credentials

### 3. Configure environment variables

Copy the example file:
```bash
cp .env.example .env
```

Add your credentials to `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── interview/     # Interview endpoints
│   ├── page.tsx           # Main chat interface
│   └── layout.tsx         # Root layout
├── lib/                   # Core logic
│   ├── db/               # Database layer (Supabase)
│   ├── supabase/         # Supabase client setup
│   └── orchestration/    # LangChain workflows
├── supabase/             # Database schema
│   └── schema.sql        # SQL to set up tables
└── types/                # TypeScript types
```

## License

MIT
