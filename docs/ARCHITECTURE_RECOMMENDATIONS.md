# Architecture Recommendations: Multi-Agent AI Interviewer

Based on analysis of the 99Ravens article "Your Experts Won't Train Your AI. You Have to Interview Them" and the current codebase implementation.

## Executive Summary

The current implementation uses a **single-agent architecture** that cannot achieve "peer status" with experts for extended interviews. The article recommends a **multi-agent architecture** with an Interviewer + Note-Taker pattern that separates conversation from strategic analysis.

## Current Architecture vs. Recommended Architecture

### Current State (Single-Agent)

```
User Message → Single LLM Call → Response
                    ↓
            (Fixed prompt with plan)
```

**Current Limitations:**
- Single LLM handles both conversation AND strategic decisions
- Fixed interview plans - no adaptive questioning
- No coverage tracking or gap identification
- Time enforcement is client-side only (unreliable)
- Context window fills up without summarization
- Analysis is a single-shot extraction, not a reusable persona
- No validation stage with the expert

### Recommended State (Multi-Agent)

```
User Message → Interviewer Agent → Response
                    ↓ (queries)
              Note-Taker Agent
                    ↓ (returns)
              Structured Analysis
```

---

## Key Architectural Changes

### 1. Implement the Note-Taker Agent

The Note-Taker is the core innovation. It's an **internal tool invisible to the expert** that continuously analyzes the conversation and returns **structured data, not prose**.

**Create: `lib/agents/note-taker.ts`**

```typescript
import { z } from 'zod';

// Structured output schema - Note-Taker MUST return structured data
export const NoteTakerAnalysisSchema = z.object({
  coverageAnalysis: z.array(z.object({
    topic: z.string(),
    confidence: z.enum(['high', 'medium', 'low', 'unexplored']),
    keyPoints: z.array(z.string()),
  })),
  gapIdentification: z.array(z.object({
    area: z.string(),
    importance: z.enum(['critical', 'high', 'medium', 'low']),
    suggestedProbe: z.string(),
  })),
  timeStatus: z.object({
    elapsedMinutes: z.number(),
    targetMinutes: z.number(),
    pacing: z.enum(['behind', 'on_track', 'ahead']),
    shouldWrapUp: z.boolean(),
  }),
  patternDetection: z.object({
    emergingThemes: z.array(z.string()),
    contradictions: z.array(z.string()),
    genericResponses: z.array(z.string()), // Flagged "best practices" answers
    depthIndicators: z.array(z.object({
      topic: z.string(),
      depth: z.enum(['surface', 'moderate', 'deep']),
    })),
  }),
  nextAction: z.object({
    type: z.enum(['probe_deeper', 'new_topic', 'clarify', 'wrap_up']),
    suggestion: z.string(),
    rationale: z.string(),
  }),
});

export type NoteTakerAnalysis = z.infer<typeof NoteTakerAnalysisSchema>;

export async function analyzeConversation(
  role: string,
  plan: InterviewPlan,
  transcript: Message[],
  elapsedMinutes: number,
  targetMinutes: number
): Promise<NoteTakerAnalysis> {
  // This agent returns STRUCTURED DATA only
  // It does NOT generate conversational text
}
```

### 2. Refactor the Interviewer Agent

The Interviewer should query the Note-Taker before each response. The Note-Taker's structured output guides the next question.

**Refactor: `lib/agents/interviewer.ts`**

```typescript
export async function generateInterviewResponse(
  role: EducationRole,
  plan: InterviewPlan,
  conversationHistory: Message[],
  currentMessage: string,
  noteTakerAnalysis: NoteTakerAnalysis  // NEW: Structured guidance
): Promise<string> {

  // Build prompt with Note-Taker insights
  const prompt = `You are conducting an interview with a ${role}.

${buildConversationContext(conversationHistory)}

Their latest response: ${currentMessage}

## Strategic Guidance (from analysis)

Coverage Status:
${formatCoverage(noteTakerAnalysis.coverageAnalysis)}

Key Gaps to Address:
${formatGaps(noteTakerAnalysis.gapIdentification)}

