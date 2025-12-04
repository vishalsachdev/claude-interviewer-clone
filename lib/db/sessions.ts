import { getDatabase } from './setup';
import { InterviewSession, Message, InterviewPlan, InterviewAnalysis } from '@/types';

export function createSession(topic: string): string {
  const db = getDatabase();
  const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, topic, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, topic, 'planning', now, now);

  return id;
}

export function getSession(sessionId: string): InterviewSession | null {
  const db = getDatabase();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;

  if (!session) return null;

  const messages = db.prepare(`
    SELECT role, content, timestamp
    FROM messages
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(sessionId) as Message[];

  return {
    id: session.id,
    topic: session.topic,
    status: session.status,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    transcript: messages,
    plan: session.plan ? JSON.parse(session.plan) : undefined,
    analysis: session.analysis ? JSON.parse(session.analysis) : undefined,
    cost: session.cost_tokens > 0 ? {
      tokens: session.cost_tokens,
      cost: session.cost_amount
    } : undefined
  };
}

export function updateSessionStatus(sessionId: string, status: InterviewSession['status']) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(status, new Date().toISOString(), sessionId);
}

export function saveMessage(sessionId: string, message: Message) {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO messages (session_id, role, content, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, message.role, message.content, message.timestamp);
}

export function savePlan(sessionId: string, plan: InterviewPlan) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions
    SET plan = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(plan), new Date().toISOString(), sessionId);
}

export function saveAnalysis(sessionId: string, analysis: InterviewAnalysis) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions
    SET analysis = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(analysis), new Date().toISOString(), sessionId);
}

export function updateCost(sessionId: string, tokens: number, cost: number) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sessions
    SET cost_tokens = cost_tokens + ?, cost_amount = cost_amount + ?, updated_at = ?
    WHERE id = ?
  `).run(tokens, cost, new Date().toISOString(), sessionId);
}

