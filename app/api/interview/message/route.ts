import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveMessage, updateSessionStatus, updateCost } from '@/lib/db/sessions';
import { generateInterviewResponse, calculateCost } from '@/lib/orchestration/interview';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);
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
    saveMessage(sessionId, userMessage);

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

    const assistantResponse = await generateInterviewResponse(
      session.topic,
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
    saveMessage(sessionId, assistantMessage);

    // Track token usage (rough estimate)
    // In production, you'd get this from the API response
    const estimatedTokens = (message.length + assistantResponse.length) / 4; // Rough estimate
    const cost = calculateCost(estimatedTokens);
    updateCost(sessionId, Math.round(estimatedTokens), cost);

    const updatedSession = getSession(sessionId);

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