Suggested Next Action: ${noteTakerAnalysis.nextAction.type}
Specific Probe: ${noteTakerAnalysis.nextAction.suggestion}

Time Status: ${noteTakerAnalysis.timeStatus.pacing} (${noteTakerAnalysis.timeStatus.elapsedMinutes}/${noteTakerAnalysis.timeStatus.targetMinutes} min)
${noteTakerAnalysis.timeStatus.shouldWrapUp ? '⚠️ TIME TO WRAP UP' : ''}

## Interviewer Constraints
- Ask only ONE question per response
- Keep response to 2-3 sentences max
- Reference their specific language when acknowledging
- If they gave a generic "best practice" answer, probe for a specific example
- PROBE FOR MISTAKES AND FAILURES, not just successes

Respond as a peer colleague, not an interviewer:`;
}
```

### 3. Add the Validation Stage

The article emphasizes that experts must validate the output. This creates a feedback loop for improving persona fidelity.

**Create: `lib/orchestration/validation.ts`**

```typescript
export interface ValidationResult {
  samplePrompt: string;
  expertScore: 1 | 2 | 3 | 4 | 5;  // Fidelity score
  feedback: string;
  areasToRevisit: string[];
}

export async function generateValidationSample(
  persona: DigitalPersona,
  scenario: string
): Promise<string> {
  // Generate sample output using the persona
  // Expert reviews if this "sounds like them"
}

export async function processValidationFeedback(
  sessionId: string,
  validation: ValidationResult
): Promise<void> {
  // Low scores (1-3) trigger targeted follow-up interviews
  if (validation.expertScore <= 3) {
    await scheduleFollowUpInterview(sessionId, validation.areasToRevisit);
  }
}
```

### 4. Transform Analysis Output to Digital Persona

The current output is summary + insights. The article recommends outputting a **reusable first-person system prompt**.

**Create: `lib/orchestration/persona-generator.ts`**

```typescript
export interface DigitalPersona {
  // Professional identity and domain positioning
  identity: {
    role: string;
    domain: string;
    experienceLevel: string;
    uniquePositioning: string;
  };

  // Core beliefs and non-negotiable principles
  beliefs: {
    coreValues: string[];
    nonNegotiables: string[];
    controversialStances: string[];  // What they believe that others don't
  };

  // Specific frameworks and named methodologies
  frameworks: {
    name: string;
    description: string;
    whenToUse: string;
  }[];

  // Communication style and constraints
  communicationStyle: {
    tone: string;
    vocabulary: string[];  // Terms they frequently use
    avoidances: string[];  // Things they would never say
    patterns: string[];    // Characteristic phrases
  };

  // Few-shot examples of their reasoning patterns
  reasoningExamples: {
    situation: string;
    theirResponse: string;
    rationale: string;
  }[];

  // Knowledge base references
  knowledgeBase: {
    sources: string[];
    usageInstructions: string;
  };
}

export async function generatePersonaFromTranscript(
  role: string,
  transcript: Message[],
  plan: InterviewPlan
): Promise<DigitalPersona> {
  // Multi-pass extraction:
  // 1. Extract entities (tools, concepts, people mentioned)
  // 2. Identify belief patterns
  // 3. Extract frameworks and methodologies
  // 4. Capture communication style
  // 5. Build reasoning examples from their stories
}

export function personaToSystemPrompt(persona: DigitalPersona): string {
  // Convert persona to first-person system prompt
  // "I am [identity]. I believe [beliefs]. When I approach [situation], I use [framework]..."
}
```

---

## Implementation Phases

### Phase 1: Note-Taker Agent (High Impact)

