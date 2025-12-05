import { ChatOpenAI } from '@langchain/openai';
import { InterviewPlan, InterviewAnalysis } from '@/types';

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Temperature 0.8 keeps conversation lively while staying on-topic
const model = new ChatOpenAI({
  model: DEFAULT_MODEL,
  temperature: 0.8,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function generateInterviewPlan(topic: string): Promise<InterviewPlan> {
  const prompt = `You are an expert interviewer. Create a comprehensive interview plan for the topic: "${topic}"

Generate:
1. 3-5 clear objectives for this interview
2. 8-12 initial questions that will help explore the topic deeply
3. 3-5 focus areas to probe during the conversation

Return your response as a JSON object with this structure:
{
  "objectives": ["objective1", "objective2", ...],
  "questions": ["question1", "question2", ...],
  "focusAreas": ["area1", "area2", ...]
}`;

  const response = await model.invoke(prompt);
  const content = response.content as string;
  
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      objectives: [`Explore ${topic} in depth`],
      questions: [
        `What is your experience with ${topic}?`,
        `Can you tell me more about ${topic}?`,
        `What are the key aspects of ${topic}?`
      ],
      focusAreas: ['Understanding', 'Experience', 'Perspectives']
    };
  }
}

export async function generateInterviewResponse(
  topic: string,
  plan: InterviewPlan,
  conversationHistory: Array<{ role: string; content: string }>,
  currentMessage: string
): Promise<string> {
  const historyContext = conversationHistory
    .slice(-10) // Last 10 messages for context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `You are conducting an in-depth interview about "${topic}".

Interview Objectives:
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

Focus Areas:
${plan.focusAreas.map(area => `- ${area}`).join('\n')}

Previous conversation:
${historyContext}

Interviewee's latest response: ${currentMessage}

Your task:
1. Acknowledge their response naturally
2. Ask a probing follow-up question that digs deeper
3. Explore the focus areas that haven't been covered yet
4. Keep the conversation natural and conversational
5. If they've answered thoroughly, you can move to a new question from the plan

Respond as the interviewer with your next question or follow-up. Be conversational and engaging.`;

  const response = await model.invoke(prompt);
  return response.content as string;
}

export async function analyzeInterview(
  topic: string,
  plan: InterviewPlan,
  transcript: Array<{ role: string; content: string }>
): Promise<InterviewAnalysis> {
  // Count actual user responses (exclude system and assistant messages)
  const userResponses = transcript.filter(msg => msg.role === 'user');

  // If no user responses or minimal engagement, return an incomplete analysis
  if (userResponses.length === 0) {
    return {
      summary: `Interview was started but not completed. No responses were provided to explore the topic of ${topic}.`,
      keyInsights: ['Interview incomplete - no user responses recorded'],
      depthScore: 0,
      completionRate: 0,
      recommendations: ['Complete the interview by responding to the interviewer\'s questions']
    };
  }

  // If only 1-2 responses, indicate minimal engagement
  if (userResponses.length <= 2) {
    return {
      summary: `Interview was briefly started but ended early with minimal engagement on the topic of ${topic}.`,
      keyInsights: [
        'Interview incomplete - only minimal responses provided',
        'Insufficient data to extract meaningful insights'
      ],
      depthScore: 1,
      completionRate: Math.min(0.2, userResponses.length / 10),
      recommendations: ['Continue the interview to explore the topic more thoroughly']
    };
  }

  const transcriptText = transcript
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');

  const prompt = `Analyze this interview transcript about "${topic}".

Interview Objectives:
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

Transcript:
${transcriptText}

IMPORTANT: Base your analysis ONLY on what was actually discussed in the transcript. Do not make assumptions or generate insights based solely on the objectives.

Provide a comprehensive analysis as JSON:
{
  "summary": "A 2-3 sentence summary of the interview based ONLY on actual responses",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "depthScore": 4,
  "completionRate": 0.95,
  "recommendations": ["recommendation1", "recommendation2"]
}

Depth Score: Rate 1-5 how deeply the topic was explored based on actual responses (5 = very deep)
Completion Rate: 0-1, how much of the interview plan was completed based on actual discussion
Key Insights: 3-5 main takeaways from actual responses only
Recommendations: Optional suggestions for follow-up or action items`;

  const response = await model.invoke(prompt);
  const content = response.content as string;

  try {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    return {
      summary: `Interview completed on ${topic}. The conversation explored various aspects of the topic.`,
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
