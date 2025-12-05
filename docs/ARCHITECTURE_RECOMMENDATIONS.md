# Architecture Recommendations: AI Interviewer

Based on analysis of the 99Ravens article "Your Experts Won't Train Your AI. You Have to Interview Them" and first-principles evaluation against the current codebase.

---

## Executive Summary

The 99Ravens article describes a sophisticated **multi-agent architecture** (Interviewer + Note-Taker) for capturing expert knowledge. However, after first-principles analysis, **this architecture is not recommended for the current use case**.

The multi-agent approach solves problems that don't exist at this application's scale:
- **40+ minute interviews** → This app targets **10 minutes**
- **Context window overflow** → This app uses **last 10 messages only**
- **Reusable digital personas** → This app outputs **summaries + insights**
- **High-value expert capture** → This app collects **stakeholder feedback**

**Recommendation**: Implement targeted single-agent improvements instead. Revisit multi-agent when the use case evolves.

---

## First-Principles Analysis

### What Problem Does Multi-Agent Solve?

The 99Ravens article identifies these single-agent failure modes:

| Failure Mode | Occurs When | This App's Exposure |
|--------------|-------------|---------------------|
| "Gets lost in tangents" | Long conversations (40+ min) | **Low** - 10 min / 8 exchanges |
| "Repeats questions" | No memory of what was asked | **Low** - solvable with simple tracking |
| "Context window fills up" | Full transcript in context | **None** - using 10-message truncation |
| "Can't separate gold from gravel" | Building reusable personas | **N/A** - output is summary only |
| "Loses peer status" | Extended expert interviews | **Low** - short stakeholder feedback |

### The Cost-Value Equation

