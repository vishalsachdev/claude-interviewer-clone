import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InterviewSession, Message, InterviewPlan, InterviewAnalysis, EducationRole } from '@/types';

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

export async function createSession(topic: string, role: EducationRole): Promise<string> {
  const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const { error } = await getSupabase()
    .from('sessions')
    .insert({
      id,
      topic,
      role,
      status: 'planning',
      created_at: now,
      updated_at: now
    });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return id;
}

export async function getSession(sessionId: string): Promise<InterviewSession | null> {
  const { data: session, error: sessionError } = await getSupabase()
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return null;
  }

  const { data: messages, error: messagesError } = await getSupabase()
    .from('messages')
    .select('role, content, timestamp')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (messagesError) {
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  return {
    id: session.id,
    topic: session.topic,
    role: session.role as EducationRole,
    status: session.status,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    transcript: (messages || []) as Message[],
    plan: session.plan as InterviewPlan | undefined,
    analysis: session.analysis as InterviewAnalysis | undefined,
    cost: session.cost_tokens > 0 ? {
      tokens: session.cost_tokens,
      cost: session.cost_amount
    } : undefined
  };
}

export async function updateSessionStatus(sessionId: string, status: InterviewSession['status']): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }
}

export async function saveMessage(sessionId: string, message: Message): Promise<void> {
  const { error } = await getSupabase()
    .from('messages')
    .insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    });

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

export async function savePlan(sessionId: string, plan: InterviewPlan): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      plan,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to save plan: ${error.message}`);
  }
}

export async function saveAnalysis(sessionId: string, analysis: InterviewAnalysis): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      analysis,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to save analysis: ${error.message}`);
  }
}

export async function updateCost(sessionId: string, tokens: number, cost: number): Promise<void> {
  // First get current values
  const { data: session, error: fetchError } = await getSupabase()
    .from('sessions')
    .select('cost_tokens, cost_amount')
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    throw new Error(`Failed to fetch session for cost update: ${fetchError?.message}`);
  }

  // Update with new totals
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      cost_tokens: (session.cost_tokens || 0) + tokens,
      cost_amount: (session.cost_amount || 0) + cost,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to update cost: ${error.message}`);
  }
}
