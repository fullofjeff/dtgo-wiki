import { useState, useCallback, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle, signInWithEmail, resetPassword } = useAuth();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  const handleGoogle = useCallback(async () => {
    setMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code !== 'auth/popup-closed-by-user') {
        setMessage({ text: error.message || 'Sign in failed', type: 'error' });
      }
    }
  }, [signInWithGoogle]);

  const handleEmail = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let text = error.message || 'Sign in failed';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        text = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        text = 'Too many failed attempts. Please try again later.';
      }
      setMessage({ text, type: 'error' });
    }
  }, [signInWithEmail, email, password]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      setMessage({ text: 'Please enter your email address first', type: 'error' });
      return;
    }
    try {
      await resetPassword(email);
      setMessage({ text: 'Password reset email sent!', type: 'success' });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage({ text: error.message || 'Failed to send reset email', type: 'error' });
    }
  }, [resetPassword, email]);

  // Already logged in — redirect to home
  if (isAuthenticated) return <Navigate to="/" replace />;

  // Still checking auth state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.orb} />
            <h1 style={styles.title}><span style={styles.name}>DTGO</span> Wiki</h1>
          </div>
          <div style={styles.body}>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.orb} />
          <h1 style={styles.title}><span style={styles.name}>DTGO</span> Wiki</h1>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Google Sign-In */}
          <button onClick={handleGoogle} style={styles.googleBtn}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Email toggle */}
          <button onClick={() => setShowEmail(!showEmail)} style={styles.toggleBtn}>
            <span>Sign in with email</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              style={{ transform: showEmail ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Email form */}
          {showEmail && (
            <form onSubmit={handleEmail} style={{ marginTop: 20 }}>
              <div style={styles.formField}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={styles.input}
                />
              </div>
              <button type="submit" style={styles.primaryBtn}>Sign In</button>
              <button type="button" onClick={handleForgotPassword} style={styles.linkBtn}>
                Forgot password?
              </button>
            </form>
          )}

          {/* Messages */}
          {message && (
            <div style={{
              ...styles.message,
              ...(message.type === 'error' ? styles.messageError :
                  message.type === 'success' ? styles.messageSuccess : styles.messageInfo),
            }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, rgba(235,231,199,0.6))', opacity: 0.7 }}>
            Secure access to the DTGO knowledge base
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    fontFamily: "'EB Garamond', Georgia, serif",
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(20, 20, 20, 0.85)',
    border: '1px solid rgba(235, 231, 199, 0.1)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(235,231,199,0.05) inset',
    overflow: 'hidden',
  },
  header: {
    padding: '32px 32px 24px',
    textAlign: 'center' as const,
    borderBottom: '1px solid rgba(235, 231, 199, 0.1)',
  },
  orb: {
    width: 60,
    height: 60,
    margin: '0 auto 16px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 30%, rgba(216,131,10,0.8), rgba(216,131,10,0.4) 40%, rgba(20,20,20,0.9) 70%)',
    boxShadow: '0 0 30px rgba(216,131,10,0.3), 0 0 60px rgba(216,131,10,0.1), inset 0 0 20px rgba(0,0,0,0.5)',
    animation: 'orb-pulse 4s ease-in-out infinite',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 500,
    letterSpacing: '0.02em',
    color: '#ebe7c7',
  },
  name: {
    fontStyle: 'italic',
    color: '#d8830a',
  },
  body: {
    padding: 32,
  },
  googleBtn: {
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'inherit',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: '#fff',
    color: '#333',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(235, 231, 199, 0.1)',
  },
  dividerText: {
    color: 'rgba(235, 231, 199, 0.6)',
    fontSize: '0.875rem',
  },
  toggleBtn: {
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: '1px solid rgba(235, 231, 199, 0.1)',
    borderRadius: 8,
    color: 'rgba(235, 231, 199, 0.6)',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: '0.875rem',
    color: 'rgba(235, 231, 199, 0.6)',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(235, 231, 199, 0.1)',
    borderRadius: 8,
    color: '#ebe7c7',
    fontFamily: 'inherit',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  primaryBtn: {
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'inherit',
    fontSize: '1rem',
    cursor: 'pointer',
    background: '#d8830a',
    color: '#fff',
    fontWeight: 500,
    marginTop: 16,
    transition: 'all 0.2s ease',
  },
  linkBtn: {
    display: 'block',
    width: '100%',
    marginTop: 12,
    padding: 8,
    background: 'transparent',
    border: 'none',
    color: 'rgba(235, 231, 199, 0.6)',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  message: {
    marginTop: 20,
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: '0.9rem',
    textAlign: 'center' as const,
  },
  messageError: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
  },
  messageSuccess: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
  },
  messageInfo: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
  },
  footer: {
    padding: '16px 32px',
    borderTop: '1px solid rgba(235, 231, 199, 0.1)',
    textAlign: 'center' as const,
  },
};