**Token consumption** (from [Anthropic research](https://www.anthropic.com/engineering/multi-agent-research-system)):
- Single agent: ~4× more tokens than simple chat
- Multi-agent: ~15× more tokens than chat

**This application's constraints**:
- Target cost: <$0.05/interview
- Multi-agent estimated cost: $0.15-0.25/interview (3-5× increase)

**Question**: Is 3-5× cost increase justified for 10-minute educational feedback interviews?

**Answer**: No. The value extracted doesn't justify the complexity and cost.

### Use Case Comparison

| Aspect | 99Ravens Target | This Application |
|--------|-----------------|------------------|
| **Interview Duration** | 40+ minutes | 10 minutes |
| **Interviewee** | Senior domain experts | Students, staff, instructors |
| **Output** | Reusable digital persona | Summary + 3-5 insights |
| **Value per Interview** | Very high (career knowledge) | Moderate (stakeholder feedback) |
| **Cost Tolerance** | High ($0.25+ acceptable) | Low (<$0.05 target) |
| **Validation Required** | Yes (expert reviews persona) | No |

### When Multi-Agent Becomes Appropriate

Revisit multi-agent architecture when ANY of these conditions are met:

1. **Interview duration increases to 30+ minutes**
2. **Output requirement changes to reusable digital personas**
3. **Cost tolerance increases to $0.25+/interview**
4. **Expert validation loops are added**
5. **Context window management becomes a demonstrated problem**

---

## Recommended Architecture: Enhanced Single-Agent

Instead of multi-agent, implement these targeted improvements:

### Current State

```
User Message → Single LLM Call → Response
                    ↓
            (Fixed prompt with plan)
```

### Recommended State

```
User Message → Single LLM Call → Response + Structured Metadata
                    ↓
            (Enhanced prompt with coverage tracking)
                    ↓
            Server-side state (topics covered, time elapsed)
```

---

## Recommended Improvements

### 1. Structured Output for Coverage Tracking (High Impact, Low Effort)

Add structured metadata to each response WITHOUT a second agent. This gives Note-Taker benefits at single-agent cost.

**Modify: `lib/orchestration/interview.ts`**

```typescript
import { z } from 'zod';

// Structured output schema - single LLM returns both response AND metadata
export const InterviewResponseSchema = z.object({
  response: z.string(),
  metadata: z.object({
    topicsCovered: z.array(z.string()),
    currentTopicDepth: z.enum(['surface', 'moderate', 'deep']),
    suggestedNextTopic: z.string().optional(),
    detectedGenericResponse: z.boolean(),
  })
});

export async function generateInterviewResponse(
  role: EducationRole,
  plan: InterviewPlan,
  conversationHistory: Message[],
  currentMessage: string,
  coveredTopics: string[]  // Track across session
): Promise<{ response: string; metadata: ResponseMetadata }> {

  const prompt = `You are conducting an interview about AI in education with a ${role}.

## Interview Plan
Objectives: ${plan.objectives.join(', ')}
Focus Areas: ${plan.focusAreas.join(', ')}

## Already Covered Topics
${coveredTopics.length > 0 ? coveredTopics.join(', ') : 'None yet'}

## Conversation
${formatHistory(conversationHistory)}

Their latest response: ${currentMessage}

## Your Task
1. Acknowledge their response briefly (1 sentence)
2. Ask ONE follow-up question

## Constraints
- Ask only ONE question per response
- Keep response to 2-3 sentences max
- If they gave a generic "best practice" answer, ask for a SPECIFIC example
- Probe for challenges and mistakes, not just successes
- Don't repeat topics already covered

## Response Format
Return JSON:
{
  "response": "Your conversational response here",
  "metadata": {
    "topicsCovered": ["topics from focus areas addressed in their response"],
    "currentTopicDepth": "surface|moderate|deep",
    "suggestedNextTopic": "next focus area to explore",
    "detectedGenericResponse": true/false
  }
}`;

  // Use structured output mode
  const result = await model.invoke(prompt, {
    response_format: { type: "json_object" }
  });

  return InterviewResponseSchema.parse(JSON.parse(result.content));
}
```

### 2. "Probe for Failures" Prompting (High Impact, Trivial Effort)

Add to existing prompt guidelines:

```typescript
const PROBING_GUIDELINES = `
## Probing Guidelines
- If they give a generic "best practice" answer, ask: "Can you tell me about a specific time when...?"
- Ask about challenges and mistakes: "What hasn't worked well?" or "What would you do differently?"
- Probe for specifics: "You mentioned X - can you walk me through an example?"
- Don't accept surface-level answers on important topics
`;
```

### 3. Server-Side Time Tracking (Medium Impact, Low Effort)

Move time tracking from client to server for reliability.

**Modify: `lib/db/sessions.ts`**

```typescript
export interface Session {
  // ... existing fields
  startedAt: string | null;      // When interviewing began
  targetDurationMs: number;       // 10 minutes = 600000
}

export function shouldWrapUp(session: Session): boolean {
  if (!session.startedAt) return false;
  const elapsed = Date.now() - new Date(session.startedAt).getTime();
  return elapsed >= session.targetDurationMs;
}
```

**Modify: `/api/interview/message/route.ts`**

```typescript
// Check server-side time before generating response
const shouldWrapUp = checkShouldWrapUp(session);
if (shouldWrapUp && !isWrapUp) {
  // Automatically enter wrap-up mode
  isWrapUp = true;
}
```

### 4. Question Deduplication (Medium Impact, Low Effort)

Track asked questions to prevent repetition.

```typescript
export interface Session {
  // ... existing fields
  askedQuestions: string[];  // Track question themes/topics
}

// In prompt generation
const prompt = `
...
## Questions Already Asked (DO NOT REPEAT)
${session.askedQuestions.map(q => `- ${q}`).join('\n')}
...
`;
```

### 5. Externalize Interview Configuration (Medium Impact, Medium Effort)

Move hardcoded plans to JSON files for easier iteration.

**Create: `lib/config/plans/student.json`**

```json
{
  "role": "student",
  "objectives": [
    "Understand how students currently use AI tools in their academic work",
    "Explore the impact of AI on learning and study habits",
    "Identify concerns about AI and academic integrity",
    "Gather perspectives on AI's future role in education"
  ],
  "questions": [
    "First, tell me a bit about yourself - are you an undergraduate or graduate student, and what's your field of study?",
    "How do you currently use AI tools like ChatGPT, Claude, or other AI assistants in your coursework or studies?"
  ],
  "focusAreas": [
    "Current AI usage patterns",
    "Learning impact and study habits",
    "Academic integrity concerns",
    "Future expectations",
    "Institutional support needs"
  ],
  "probingPrompts": [
    "Can you give me a specific example of when that happened?",
    "What challenges have you faced with that?",
    "What would you do differently if you could?"
  ]
}
```

---

## Implementation Priority

| Change | Impact | Effort | Cost Change | Priority |
|--------|--------|--------|-------------|----------|
| Structured output (coverage tracking) | High | Low | +10% | **P0** |
| "Probe for failures" prompting | High | Trivial | None | **P0** |
| Server-side time tracking | Medium | Low | None | **P1** |
| Question deduplication | Medium | Low | None | **P1** |
| Externalize config to JSON | Medium | Medium | None | **P2** |

**Total estimated cost increase**: ~10% (vs. 300-500% for multi-agent)

---

## Multi-Agent Architecture (Future Reference)

The following section documents the 99Ravens multi-agent architecture for future reference when the use case evolves.

### The Interviewer + Note-Taker Pattern

```
User Message → Interviewer Agent → Response
                    ↓ (queries)
              Note-Taker Agent
                    ↓ (returns)
              Structured Analysis
```

**Key insight**: The Note-Taker returns **structured data, not prose**. This prevents the Interviewer from getting confused by a second voice.

### What the Note-Taker Tracks

```typescript
interface NoteTakerAnalysis {
  coverageAnalysis: {
    topic: string;
    confidence: 'high' | 'medium' | 'low' | 'unexplored';
    keyPoints: string[];
  }[];

  gapIdentification: {
    area: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    suggestedProbe: string;
  }[];

  timeStatus: {
    elapsedMinutes: number;
    targetMinutes: number;
    pacing: 'behind' | 'on_track' | 'ahead';
    shouldWrapUp: boolean;
  };

  patternDetection: {
    emergingThemes: string[];
    contradictions: string[];
    genericResponses: string[];  // Flagged "best practices" answers
  };

  nextAction: {
    type: 'probe_deeper' | 'new_topic' | 'clarify' | 'wrap_up';
    suggestion: string;
    rationale: string;
  };
}
```

### Digital Persona Output

For expert knowledge capture, the output should be a **reusable first-person system prompt**:

```typescript
interface DigitalPersona {
  identity: {
    role: string;
    domain: string;
    uniquePositioning: string;
  };

  beliefs: {
    coreValues: string[];
    nonNegotiables: string[];
    controversialStances: string[];
  };

  frameworks: {
    name: string;
    description: string;
    whenToUse: string;
  }[];

  communicationStyle: {
    tone: string;
    vocabulary: string[];
    avoidances: string[];
  };

  reasoningExamples: {
    situation: string;
    theirResponse: string;
    rationale: string;
  }[];
}
```

### When to Implement Multi-Agent

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Interview duration | >30 minutes | Add Note-Taker for context management |
| Output requirement | Digital persona | Add persona generator pipeline |
| Cost tolerance | >$0.25/interview | Multi-agent becomes viable |
| Quality complaints | Repeated questions, lost context | Investigate Note-Taker |
| Expert validation | Required | Add validation loop |

---

## Architectural Rules (From 99Ravens Article)

These rules apply regardless of single vs. multi-agent:

### Always Implement:
1. ✅ **Role-specific prompts are mandatory** - Already done
2. ✅ **Filter to human/AI turns** - Already filtering system messages
3. ✅ **Attribute who said what** - Using role prefixes
4. 🔲 **Probe for mistakes, not just successes** - Add to prompts
5. 🔲 **Time enforcement needs external trigger** - Move to server-side

### Multi-Agent Specific (Future):
1. **Note-Taker must return structured data, not prose**
2. **Interviewer should not see Note-Taker's "voice"**
3. **Coverage tracking drives question selection**

---

## Summary

The 99Ravens multi-agent architecture is impressive but **over-engineered for this use case**.

From [Anthropic's guidance on building effective agents](https://www.anthropic.com/engineering/building-effective-agents):

> "Start with simple prompts, optimize them with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short."

For 10-minute stakeholder feedback interviews with summary outputs:
- **Do**: Structured output, better prompts, server-side time tracking
- **Don't**: Multi-agent architecture, digital personas, validation loops

Revisit this decision when interview duration exceeds 30 minutes or output requirements change to reusable personas.

---

## References

- [99Ravens: Your Experts Won't Train Your AI. You Have to Interview Them](https://www.99ravens.agency/resources/blogs/your-experts-wont-train-your-ai-you-have-to-interview-them/)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: How We Built Our Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
