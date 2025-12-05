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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {
          --burgundy: #8B1E3F;
          --dark-burgundy: #5C0F29;
          --amber: #D4A574;
          --cream: #FCF8F3;
          --charcoal: #2B2D42;
          --soft-white: #F5F1E8;
          --shadow: rgba(139, 30, 63, 0.15);
        }

        body {
          background: linear-gradient(135deg, var(--soft-white) 0%, #E8DCC8 100%);
          font-family: 'IBM Plex Sans', sans-serif;
          margin: 0;
          padding: 0;
          min-height: 100vh;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <main style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>Interview Room</h1>
            <p style={styles.subtitle}>
              Conversational depth through AI-guided dialogue
            </p>
          </div>

          {!session ? (
            <div style={styles.startSection}>
              <label style={styles.label}>What shall we discuss today?</label>
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && startInterview()}
                  placeholder="e.g., AI in healthcare, Remote work challenges, Climate solutions"
                  style={styles.topicInput}
                  disabled={loading}
                />
                <button
                  onClick={startInterview}
                  disabled={loading || !topic.trim()}
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    opacity: loading || !topic.trim() ? 0.5 : 1,
                    cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Preparing...' : 'Begin Interview'}
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.chatSection}>
              <div style={styles.chatHeader}>
                <div>
                  <h2 style={styles.chatTitle}>{session.topic}</h2>
                  <p style={styles.chatStatus}>
                    <span style={styles.statusBadge}>{session.status}</span>
                    {session.cost && (
                      <>
                        <span style={styles.statusDivider}>•</span>
                        <span style={styles.monospace}>
                          ${session.cost.cost.toFixed(4)} • {session.cost.tokens} tokens
                        </span>
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
                      animation: `${msg.role === 'user' ? 'slideInRight' : 'slideInLeft'} 0.4s ease-out`,
                      animationDelay: `${idx * 0.05}s`,
                      animationFillMode: 'both',
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
                    <div style={{ ...styles.messageContent, animation: 'pulse 1.5s ease-in-out infinite' }}>
                      Thinking...
                    </div>
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
                    placeholder="Share your thoughts..."
                    style={styles.messageInput}
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton,
                      opacity: loading || !message.trim() ? 0.5 : 1,
                      cursor: loading || !message.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Send
                  </button>
                  <button
                    onClick={completeInterview}
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...styles.tertiaryButton,
                      opacity: loading ? 0.5 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Complete
                  </button>
                </div>
              )}

              {analysis && (
                <div style={{
                  ...styles.analysisSection,
                  animation: 'fadeInUp 0.6s ease-out',
                }}>
                  <h3 style={styles.analysisTitle}>Interview Analysis</h3>
                  <div style={styles.analysisContent}>
                    <div style={styles.analysisItem}>
                      <strong style={styles.analysisLabel}>Summary</strong>
                      <p style={styles.analysisParagraph}>{analysis.summary}</p>
                    </div>
                    <div style={styles.analysisItem}>
                      <strong style={styles.analysisLabel}>Key Insights</strong>
                      <ul style={styles.analysisList}>
                        {analysis.keyInsights?.map((insight: string, idx: number) => (
                          <li key={idx} style={styles.analysisListItem}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={styles.analysisMetrics}>
                      <div style={styles.metric}>
                        <div style={styles.metricLabel}>Depth Score</div>
                        <div style={styles.metricValue}>{analysis.depthScore}<span style={styles.metricMax}>/5</span></div>
                      </div>
                      <div style={styles.metric}>
                        <div style={styles.metricLabel}>Completion Rate</div>
                        <div style={styles.metricValue}>
                          {(analysis.completionRate * 100).toFixed(0)}<span style={styles.metricMax}>%</span>
                        </div>
                      </div>
                    </div>
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div style={styles.analysisItem}>
                        <strong style={styles.analysisLabel}>Recommendations</strong>
                        <ul style={styles.analysisList}>
                          {analysis.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} style={styles.analysisListItem}>{rec}</li>
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
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '3rem 1.5rem',
    minHeight: '100vh',
  },
  card: {
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '3rem',
    boxShadow: '0 20px 60px var(--shadow), 0 0 0 1px rgba(139, 30, 63, 0.1)',
    border: '1px solid rgba(139, 30, 63, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem',
    animation: 'fadeInUp 0.6s ease-out',
  },
  title: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '3.5rem',
    fontWeight: 'normal',
    marginBottom: '0.75rem',
    color: 'var(--burgundy)',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
  },
  subtitle: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    color: 'var(--charcoal)',
    fontSize: '1.125rem',
    opacity: 0.7,
    fontWeight: '400',
    letterSpacing: '0.02em',
  },
  startSection: {
    animation: 'fadeInUp 0.6s ease-out 0.2s both',
  },
  label: {
    display: 'block',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '1.125rem',
    color: 'var(--charcoal)',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  topicInput: {
    flex: 1,
    padding: '1rem 1.25rem',
    border: '2px solid var(--amber)',
    borderRadius: '12px',
    fontSize: '1rem',
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: 'none',
    background: 'var(--cream)',
    color: 'var(--charcoal)',
    transition: 'all 0.3s ease',
  },
  messageInput: {
    flex: 1,
    padding: '1rem 1.25rem',
    border: '2px solid var(--amber)',
    borderRadius: '12px',
    fontSize: '1rem',
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: 'none',
    background: 'var(--cream)',
    color: 'var(--charcoal)',
    transition: 'all 0.3s ease',
  },
  button: {
    padding: '1rem 2rem',
    borderRadius: '12px',
    border: 'none',
    fontSize: '1rem',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: '600',
    transition: 'all 0.3s ease',
    letterSpacing: '0.02em',
  },
  primaryButton: {
    background: 'var(--burgundy)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(139, 30, 63, 0.3)',
  },
  secondaryButton: {
    background: 'var(--amber)',
    color: 'var(--dark-burgundy)',
  },
  tertiaryButton: {
    background: 'transparent',
    border: '2px solid var(--burgundy)',
    color: 'var(--burgundy)',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '70vh',
    animation: 'fadeInUp 0.6s ease-out',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '2px solid var(--amber)',
  },
  chatTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '2rem',
    marginBottom: '0.5rem',
    color: 'var(--burgundy)',
    fontWeight: 'normal',
  },
  chatStatus: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    color: 'var(--charcoal)',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: 0.8,
  },
  statusBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
    background: 'var(--amber)',
    color: 'var(--dark-burgundy)',
    borderRadius: '6px',
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  statusDivider: {
    opacity: 0.5,
  },
  monospace: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85rem',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  message: {
    padding: '1.25rem',
    borderRadius: '16px',
    maxWidth: '75%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  userMessage: {
    background: 'var(--burgundy)',
    color: 'white',
    alignSelf: 'flex-end',
    borderBottomRightRadius: '4px',
  },
  assistantMessage: {
    background: 'var(--cream)',
    color: 'var(--charcoal)',
    alignSelf: 'flex-start',
    border: '1px solid var(--amber)',
    borderBottomLeftRadius: '4px',
  },
  messageRole: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    opacity: 0.7,
    marginBottom: '0.5rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  messageContent: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: '1rem',
    lineHeight: '1.6',
  },
  analysisSection: {
    marginTop: '2.5rem',
    padding: '2rem',
    background: 'linear-gradient(135deg, var(--cream) 0%, rgba(212, 165, 116, 0.1) 100%)',
    borderRadius: '16px',
    border: '2px solid var(--amber)',
  },
  analysisTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '1.75rem',
    marginBottom: '1.5rem',
    color: 'var(--burgundy)',
    fontWeight: 'normal',
  },
  analysisContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  analysisItem: {
    marginBottom: '0.5rem',
  },
  analysisLabel: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: '600',
    marginBottom: '0.75rem',
    display: 'block',
    color: 'var(--burgundy)',
    fontSize: '1.1rem',
  },
  analysisParagraph: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    lineHeight: '1.7',
    color: 'var(--charcoal)',
    margin: '0.5rem 0 0 0',
  },
  analysisList: {
    margin: '0.5rem 0 0 0',
    paddingLeft: '1.5rem',
  },
  analysisListItem: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    lineHeight: '1.7',
    color: 'var(--charcoal)',
    marginBottom: '0.5rem',
  },
  analysisMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem',
  },
  metric: {
    padding: '1.5rem',
    background: 'white',
    borderRadius: '12px',
    border: '2px solid var(--amber)',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  metricLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--charcoal)',
    opacity: 0.7,
    marginBottom: '0.5rem',
    fontWeight: '600',
  },
  metricValue: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: '2.5rem',
    color: 'var(--burgundy)',
    fontWeight: 'normal',
  },
  metricMax: {
    fontSize: '1.5rem',
    opacity: 0.5,
    marginLeft: '0.25rem',
  },
};
