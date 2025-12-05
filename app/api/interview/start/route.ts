import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession, updateSessionStatus, savePlan, saveMessage } from '@/lib/db/sessions';
import { getInterviewPlanForRole, getFirstQuestionForRole } from '@/lib/orchestration/interview';
import { EducationRole } from '@/types';

const FIXED_TOPIC = 'AI in Education';

const VALID_ROLES: EducationRole[] = ['student', 'instructor', 'researcher', 'staff'];

const ROLE_GREETINGS: Record<EducationRole, string> = {
  student: "Hello! Thank you for taking part in this interview about AI in education. I'm interested in learning about your experiences as a student.",
  instructor: "Hello! Thank you for taking the time to share your perspective on AI in education. I'm curious to learn about your experiences as an instructor.",
  researcher: "Hello! Thank you for participating in this interview about AI in education. I'd love to hear about your experiences as a researcher.",
  staff: "Hello! Thank you for joining this conversation about AI in education. I'm interested in hearing about your experiences as a staff member."
};

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (student, instructor, researcher, or staff)' },
        { status: 400 }
      );
    }

    // Create new session with fixed topic and selected role
    const sessionId = await createSession(FIXED_TOPIC, role as EducationRole);

    // Get the fixed interview plan for this role (no AI generation needed)
    const plan = getInterviewPlanForRole(role as EducationRole);
    await savePlan(sessionId, plan);

    // Add initial system message
    const systemMessage = {
      role: 'system' as const,
      content: `You are conducting an interview about AI use in education. The interviewee is a ${role}. Your objectives are: ${plan.objectives.join(', ')}`,
      timestamp: new Date().toISOString()
    };
    await saveMessage(sessionId, systemMessage);

    // Add personalized greeting with first question
    const firstQuestion = getFirstQuestionForRole(role as EducationRole);
    const greeting = {
      role: 'assistant' as const,
      content: `${ROLE_GREETINGS[role as EducationRole]}\n\n${firstQuestion}`,
      timestamp: new Date().toISOString()
    };
    await saveMessage(sessionId, greeting);

    await updateSessionStatus(sessionId, 'interviewing');

    const session = await getSession(sessionId);

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
