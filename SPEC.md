# Interview Bot Clone - Technical Specification

## Overview

This document outlines the specifications for building an open-source interview bot clone that replicates the functionality of Claude's conversational interview system. The system is designed to conduct dynamic, probing interviews using Large Language Models (LLMs) with a focus on low-cost automation, ethical data handling, and extensibility for research purposes.

## Description

The interview bot leverages LLM conversational strengths for dynamic probing during interviews. No explicit technical specs were shared for the original system (e.g., exact Claude model or API endpoints), but the core functionality involves:

- **Dynamic Interview Planning**: AI generates interview questions based on context
- **Conversational Interviewing**: Natural, probing follow-up questions that adapt to responses
- **Transcript Analysis**: Automatic analysis and insights from completed interviews
- **Secure Storage**: Transcript storage with export capabilities

## High-Level Architecture

### Core Components

1. **Frontend**
   - Web chat interface for interviews
   - Quick prototyping with Streamlit or modern web framework (Next.js for Vercel)
   - Real-time conversation display
   - Interview status indicators

2. **Backend**
   - LLM orchestration layer for planning, interviewing, and analysis
   - API endpoints for interview lifecycle management
   - State management for interview sessions

3. **Data Pipeline**
   - Secure storage and export of transcripts
   - SQLite/PostgreSQL for local development
   - S3 or similar for scale (optional)
   - JSON export capabilities for data portability

4. **Orchestrator**
   - Manages workflows (LangChain/LangGraph recommended)
   - Multi-stage interview process:
     - Planning phase
     - Interviewing phase
     - Analysis phase
   - State machine for interview progression

## Tech Stack

### Recommended Stack (Original Spec)

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **LLM** | Grok API (xAI) or Llama 3 (via Ollama/local) | Cost-effective; supports long contexts for follow-ups. Fallback to OpenAI/Claude if needed. |
| **Framework** | LangChain/LangGraph | Handles multi-stage workflows; easy chaining of prompts. |
| **UI** | Streamlit | Rapid prototyping; embeds chat easily. |
| **Storage** | SQLite + JSON exports | Lightweight; GDPR-compliant anonymization |

### Implementation Stack (This Project)

| Component | Implementation | Rationale |
|-----------|---------------|-----------|
| **LLM** | OpenAI GPT-4o | High-quality responses, reliable API, good context handling |
| **Framework** | LangChain | Multi-stage workflow management, prompt chaining |
| **UI** | Next.js 14 (React) | Modern, scalable, excellent Vercel integration |
| **Storage** | Supabase (PostgreSQL) | Cloud-hosted, real-time capabilities, easy integration |
| **Deployment** | Vercel | Serverless, automatic scaling, easy CI/CD |
| **Backend** | Next.js API Routes | Integrated with frontend, serverless functions |

## Interview Workflow

### Phase 1: Role Selection
- User selects their educational role (Student, Instructor, Researcher, or Staff)
- System loads pre-defined interview plan for the selected role
- Fixed topic: "AI in Education"
- Plan includes:
  - Objectives (3-5 clear goals)
  - Initial questions (8-12 questions)
  - Focus areas (3-5 areas to probe)

### Phase 2: Interviewing
- System presents personalized greeting with first question
- User responds
- System generates probing follow-up questions (one at a time)
- Conversation continues dynamically
- All messages stored in transcript
- Real-time cost tracking

### Phase 3: Interview Closure
- **Time-based wrap-up**: After 10 minutes elapsed
- **Exchange-based wrap-up**: After 8+ user messages
- Bot sends warm closing message asking for final thoughts
- UI prompts user to complete or continue
- **Idle detection**: 2-minute nudge if user stops responding (no auto-close)
- User must explicitly click "Complete" to finish

### Phase 4: Analysis
- User completes interview
- System analyzes transcript
- Generates:
  - Summary (2-3 sentences based on actual responses)
  - Key insights (3-5 takeaways)
  - Recommendations (actionable suggestions)

## Key Metrics

### Success Criteria

- **Completion Rate**: >90%
  - Sessions reaching end without dropout
  - Gentle nudges for idle users (no forced closure)

