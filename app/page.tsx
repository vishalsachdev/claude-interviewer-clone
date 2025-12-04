'use client';

import { useState, useRef, useEffect } from 'react';
import { InterviewSession, Message } from '@/types';

export default function Home() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.transcript]);

  const startInterview = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const data = await response.json();
      setSession(data.session);
      setTopic('');
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !session) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setSession({
      ...session,
      transcript: [...session.transcript, tempUserMessage],
    });

    try {
      const response = await fetch('/api/interview/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: userMessage,
        }),
      });

      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setSession({
        ...session,
        transcript: session.transcript.slice(0, -1),
      });
    } finally {
      setLoading(false);
    }
  };

  const completeInterview = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      const data = await response.json();
      setAnalysis(data.analysis);
      setSession(data.session);
    } catch (error) {
      console.error('Error completing interview:', error);
      alert('Failed to complete interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startNewInterview = () => {
    setSession(null);
    setAnalysis(null);
    setTopic('');
    setMessage('');
  };

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Interview Bot Clone</h1>
        <p style={styles.subtitle}>
          AI-powered interviews with dynamic probing and analysis
        </p>

        {!session ? (
          <div style={styles.startSection}>
            <div style={styles.inputGroup}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && startInterview()}
                placeholder="Enter interview topic (e.g., 'AI in healthcare', 'Remote work challenges')"
                style={styles.topicInput}
                disabled={loading}
              />
              <button
                onClick={startInterview}
                disabled={loading || !topic.trim()}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  opacity: loading || !topic.trim() ? 0.6 : 1,
                }}
              >
                {loading ? 'Starting...' : 'Start Interview'}
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.chatSection}>
            <div style={styles.chatHeader}>
              <div>
                <h2 style={styles.chatTitle}>Topic: {session.topic}</h2>
                <p style={styles.chatStatus}>
                  Status: {session.status} •{' '}
                  {session.cost && (
                    <>
                      ${session.cost.cost.toFixed(4)} • {session.cost.tokens} tokens
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={startNewInterview}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                New Interview
              </button>
            </div>

            <div style={styles.messagesContainer}>
              {session.transcript.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.message,
                    ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                  }}
                >
                  <div style={styles.messageRole}>
                    {msg.role === 'user' ? 'You' : 'Interviewer'}
                  </div>
                  <div style={styles.messageContent}>{msg.content}</div>
                </div>
              ))}
              {loading && (
                <div style={{ ...styles.message, ...styles.assistantMessage }}>
                  <div style={styles.messageRole}>Interviewer</div>
                  <div style={styles.messageContent}>Thinking...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {session.status === 'interviewing' && (
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                  placeholder="Type your response..."
                  style={styles.messageInput}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    opacity: loading || !message.trim() ? 0.6 : 1,
                  }}
                >
                  Send
                </button>
                <button
                  onClick={completeInterview}
                  disabled={loading}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  Complete
                </button>
              </div>
            )}

            {analysis && (
              <div style={styles.analysisSection}>
                <h3 style={styles.analysisTitle}>Interview Analysis</h3>
                <div style={styles.analysisContent}>
                  <div style={styles.analysisItem}>
                    <strong>Summary:</strong>
                    <p>{analysis.summary}</p>
                  </div>
                  <div style={styles.analysisItem}>
                    <strong>Key Insights:</strong>
                    <ul>
                      {analysis.keyInsights?.map((insight: string, idx: number) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={styles.analysisMetrics}>
                    <div style={styles.metric}>
                      <strong>Depth Score:</strong> {analysis.depthScore}/5
                    </div>
                    <div style={styles.metric}>
                      <strong>Completion Rate:</strong>{' '}
                      {(analysis.completionRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div style={styles.analysisItem}>
                      <strong>Recommendations:</strong>
                      <ul>
                        {analysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: '#333',
  },
  subtitle: {
    color: '#666',
    marginBottom: '2rem',
  },
  startSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  topicInput: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  messageInput: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'opacity 0.2s',
  },
  primaryButton: {
    background: '#667eea',
    color: 'white',
  },
  secondaryButton: {
    background: '#f0f0f0',
    color: '#333',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
    height: '70vh',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e0e0e0',
  },
  chatTitle: {
    fontSize: '1.5rem',
    marginBottom: '0.25rem',
    color: '#333',
  },
  chatStatus: {
    color: '#666',
    fontSize: '0.9rem',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    maxWidth: '80%',
  },
  userMessage: {
    background: '#667eea',
    color: 'white',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    background: '#f0f0f0',
    color: '#333',
    alignSelf: 'flex-start',
  },
  messageRole: {
    fontSize: '0.75rem',
    opacity: 0.8,
    marginBottom: '0.25rem',
    fontWeight: '600',
  },
  messageContent: {
    fontSize: '1rem',
    lineHeight: '1.5',
  },
  analysisSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#f9f9f9',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
  },
  analysisTitle: {
    fontSize: '1.25rem',
    marginBottom: '1rem',
    color: '#333',
  },
  analysisContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  analysisItem: {
    marginBottom: '1rem',
  },
  analysisItemStrong: {
    fontWeight: '600',
    marginBottom: '0.5rem',
    display: 'block',
  },
  analysisMetrics: {
    display: 'flex',
    gap: '2rem',
    marginTop: '1rem',
  },
  metric: {
    padding: '0.75rem',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
};

