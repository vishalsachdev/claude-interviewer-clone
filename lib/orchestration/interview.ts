import { ChatOpenAI } from '@langchain/openai';
import { InterviewPlan, InterviewAnalysis, EducationRole } from '@/types';

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Temperature 0.8 keeps conversation lively while staying on-topic
const model = new ChatOpenAI({
  model: DEFAULT_MODEL,
  temperature: 0.8,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Fixed interview plans for each education role
const INTERVIEW_PLANS: Record<EducationRole, InterviewPlan> = {
  student: {
    objectives: [
      'Understand how students currently use AI tools in their academic work',
      'Explore the impact of AI on learning and study habits',
      'Identify concerns about AI and academic integrity',
      'Gather perspectives on AI\'s future role in education'
    ],
    questions: [
      'First, tell me a bit about yourself - are you an undergraduate or graduate student, and what\'s your field of study?',
      'How do you currently use AI tools like ChatGPT, Claude, or other AI assistants in your coursework or studies?',
      'How has the availability of AI tools affected the way you learn or approach assignments?',
      'What concerns, if any, do you have about AI in relation to academic integrity or your own learning?',
      'How do you think AI will change education in your field over the next few years?',
      'What kind of guidance or support around AI would be helpful from your institution or instructors?'
    ],
    focusAreas: [
      'Current AI usage patterns',
      'Learning impact and study habits',
      'Academic integrity concerns',
      'Future expectations',
      'Institutional support needs'
    ]
  },
  instructor: {
    objectives: [
      'Understand how instructors are incorporating AI into their teaching',
      'Explore approaches to AI policies and academic integrity',
      'Identify challenges in adapting curriculum for the AI era',
      'Gather perspectives on resources and support needs'
    ],
    questions: [
      'To start, what courses do you teach and roughly how many students do you work with?',
      'How are you currently incorporating AI tools into your teaching practice, if at all?',
      'How do you address AI use with your students - do you have specific policies or guidelines?',
      'Has the rise of AI changed how you design assignments, assessments, or course materials?',
      'What concerns do you have about AI in your classroom or discipline?',
      'What resources, training, or institutional support would help you integrate AI more effectively in your teaching?'
    ],
    focusAreas: [
      'Teaching integration practices',
      'Policy and guidelines approaches',
      'Curriculum adaptation',
      'Concerns and challenges',
      'Resource and support needs'
    ]
  },
  researcher: {
    objectives: [
      'Understand how researchers are using AI in their work',
      'Explore attitudes toward AI-assisted writing and analysis',
      'Identify perspectives on research integrity and attribution',
      'Gather views on AI\'s impact on the research landscape'
    ],
    questions: [
      'Tell me about your research - what\'s your area of focus and where are you in your career?',
      'How are you currently using AI tools in your research workflow - from literature review to writing?',
      'What\'s your approach to AI-assisted writing or data analysis in your research?',
      'How do you think about research integrity and attribution when it comes to AI assistance?',
      'How is AI changing your field of research more broadly?',
      'What institutional support or policies around AI in research would be valuable to you?'
    ],
    focusAreas: [
      'Research workflow integration',
      'AI-assisted writing practices',
      'Research integrity perspectives',
      'Field-level impact',
      'Institutional support needs'
    ]
  },
  staff: {
    objectives: [
      'Understand how staff are using AI in their daily work',
      'Explore the impact of AI on roles and workload',
      'Identify challenges in AI adoption and supporting others',
      'Gather perspectives on training and resource needs'
    ],
    questions: [
      'What\'s your role and department? What are your main responsibilities?',
      'How are you currently using AI tools in your daily work, if at all?',
      'How has AI changed your role or workload - has it made things easier, more complex, or both?',
      'What challenges have you faced in adopting AI tools or supporting others who use them?',
      'How do you currently support faculty or students who have questions about AI?',
      'What training or resources would help you work more effectively with AI?'
    ],
    focusAreas: [
      'Daily work integration',
      'Role and workload impact',
      'Adoption challenges',
      'Supporting others',
      'Training and resource needs'
    ]
  }
};

// Role display names for prompts
const ROLE_LABELS: Record<EducationRole, string> = {
  student: 'Student',
  instructor: 'Instructor/Faculty',
  researcher: 'Researcher',
  staff: 'Staff Member'
};

export function getInterviewPlanForRole(role: EducationRole): InterviewPlan {
  return INTERVIEW_PLANS[role];
}

export function getFirstQuestionForRole(role: EducationRole): string {
  return INTERVIEW_PLANS[role].questions[0];
}

export async function generateInterviewResponse(
  role: EducationRole,
  plan: InterviewPlan,
  conversationHistory: Array<{ role: string; content: string }>,
  currentMessage: string
): Promise<string> {
  const historyContext = conversationHistory
    .slice(-10) // Last 10 messages for context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const roleLabel = ROLE_LABELS[role];
  const questionsRemaining = plan.questions.slice(1).join('\n- '); // Exclude first (context) question

  const prompt = `You are conducting an interview about AI use in education. You are speaking with a ${roleLabel}.

Interview Objectives:
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

Focus Areas to explore:
${plan.focusAreas.map(area => `- ${area}`).join('\n')}

Planned questions to cover (adapt based on conversation flow):
- ${questionsRemaining}

Previous conversation:
${historyContext}

Their latest response: ${currentMessage}

Your task:
1. Acknowledge their response warmly and naturally
2. Ask a thoughtful follow-up that probes deeper into their experience
3. Draw connections between what they've shared and the focus areas
4. Keep the conversation flowing naturally - don't interrogate
5. If they've explored a topic thoroughly, transition to a new area from your planned questions
6. Be curious and empathetic - this is a conversation, not a survey

Respond with your next question or comment. Be conversational and genuinely interested in their perspective.`;

  const response = await model.invoke(prompt);
  return response.content as string;
}

export async function analyzeInterview(
  role: EducationRole,
  plan: InterviewPlan,
  transcript: Array<{ role: string; content: string }>
): Promise<InterviewAnalysis> {
  const roleLabel = ROLE_LABELS[role];

  // Count actual user responses (exclude system and assistant messages)
  const userResponses = transcript.filter(msg => msg.role === 'user');

  // If no user responses or minimal engagement, return an incomplete analysis
  if (userResponses.length === 0) {
    return {
      summary: `Interview with a ${roleLabel} was started but not completed. No responses were provided.`,
      keyInsights: ['Interview incomplete - no responses recorded'],
      depthScore: 0,
      completionRate: 0,
      recommendations: ['Complete the interview by responding to the interviewer\'s questions']
    };
  }

  // If only 1-2 responses, indicate minimal engagement
  if (userResponses.length <= 2) {
    return {
      summary: `Interview with a ${roleLabel} was briefly started but ended early with minimal engagement.`,
      keyInsights: [
        'Interview incomplete - only minimal responses provided',
        'Insufficient data to extract meaningful insights about AI use in education'
      ],
      depthScore: 1,
      completionRate: Math.min(0.2, userResponses.length / 10),
      recommendations: ['Continue the interview to explore AI experiences more thoroughly']
    };
  }

  const transcriptText = transcript
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');

  const prompt = `Analyze this interview transcript about AI use in education. The interviewee is a ${roleLabel}.

Interview Objectives:
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

Transcript:
${transcriptText}

IMPORTANT: Base your analysis ONLY on what was actually discussed in the transcript. Do not make assumptions or generate insights based solely on the objectives.

Provide a comprehensive analysis as JSON:
{
  "summary": "A 2-3 sentence summary capturing this ${roleLabel}'s perspective on AI in education based ONLY on their actual responses",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "depthScore": 4,
  "completionRate": 0.95,
  "recommendations": ["recommendation1", "recommendation2"]
}

Depth Score: Rate 1-5 how deeply they explored their AI experiences (5 = very candid and detailed)
Completion Rate: 0-1, how many focus areas were meaningfully discussed
Key Insights: 3-5 main takeaways about this person's relationship with AI in education
Recommendations: Suggestions for how the institution could better support this ${roleLabel}`;

  const response = await model.invoke(prompt);
  const content = response.content as string;

  try {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    return {
      summary: `Interview with a ${roleLabel} completed. The conversation explored their experiences with AI in education.`,
      keyInsights: ['Interview completed successfully'],
      depthScore: 3,
      completionRate: 0.8
    };
  }
}

export function calculateCost(tokens: number, modelName: string = DEFAULT_MODEL): number {
  // OpenAI pricing (as of November 2024) in USD per 1K tokens
  // Always verify current pricing at https://openai.com/pricing
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  };

  const rates = pricing[modelName] || pricing['gpt-4o'];
  const inputRate = rates.input / 1000;
  const outputRate = rates.output / 1000;
  // Rough estimate: assume 50/50 input/output split
  return (tokens / 2) * inputRate + (tokens / 2) * outputRate;
}
