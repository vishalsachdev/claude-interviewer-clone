import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionStatus, saveAnalysis } from '@/lib/db/sessions';
import { analyzeInterview } from '@/lib/orchestration/interview';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    if (!session.plan) {
      return NextResponse.json(
        { error: 'Interview plan not found' },
        { status: 500 }
      );
    }

    updateSessionStatus(sessionId, 'analyzing');

    // Analyze the interview
    const analysis = await analyzeInterview(
      session.topic,
      session.plan,
      session.transcript
    );

    saveAnalysis(sessionId, analysis);
    updateSessionStatus(sessionId, 'completed');

    const updatedSession = getSession(sessionId);

    return NextResponse.json({
      analysis,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    );
  }
}

