import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession, updateSessionStatus, savePlan } from '@/lib/db/sessions';
import { generateInterviewPlan } from '@/lib/orchestration/interview';

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Create new session
    const sessionId = createSession(topic.trim());

    // Generate interview plan
    const plan = await generateInterviewPlan(topic.trim());
    savePlan(sessionId, plan);

    // Add initial system message
    const systemMessage = {
      role: 'system' as const,
      content: `You are conducting an interview about "${topic}". Your objectives are: ${plan.objectives.join(', ')}`,
      timestamp: new Date().toISOString()
    };

    // Add initial greeting
    const greeting = {
      role: 'assistant' as const,
      content: `Hello! I'd like to interview you about ${topic}. Let's start with: ${plan.questions[0] || `What can you tell me about ${topic}?`}`,
      timestamp: new Date().toISOString()
    };

    updateSessionStatus(sessionId, 'interviewing');

    const session = getSession(sessionId);

    return NextResponse.json({
      sessionId,
      session,
      plan
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    return NextResponse.json(
      { error: 'Failed to start interview' },
      { status: 500 }
    );
  }
}