1. Create `lib/agents/note-taker.ts` with structured output schema
2. Modify `/api/interview/message` to call Note-Taker before Interviewer
3. Store Note-Taker analysis in session for debugging/analytics
4. Add server-side time tracking (don't rely on client)

**Files to modify:**
- `lib/orchestration/interview.ts` → refactor into `lib/agents/`
- `app/api/interview/message/route.ts` → add Note-Taker call

### Phase 2: Adaptive Questioning (Medium Impact)

1. Replace fixed `questions[]` with dynamic question selection
2. Implement coverage tracking against focus areas
3. Add gap prioritization logic
4. Implement "probe for failures" heuristic

**Key behavior change:**
- Current: Follow pre-defined question list
- New: Dynamically select next question based on coverage gaps

### Phase 3: Digital Persona Output (High Impact)

1. Create `lib/orchestration/persona-generator.ts`
2. Replace current `analyzeInterview()` with multi-pass extraction
3. Output first-person system prompt instead of summary
4. Store persona as reusable asset

**Files to modify:**
- `app/api/interview/complete/route.ts`
- `types/index.ts` → add `DigitalPersona` type

### Phase 4: Validation Loop (Medium Impact)

1. Create validation UI for expert review
2. Generate sample outputs from persona
3. Collect fidelity scores (1-5)
4. Trigger follow-up interviews for low scores

---

## Architectural Rules from the Article

### Must Implement:

1. **Role-specific prompts are mandatory** ✅ (Already done)
2. **Multi-agent beats single-agent for interviews >10 min** ❌ (Need Note-Taker)
3. **Note-Taker must return structured data** ❌ (Not implemented)
4. **Probe for mistakes, not just successes** ❌ (Need to add to prompts)
5. **Time enforcement needs external trigger** ⚠️ (Client-side only currently)

### Data Handling Rules:

1. **Filter to human/AI turns** ✅ (Already filtering system messages)
2. **Attribute who said what** ✅ (Using role prefixes)
3. **Convert HTML to markdown** ⚠️ (Not applicable yet, but add if importing docs)

---

## Proposed File Structure

```
lib/
├── agents/
│   ├── interviewer.ts       # Conversation agent
│   ├── note-taker.ts        # Analysis agent (structured output)
│   └── types.ts             # Shared agent types
├── orchestration/
│   ├── interview-flow.ts    # State machine for interview stages
│   ├── persona-generator.ts # Transcript → Digital Persona
│   └── validation.ts        # Expert validation loop
├── config/
│   ├── plans/
│   │   ├── student.json
│   │   ├── instructor.json
│   │   └── ...
│   ├── prompts/
│   │   ├── interviewer.md
│   │   ├── note-taker.md
│   │   └── persona.md
│   └── roles.ts
└── db/
    └── sessions.ts          # (unchanged)
```

---

## Database Schema Additions

```sql
-- Add to sessions table
ALTER TABLE sessions ADD COLUMN persona JSONB;  -- Digital persona output
ALTER TABLE sessions ADD COLUMN validation_scores INTEGER[];  -- Expert scores

-- New table for Note-Taker snapshots
CREATE TABLE note_taker_snapshots (
  id SERIAL PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  turn_number INTEGER,
  analysis JSONB,  -- NoteTakerAnalysis
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New table for validation
CREATE TABLE persona_validations (
  id SERIAL PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  sample_prompt TEXT,
  sample_output TEXT,
  expert_score INTEGER CHECK (expert_score BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Priority Matrix

| Change | Impact | Effort | Priority |
|--------|--------|--------|----------|
| Note-Taker agent | High | Medium | **P0** |
| Structured output schema | High | Low | **P0** |
| Server-side time tracking | Medium | Low | **P1** |
| "Probe for failures" prompting | Medium | Low | **P1** |
| Adaptive question selection | High | Medium | **P1** |
| Digital Persona output | High | High | **P2** |
| Validation loop | Medium | High | **P2** |
| Externalized config | Medium | Medium | **P3** |

---

## Summary

The core insight from the article is that **a single-agent system cannot maintain peer status** in extended interviews. The solution is architectural: separate the conversational intelligence (Interviewer) from the strategic intelligence (Note-Taker).

The Note-Taker acts as working memory, tracking:
- What's been covered vs. what's missing
- When the expert gives generic answers that need probing
- Time pacing and wrap-up triggers
- The specific next probe to ask

This separation allows the Interviewer to stay fully present in the conversation while the Note-Taker ensures strategic coverage.

The output should be a **reusable digital persona** - a first-person system prompt that captures the expert's thinking, not just a summary of what they said.
