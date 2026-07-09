import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error } = useAuth();

  // Validate email format (must contain @ and a domain)
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationError('');

    // ---- EMAIL VALIDATION ----
    if (!email.includes('@')) {
      setValidationError('Email must contain an "@" symbol');
      return;
    }
    if (!isValidEmail(email)) {
      setValidationError('Please enter a valid email address (e.g. name@company.com)');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      const redirectPath = location.state?.from?.pathname || '/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      // Error is already surfaced in context.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <div className="brand-mark">S</div>
          <h1>Sentra</h1>
          <p>User & access management console</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="error-banner">{error}</div> : null}
          {validationError ? <div className="error-banner">{validationError}</div> : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (validationError) setValidationError('');
              }}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            className="primary-btn"
            type="submit"
            disabled={loading || !email.includes('@') || !password}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth-footer">
            <span>Demo: any email + password</span>
            <button type="button" className="text-link">Create account</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;