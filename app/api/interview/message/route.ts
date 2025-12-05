import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveMessage, updateCost } from '@/lib/db/sessions';
import { DEFAULT_MODEL, generateInterviewResponse, generateWrapUpResponse, calculateCost } from '@/lib/orchestration/interview';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, isWrapUp } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'interviewing') {
      return NextResponse.json(
        { error: 'Session is not in interviewing state' },
        { status: 400 }
      );
    }

    // Save user message
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };
    await saveMessage(sessionId, userMessage);

    // Generate response
    if (!session.plan) {
      return NextResponse.json(
        { error: 'Interview plan not found' },
        { status: 500 }
      );
    }

    const conversationHistory = session.transcript.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const assistantResponse = isWrapUp
      ? await generateWrapUpResponse(
          session.role,
          conversationHistory,
          message
        )
      : await generateInterviewResponse(
          session.role,
          session.plan,
          conversationHistory,
          message
        );

    // Save assistant response
    const assistantMessage = {
      role: 'assistant' as const,
      content: assistantResponse,
      timestamp: new Date().toISOString()
    };
    await saveMessage(sessionId, assistantMessage);

    // Track token usage (rough estimate)
    const estimatedTokens = (message.length + assistantResponse.length) / 4;
    const cost = calculateCost(estimatedTokens, DEFAULT_MODEL);
    await updateCost(sessionId, Math.round(estimatedTokens), cost);

    const updatedSession = await getSession(sessionId);

    return NextResponse.json({
      message: assistantResponse,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
