# Interview Bot Clone

An open-source interview bot clone that uses OpenAI's GPT models to conduct dynamic, probing interviews. Built with Next.js, LangChain, and deployed on Vercel.

## Features

- **Dynamic Interview Planning**: AI generates interview questions based on context
- **Conversational Interviewing**: Natural, probing follow-up questions
- **Transcript Analysis**: Automatic analysis and insights from interviews
- **Secure Storage**: SQLite database for transcript storage
- **Cost Tracking**: Monitor token usage and costs per interview

## Tech Stack

- **Frontend**: Next.js 14 with React
- **Backend**: Next.js API Routes
- **LLM**: OpenAI GPT-4/GPT-3.5
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

