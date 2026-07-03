import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Auth.css';

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (!data) {
        setError('Cannot connect to server. Make sure the backend is running on port 8000.');
        return;
      }
      // FastAPI 422 validation errors return detail as an array
      if (Array.isArray(data.detail)) {
        setError(data.detail.map(e => e.msg).join(', '));
      } else {
        setError(data.detail || JSON.stringify(data) || 'Registration failed.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
      </div>
      <div className="auth-card fade-in">
        <div className="auth-logo">🗣️</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start your speech therapy journey today</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Jane Doe" required value={form.full_name} onChange={set('full_name')} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="jane@example.com" required value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input type="text" placeholder="jane_doe" required minLength={3} value={form.username} onChange={set('username')} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Min 6 characters" required minLength={6} value={form.password} onChange={set('password')} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%' }} disabled={loading}>
            {loading ? <><span className="spinner" />Creating account...</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
