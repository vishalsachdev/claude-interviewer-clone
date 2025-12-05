# AI in Education Interview Bot

An open-source interview bot for gathering perspectives on AI use in education. Users select their role (Student, Instructor, Researcher, or Staff) and engage in a dynamic, conversational interview. Built with Next.js, LangChain, and OpenAI GPT-4o.

## How It Works

1. **Select Your Role**: Choose from Student, Instructor, Researcher, or Staff
2. **Conversational Interview**: The bot asks one question at a time, probing deeper based on your responses
3. **Smart Timing**: Interview naturally wraps up after ~10 minutes or 8+ exchanges
4. **Gentle Nudges**: If you're idle for 2 minutes, a friendly reminder appears (no auto-close)
5. **Analysis**: Upon completion, receive a summary, key insights, and recommendations

## Privacy & Data Protection

**IMPORTANT: No Personal Information Collection**

- **No login required**: This application does not collect any personally identifiable information (PII)
- **No user accounts**: All interviews are anonymous and session-based
- **Please do not share personal information**: While we don't collect PII, we strongly advise users not to share personal, sensitive, or confidential information during interviews
- **Cloud storage**: Interview transcripts are stored in Supabase (PostgreSQL)
- **No tracking**: No analytics, tracking, or user profiling is performed

This application is designed for research and educational purposes. Use responsibly and do not share sensitive personal information.

## Features

- **Role-Based Interviews**: Tailored questions for Students, Instructors, Researchers, and Staff
- **One Question at a Time**: Natural, focused conversation flow
- **Smart Interview Closure**: Time-based (10 min) or exchange-based (8+ messages) wrap-up
- **Idle Detection**: 2-minute nudge for inactive users (no forced closure)
- **Warm Wrap-Up**: Bot asks for final thoughts before completing
- **Transcript Analysis**: Summary, key insights, and recommendations
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
