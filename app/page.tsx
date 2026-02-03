'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InterviewSession, Message, EducationRole } from '@/types';

type RoleInfo = {
  id: EducationRole;
  title: string;
  description: string;
  icon: string;
};

const ROLES: RoleInfo[] = [
  { id: 'student', title: 'Student', description: 'Learning with AI', icon: '🎓' },
  { id: 'instructor', title: 'Instructor', description: 'Teaching with AI', icon: '📚' },
  { id: 'researcher', title: 'Researcher', description: 'Researching with AI', icon: '🔬' },
  { id: 'staff', title: 'Staff', description: 'Supporting with AI', icon: '🏫' },
];

const ROLE_DISPLAY: Record<EducationRole, string> = {
  student: 'Student',
  instructor: 'Instructor',
  researcher: 'Researcher',
  staff: 'Staff',
};

// Interview timing constants
const TARGET_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const IDLE_NUDGE_MS = 2 * 60 * 1000; // 2 minutes
const MIN_EXCHANGES_FOR_COMPLETION = 8;

export default function Home() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<EducationRole | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Timing state
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(null);
  const [lastBotMessageTime, setLastBotMessageTime] = useState<number | null>(null);
  const [showWrapUpPrompt, setShowWrapUpPrompt] = useState(false);
  const [showIdleNudge, setShowIdleNudge] = useState(false);
  const [isWrapUpMode, setIsWrapUpMode] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.transcript]);

  // Idle detection - reset timer on new messages or when loading
  useEffect(() => {
    if (!session || session.status !== 'interviewing' || loading) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Set new idle timer
    idleTimerRef.current = setTimeout(() => {
      setShowIdleNudge(true);
    }, IDLE_NUDGE_MS);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [session, loading]);

  // Check if we should trigger wrap-up mode
  const shouldWrapUp = useCallback((): boolean => {
    if (!interviewStartTime || !session) return false;

    const elapsed = Date.now() - interviewStartTime;
    const userMessages = session.transcript.filter(m => m.role === 'user').length;

    // Wrap up if: time >= 10 min OR exchanges >= 8
    return elapsed >= TARGET_DURATION_MS || userMessages >= MIN_EXCHANGES_FOR_COMPLETION;
  }, [interviewStartTime, session]);

  const startInterview = async (role: EducationRole) => {
    setLoading(true);
    setLoadingRole(role);
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      // Defensive check: verify session has required data
      if (data.session && data.session.id && data.session.role) {
        setSession(data.session);
        setInterviewStartTime(Date.now());
        setLastBotMessageTime(Date.now());
      } else {
        console.error('Invalid session returned from start API:', data);
        alert('Failed to start interview. Please try again.');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !session) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setShowIdleNudge(false);

    // Check if we should enter wrap-up mode
    const enterWrapUp = !isWrapUpMode && shouldWrapUp();
    if (enterWrapUp) {
      setIsWrapUpMode(true);
    }

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
          isWrapUp: enterWrapUp,
        }),
      });

      const data = await response.json();

      // Defensive check: only update session if valid data returned
      // This prevents resetting to persona selection if API returns null
      if (data.session && data.session.id && data.session.role) {
        setSession(data.session);
      } else {
        // API returned invalid session - keep current session but add the assistant message
        console.warn('API returned invalid session, preserving current state:', data);
        if (data.message) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.message,
            timestamp: new Date().toISOString(),
          };
          setSession({
            ...session,
            transcript: [...session.transcript, tempUserMessage, assistantMessage],
          });
        }
      }
      setLastBotMessageTime(Date.now());

      // Show wrap-up prompt after bot's closing message
      if (enterWrapUp) {
        setShowWrapUpPrompt(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setSession({
        ...session,
        transcript: session.transcript.slice(0, -1),
      });
      // Reset wrap-up mode if message failed
      if (enterWrapUp) {
        setIsWrapUpMode(false);
      }
    } finally {
      setLoading(false);
      // Focus input after bot responds
      setTimeout(() => inputRef.current?.focus(), 100);
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

      // Defensive check: only update session if valid data returned
      if (data.session && data.session.id && data.session.role) {
        setSession(data.session);
      } else {
        // API returned invalid session - update status locally
        console.warn('API returned invalid session on complete, preserving current state:', data);
        setSession({
          ...session,
          status: 'completed' as const,
        });
      }
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
    setMessage('');
    setInterviewStartTime(null);
    setLastBotMessageTime(null);
    setShowWrapUpPrompt(false);
    setShowIdleNudge(false);
    setIsWrapUpMode(false);
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Karla:wght@400;500;600;700&family=Fira+Code:wght@400;600&display=swap');

        :root {
          --indigo-deep: #1a2332;
          --indigo-soft: #2d3e56;
          --coral: #ff6b6b;
          --coral-soft: #ff8787;
          --pink-soft: #ffe0e9;
          --cream: #fef9f3;
          --sage: #9db4a8;
          --sage-light: #c4d5cc;
          --text-primary: #1a2332;
          --text-secondary: #5a6b7d;
        }

        body {
          background:
            radial-gradient(circle at 20% 80%, rgba(255, 224, 233, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(157, 180, 168, 0.2) 0%, transparent 50%),
            linear-gradient(135deg, #fef9f3 0%, #ffe8e0 50%, #fef9f3 100%);
          font-family: 'Karla', sans-serif;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        body::before {
          content: '';
          position: fixed;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background-image:
            repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(26, 35, 50, 0.02) 60px, rgba(26, 35, 50, 0.02) 61px);
          animation: rotate 120s linear infinite;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .expectations-list li {
          position: relative;
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .expectations-list li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--sage);
          font-weight: 600;
        }

        .expectations-list li:last-child {
          margin-bottom: 0;
        }

        .expectations-list strong {
          color: var(--indigo-deep);
        }
      `}</style>

      <main style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>AI in Education</h1>
            <p style={styles.subtitle}>
              Share your experiences with AI in your educational role
            </p>
            <p style={styles.attribution}>
              Inspired by the{' '}
              <a
                href="https://www.anthropic.com/news/anthropic-interviewer"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.attributionLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = 'var(--coral)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'transparent';
                }}
              >
                Anthropic Claude Interviewer
              </a>
            </p>
          </div>

          {!session ? (
            <div style={styles.startSection}>
              <div style={styles.expectationsBox}>
                <h3 style={styles.expectationsTitle}>What to expect</h3>
                <ul style={styles.expectationsList} className="expectations-list">
                  <li>A conversational interview lasting about <strong>10 minutes</strong></li>
                  <li>Questions tailored to your educational role</li>
                  <li>An AI interviewer that listens and asks thoughtful follow-ups</li>
                  <li>A personalized analysis of your responses at the end</li>
                </ul>
              </div>
              <label style={styles.label}>Select your role to begin</label>
              <div style={styles.roleGrid}>
                {ROLES.map((role, idx) => (
                  <button
                    key={role.id}
                    onClick={() => startInterview(role.id)}
                    disabled={loading}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(26, 35, 50, 0.15)';
                        e.currentTarget.style.borderColor = 'var(--coral)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(26, 35, 50, 0.08)';
                      e.currentTarget.style.borderColor = 'var(--sage-light)';
                    }}
                    style={{
                      ...styles.roleCard,
                      opacity: loading && loadingRole !== role.id ? 0.5 : 1,
                      cursor: loading ? 'wait' : 'pointer',
                      animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + idx * 0.1}s both`,
                    }}
                  >
                    <span style={styles.roleIcon}>{role.icon}</span>
                    <span style={styles.roleTitle}>{role.title}</span>
                    <span style={styles.roleDescription}>
                      {loadingRole === role.id ? 'Starting...' : role.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.chatSection}>
              <div style={styles.chatHeader}>
                <div>
                  <h2 style={styles.chatTitle}>{session.topic} — {ROLE_DISPLAY[session.role]}</h2>
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(157, 180, 168, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 180, 168, 0.3)';
                  }}
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
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (e.target.value.length > 0) {
                        setShowIdleNudge(false);
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--coral)';
                      e.target.style.boxShadow = '0 4px 16px rgba(255, 107, 107, 0.15), 0 0 0 3px rgba(255, 107, 107, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--sage-light)';
                      e.target.style.boxShadow = '0 2px 8px rgba(26, 35, 50, 0.04)';
                    }}
                    placeholder="Share your thoughts..."
                    style={styles.messageInput}
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    onMouseEnter={(e) => {
                      if (!loading && message.trim()) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 107, 0.45), 0 4px 12px rgba(255, 107, 107, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.35), 0 2px 8px rgba(255, 107, 107, 0.2)';
                    }}
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
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = 'var(--indigo-soft)';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.borderColor = 'var(--indigo-soft)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--indigo-soft)';
                      e.currentTarget.style.borderColor = 'var(--indigo-soft)';
                    }}
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

              {/* Idle nudge */}
              {showIdleNudge && session.status === 'interviewing' && !loading && (
                <div style={styles.nudgeBar}>
                  <span>Still there? Take your time—when you&apos;re ready, continue or press Complete to finish.</span>
                  <button 
                    onClick={() => setShowIdleNudge(false)} 
                    style={styles.nudgeDismiss}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Wrap-up prompt */}
              {showWrapUpPrompt && session.status === 'interviewing' && !loading && (
                <div style={styles.wrapUpPrompt}>
                  <span>Ready to complete the interview?</span>
                  <button
                    onClick={completeInterview}
                    style={{ ...styles.button, ...styles.primaryButton, marginLeft: '12px', padding: '8px 16px' }}
                  >
                    Complete Interview
                  </button>
                  <button
                    onClick={() => setShowWrapUpPrompt(false)}
                    style={{ ...styles.button, ...styles.secondaryButton, marginLeft: '8px', padding: '8px 16px' }}
                  >
                    Continue
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
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '4rem 1.5rem',
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '24px',
    padding: '3.5rem',
    boxShadow: '0 30px 90px rgba(26, 35, 50, 0.12), 0 0 0 1px rgba(255, 107, 107, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 107, 107, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    marginBottom: '3.5rem',
    animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
  },
  title: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '4rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: 'var(--indigo-deep)',
    letterSpacing: '-0.03em',
    lineHeight: '1.1',
    textShadow: '0 2px 20px rgba(255, 107, 107, 0.1)',
    position: 'relative',
  },
  subtitle: {
    fontFamily: "'Karla', sans-serif",
    color: 'var(--text-secondary)',
    fontSize: '1.25rem',
    fontWeight: '400',
    letterSpacing: '0.03em',
    lineHeight: '1.6',
  },
  attribution: {
    fontFamily: "'Karla', sans-serif",
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: '400',
    marginTop: '1rem',
    opacity: 0.75,
  },
  attributionLink: {
    color: 'var(--coral)',
    textDecoration: 'none',
    fontWeight: '500',
    borderBottom: '1px solid transparent',
    transition: 'border-color 0.2s ease',
  },
  startSection: {
    animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
  },
  expectationsBox: {
    background: 'linear-gradient(135deg, rgba(157, 180, 168, 0.1) 0%, rgba(196, 213, 204, 0.15) 100%)',
    border: '1px solid var(--sage-light)',
    borderRadius: '16px',
    padding: '1.75rem 2rem',
    marginBottom: '2.5rem',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  expectationsTitle: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--indigo-deep)',
    marginBottom: '1rem',
    marginTop: 0,
  },
  expectationsList: {
    fontFamily: "'Karla', sans-serif",
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.7',
    margin: 0,
    paddingLeft: '1.25rem',
    listStyleType: 'none',
  },
  label: {
    display: 'block',
    fontFamily: "'Karla', sans-serif",
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    marginBottom: '1.5rem',
    fontWeight: '600',
    letterSpacing: '0.01em',
    textAlign: 'center',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
    maxWidth: '600px',
    margin: '0 auto',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1.5rem',
    background: 'white',
    border: '2px solid var(--sage-light)',
    borderRadius: '18px',
    boxShadow: '0 4px 16px rgba(26, 35, 50, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    outline: 'none',
  },
  roleIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem',
  },
  roleTitle: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '1.375rem',
    fontWeight: 'bold',
    color: 'var(--indigo-deep)',
    marginBottom: '0.375rem',
  },
  roleDescription: {
    fontFamily: "'Karla', sans-serif",
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  inputGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  messageInput: {
    flex: 1,
    padding: '1.125rem 1.5rem',
    border: '2px solid var(--sage-light)',
    borderRadius: '14px',
    fontSize: '1.0625rem',
    fontFamily: "'Karla', sans-serif",
    outline: 'none',
    background: 'white',
    color: 'var(--text-primary)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(26, 35, 50, 0.04)',
  },
  button: {
    padding: '1.125rem 2.25rem',
    borderRadius: '14px',
    border: 'none',
    fontSize: '1rem',
    fontFamily: "'Karla', sans-serif",
    fontWeight: '700',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: '0.03em',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, var(--coral) 0%, var(--coral-soft) 100%)',
    color: 'white',
    boxShadow: '0 6px 20px rgba(255, 107, 107, 0.35), 0 2px 8px rgba(255, 107, 107, 0.2)',
  },
  secondaryButton: {
    background: 'var(--sage)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(157, 180, 168, 0.3)',
  },
  tertiaryButton: {
    background: 'transparent',
    border: '2px solid var(--indigo-soft)',
    color: 'var(--indigo-soft)',
    boxShadow: 'none',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '70vh',
    animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2.5rem',
    paddingBottom: '2rem',
    borderBottom: '2px solid var(--pink-soft)',
    position: 'relative',
  },
  chatTitle: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '2.25rem',
    marginBottom: '0.75rem',
    color: 'var(--indigo-deep)',
    fontWeight: 'bold',
    letterSpacing: '-0.02em',
  },
  chatStatus: {
    fontFamily: "'Karla', sans-serif",
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  statusBadge: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.8rem',
    padding: '0.375rem 0.875rem',
    background: 'linear-gradient(135deg, var(--coral) 0%, var(--coral-soft) 100%)',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '600',
    textTransform: 'lowercase',
    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)',
  },
  statusDivider: {
    opacity: 0.3,
  },
  monospace: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.875rem',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  message: {
    padding: '1.5rem 1.75rem',
    borderRadius: '18px',
    maxWidth: '75%',
    boxShadow: '0 4px 16px rgba(26, 35, 50, 0.08)',
    position: 'relative',
  },
  userMessage: {
    background: 'linear-gradient(135deg, var(--indigo-deep) 0%, var(--indigo-soft) 100%)',
    color: 'white',
    alignSelf: 'flex-end',
    borderBottomRightRadius: '6px',
    boxShadow: '0 6px 20px rgba(26, 35, 50, 0.15)',
  },
  assistantMessage: {
    background: 'white',
    color: 'var(--text-primary)',
    alignSelf: 'flex-start',
    border: '2px solid var(--pink-soft)',
    borderBottomLeftRadius: '6px',
    boxShadow: '0 4px 16px rgba(26, 35, 50, 0.06)',
  },
  messageRole: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.75rem',
    opacity: 0.6,
    marginBottom: '0.625rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  messageContent: {
    fontFamily: "'Karla', sans-serif",
    fontSize: '1.0625rem',
    lineHeight: '1.7',
    letterSpacing: '0.01em',
  },
  analysisSection: {
    marginTop: '3rem',
    padding: '2.5rem',
    background: 'linear-gradient(145deg, rgba(255, 224, 233, 0.3) 0%, rgba(255, 255, 255, 0.9) 100%)',
    borderRadius: '20px',
    border: '2px solid var(--pink-soft)',
    boxShadow: '0 10px 40px rgba(255, 107, 107, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  analysisTitle: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '2rem',
    marginBottom: '2rem',
    color: 'var(--indigo-deep)',
    fontWeight: 'bold',
    letterSpacing: '-0.02em',
  },
  analysisContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  analysisItem: {
    marginBottom: '0.75rem',
  },
  analysisLabel: {
    fontFamily: "'Karla', sans-serif",
    fontWeight: '700',
    marginBottom: '0.875rem',
    display: 'block',
    color: 'var(--coral)',
    fontSize: '1.15rem',
    letterSpacing: '0.02em',
  },
  analysisParagraph: {
    fontFamily: "'Karla', sans-serif",
    lineHeight: '1.8',
    color: 'var(--text-primary)',
    margin: '0.75rem 0 0 0',
    fontSize: '1.0625rem',
  },
  analysisList: {
    margin: '0.75rem 0 0 0',
    paddingLeft: '1.75rem',
  },
  analysisListItem: {
    fontFamily: "'Karla', sans-serif",
    lineHeight: '1.8',
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
    fontSize: '1.0625rem',
  },
  analysisMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.75rem',
    marginTop: '1.5rem',
  },
  metric: {
    padding: '2rem',
    background: 'white',
    borderRadius: '16px',
    border: '2px solid var(--sage-light)',
    textAlign: 'center',
    boxShadow: '0 6px 20px rgba(26, 35, 50, 0.08)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  metricLabel: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--text-secondary)',
    marginBottom: '0.75rem',
    fontWeight: '600',
  },
  metricValue: {
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '3rem',
    color: 'var(--coral)',
    fontWeight: 'bold',
  },
  metricMax: {
    fontSize: '1.75rem',
    opacity: 0.4,
    marginLeft: '0.25rem',
  },
  nudgeBar: {
    background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
    border: '1px solid #ffd54f',
    borderRadius: '12px',
    padding: '12px 16px',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: '#5d4037',
    animation: 'fadeInUp 0.4s ease-out',
  },
  nudgeDismiss: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#8d6e63',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background 0.2s ease',
  },
  wrapUpPrompt: {
    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    border: '1px solid var(--sage)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.95rem',
    color: 'var(--indigo-deep)',
    fontWeight: '500',
    animation: 'fadeInUp 0.4s ease-out',
  },
};
