import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useRefresh } from '../RefreshContext';
import './Dashboard.css';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? '#43e97b' : score >= 60 ? '#f7971e' : '#ff6584';
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="score-bar-val" style={{ color }}>{score}%</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13 }}>
        <div style={{ color:'var(--text2)' }}>{label}</div>
        <div style={{ color:'var(--primary)', fontWeight:700 }}>{payload[0].value}%</div>
        <div style={{ color:'var(--text3)', fontSize:11 }}>{payload[0].payload.sessions} sessions</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tick } = useRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // First load: show full spinner. Subsequent: silent background refresh
    if (data) setRefreshing(true);
    else setLoading(true);
    api.get('/api/dashboard')
      .then(r => setData(r.data))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [tick]);

  if (loading) return (
    <div className="page-loading"><div className="spinner" style={{ width:40, height:40, borderWidth:3 }} /></div>
  );

  const levelProgress = data ? (data.total_xp % 200) / 200 * 100 : 0;

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">Here's your speech progress overview</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {refreshing && <span style={{ fontSize:12, color:'var(--text3)', display:'flex', alignItems:'center', gap:6 }}><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} />updating...</span>}
          <button className="btn btn-primary" onClick={() => navigate('/practice')}>
            🎙️ Start Practice
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="🎯" label="Total Sessions" value={data?.total_sessions ?? 0} color="#6c63ff" />
        <StatCard icon="📊" label="Avg Accuracy" value={`${data?.avg_score ?? 0}%`} color="#43e97b" />
        <StatCard icon="⭐" label="Best Score" value={`${data?.best_score ?? 0}%`} color="#f7971e" />
        <StatCard icon="🔥" label="Day Streak" value={data?.current_streak ?? 0} sub="days in a row" color="#ff6584" />
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3>Weekly Performance</h3>
            <span className="badge badge-primary">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.weekly_scores || []} barSize={28}>
              <XAxis dataKey="day" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill:'rgba(108,99,255,0.05)' }} />
              <Bar dataKey="score" radius={[6,6,0,0]}>
                {(data?.weekly_scores || []).map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 80 ? '#6c63ff' : entry.score >= 60 ? '#f7971e' : entry.score > 0 ? '#ff6584' : '#2a2a4a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Level & XP</h3>
          </div>
          <div className="level-display">
            <div className="level-badge">
              <span className="level-num">{data?.level ?? 1}</span>
              <span className="level-label">Level</span>
            </div>
            <div className="level-info">
              <div className="xp-row">
                <span>{data?.total_xp ?? 0} XP</span>
                <span style={{ color:'var(--text3)' }}>{200 - (data?.total_xp % 200)} to next</span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${levelProgress}%` }} />
              </div>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>
                Earn XP by completing practice sessions and unlocking achievements
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Sessions</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
        </div>
        {data?.recent_sessions?.length ? (
          <div className="sessions-list">
            {data.recent_sessions.map(s => (
              <div key={s.id} className="session-row">
                <div className="session-word">
                  <span className="word-text">{s.word}</span>
                  <span className={`badge badge-${s.level === 'advanced' ? 'danger' : s.level === 'intermediate' ? 'warning' : 'success'}`}>
                    {s.level}
                  </span>
                </div>
                <ScoreBar score={s.score} />
                <div className="session-date">{new Date(s.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No sessions yet. <button className="link-btn" onClick={() => navigate('/practice')}>Start practicing!</button></p>
          </div>
        )}
      </div>
    </div>
  );
}