- **Bias Check**: <5% skew
  - Post-analysis sentiment difference by demographic
  - Ensures fair and unbiased interviews

- **Cost per Interview**: <$0.05
  - Token usage tracking
  - Cost optimization through efficient prompting

## Development Roadmap

### Week 1 (MVP)
- Build planning + interviewing in web app
- Test with 10 mock sessions on AI usage
- Basic chat interface
- Interview plan generation
- Dynamic question generation

### Week 2
- Add analysis pipeline + data export
- Integrate scaling (async processing)
- Open-source on GitHub (MIT license)
- Documentation and setup guides
- Cost tracking and reporting

## Ethical Guardrails

### Privacy & Data Protection
- **No PII Collection**: No login required, no personal information stored
- **GDPR Compliance**: Use templates from OSF.io for IRB compliance
- **Data Anonymization**: All transcripts can be anonymized before export
- **Secure Storage**: Encrypted storage for sensitive interview data
- **User Control**: Users can export and delete their data at any time

### Research Ethics
- **IRB Compliance**: Templates and guidelines for research use
- **Informed Consent**: Clear communication about data usage
- **Transparency**: Open-source code for auditability
- **Bias Mitigation**: Regular checks for demographic bias

## API Endpoints

### Interview Management

- `POST /api/interview/start`
  - Creates new interview session
  - Accepts `role` parameter (student, instructor, researcher, staff)
  - Loads pre-defined interview plan for role
  - Returns session ID and initial greeting with first question

- `POST /api/interview/message`
  - Sends user message
  - Accepts optional `isWrapUp` flag for closing mode
  - Returns AI response (normal or wrap-up style)
  - Updates transcript

- `POST /api/interview/complete`
  - Completes interview
  - Triggers analysis
  - Returns analysis results

- `GET /api/interview/[sessionId]`
  - Retrieves session data
  - Returns transcript and metadata

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'student', 'instructor', 'researcher', 'staff'
  status TEXT NOT NULL,  -- 'planning', 'interviewing', 'completed', 'analyzing'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  plan JSONB,
  analysis JSONB,
  cost_tokens INTEGER DEFAULT 0,
  cost_amount REAL DEFAULT 0
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,  -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## Cost Optimization

### Strategies
- Use GPT-3.5-turbo for simpler tasks when possible
- Limit context window to last N messages
- Cache common responses
- Batch processing for analysis
- Token usage tracking per session

### Pricing Estimates (OpenAI)
- GPT-4: $0.03/1K input tokens, $0.06/1K output tokens
- GPT-4-turbo: $0.01/1K input tokens, $0.03/1K output tokens
- GPT-3.5-turbo: $0.0015/1K input tokens, $0.002/1K output tokens

Target: <$0.05 per interview (approximately 500-1000 tokens per interview)

## Deployment

### Vercel Configuration
- Serverless functions for API routes
- Automatic scaling
- Environment variables for API keys
- Database file stored in `/data` directory (local) or external storage (production)

### Environment Variables
```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o  # or gpt-4o-mini for cost savings
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Implemented Features

- [x] Role-based interview plans (Student, Instructor, Researcher, Staff)
- [x] Fixed topic: AI in Education
- [x] Time-based interview closure (10 minutes)
- [x] Exchange-based closure (8+ messages)
- [x] Idle user detection with gentle nudges (2 minutes)
- [x] Warm wrap-up messages from bot
- [x] Streamlined analysis (summary, insights, recommendations)
- [x] Supabase integration for cloud storage
- [x] Real-time cost tracking

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom interview templates
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Export to multiple formats (PDF, CSV, JSON)
- [ ] Integration with research platforms
- [ ] Webhook support for external integrations
- [ ] Rate limiting and usage quotas
- [ ] Admin dashboard for monitoring

## License

MIT License - Open source for research and commercial use

## References

- Original spec from Grok conversation on X (Twitter)
- LangChain documentation: https://python.langchain.com/
- OpenAI API documentation: https://platform.openai.com/docs
- Vercel deployment guide: https://vercel.com/docs
- OSF.io IRB templates: https://osf.io/

