export type EducationRole = 'student' | 'instructor' | 'researcher' | 'staff';

export interface InterviewSession {
  id: string;
  topic: string;
  role: EducationRole;
  status: 'planning' | 'interviewing' | 'completed' | 'analyzing';
  createdAt: string;
  updatedAt: string;
  transcript: Message[];
  plan?: InterviewPlan;
  analysis?: InterviewAnalysis;
  cost?: {
    tokens: number;
    cost: number;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface InterviewPlan {
  objectives: string[];
  questions: string[];
  focusAreas: string[];
}

export interface InterviewAnalysis {
  summary: string;
  keyInsights: string[];
  recommendations?: string[];
}

