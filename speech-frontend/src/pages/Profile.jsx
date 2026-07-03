import { useState } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import './Profile.css';

export default function Profile() {
  const { user, login } = useAuth();

  const [info, setInfo] = useState({ full_name: user?.full_name || '', email: user?.email || '' });
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [infoMsg, setInfoMsg] = useState(null);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const saveInfo = async e => {
    e.preventDefault();
    setInfoMsg(null); setInfoLoading(true);
    try {
      await api.put('/api/auth/profile', { full_name: info.full_name, email: info.email });
      // refresh user in localStorage
      const me = await api.get('/api/auth/me');
      localStorage.setItem('user', JSON.stringify(me.data));
      setInfoMsg({ ok: true, text: 'Profile updated successfully.' });
    } catch (err) {
      const d = err.response?.data;
      setInfoMsg({ ok: false, text: Array.isArray(d?.detail) ? d.detail.map(e => e.msg).join(', ') : d?.detail || 'Update failed.' });
    } finally { setInfoLoading(false); }
  };

  const savePwd = async e => {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.new_password !== pwd.confirm) {
      setPwdMsg({ ok: false, text: 'New passwords do not match.' }); return;
    }
    if (pwd.new_password.length < 6) {
      setPwdMsg({ ok: false, text: 'Password must be at least 6 characters.' }); return;
    }
    setPwdLoading(true);
    try {
      await api.put('/api/auth/password', { current_password: pwd.current_password, new_password: pwd.new_password });
      setPwdMsg({ ok: true, text: 'Password changed successfully.' });
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      const d = err.response?.data;
      setPwdMsg({ ok: false, text: d?.detail || 'Password change failed.' });
    } finally { setPwdLoading(false); }
  };

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Profile</h1>
          <p className="page-sub">Manage your account information</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Avatar card */}
        <div className="card profile-avatar-card">
          <div className="profile-avatar">{user?.full_name?.[0]?.toUpperCase()}</div>
          <div className="profile-name">{user?.full_name}</div>
          <div className="profile-username">@{user?.username}</div>
          <div className="profile-email">{user?.email}</div>
          <div className="profile-since">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </div>
        </div>

        <div className="profile-forms">
          {/* Update info */}
          <div className="card">
            <h3 className="form-section-title">Personal Information</h3>
            {infoMsg && (
              <div className={`profile-msg ${infoMsg.ok ? 'ok' : 'err'}`}>{infoMsg.text}</div>
            )}
            <form onSubmit={saveInfo} className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={info.full_name} required
                  onChange={e => setInfo(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={info.email} required
                  onChange={e => setInfo(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={user?.username || ''} disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                <span className="field-hint">Username cannot be changed</span>
              </div>
              <button type="submit" className="btn btn-primary" disabled={infoLoading}>
                {infoLoading ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card">
            <h3 className="form-section-title">Change Password</h3>
            {pwdMsg && (
              <div className={`profile-msg ${pwdMsg.ok ? 'ok' : 'err'}`}>{pwdMsg.text}</div>
            )}
            <form onSubmit={savePwd} className="profile-form">
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" placeholder="••••••••" required
                  value={pwd.current_password}
                  onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" placeholder="Min 6 characters" required minLength={6}
                  value={pwd.new_password}
                  onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Repeat new password" required
                  value={pwd.confirm}
                  onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwdLoading}>
                {pwdLoading ? <><span className="spinner" /> Updating...</> : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
