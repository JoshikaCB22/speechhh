import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, Cell
} from 'recharts';
import api from '../api';
import { useRefresh } from '../RefreshContext';
import './Progress.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:13 }}>
        <div style={{ color:'var(--text2)' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontWeight:700 }}>{p.name}: {p.value}{p.name.includes('score') || p.name.includes('accuracy') ? '%' : ''}</div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Progress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { tick } = useRefresh();

  useEffect(() => {
    api.get('/api/progress').then(r => setData(r.data)).finally(() => setLoading(false));
  }, [tick]);

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width:40, height:40, borderWidth:3 }} /></div>;

  const skillData = data?.skill_scores ? Object.entries(data.skill_scores).map(([k, v]) => ({
    subject: k.charAt(0).toUpperCase() + k.slice(1), score: v
  })) : [];

  const summary = data?.summary || {};

  return (
    <div className="progress-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Progress</h1>
          <p className="page-sub">Track your improvement over time</p>
        </div>
      </div>

      <div className="progress-summary">
        {[
          { label: 'Total Sessions', value: summary.total_sessions ?? 0, icon: '🎯' },
          { label: 'Avg Score', value: `${summary.avg_score ?? 0}%`, icon: '📊' },
          { label: 'Best Score', value: `${summary.best_score ?? 0}%`, icon: '⭐' },
          { label: 'Unique Words', value: summary.total_words ?? 0, icon: '📚' },
          { label: 'Current Streak', value: `${summary.streak ?? 0}d`, icon: '🔥' },
        ].map(s => (
          <div key={s.label} className="card progress-stat">
            <span className="ps-icon">{s.icon}</span>
            <span className="ps-value">{s.value}</span>
            <span className="ps-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="progress-charts">
        <div className="card">
          <div className="card-header"><h3>Weekly Accuracy</h3><span className="badge badge-primary">Last 7 days</span></div>
          {data?.weekly?.some(d => d.score > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3}
                  dot={{ fill:'var(--primary)', r:5 }} activeDot={{ r:7 }} name="score" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="no-data">No data yet — start practicing!</div>}
        </div>

        <div className="card">
          <div className="card-header"><h3>Monthly Sessions</h3><span className="badge badge-primary">Last 4 weeks</span></div>
          {data?.monthly?.some(d => d.sessions > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthly} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fill:'var(--text2)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text2)', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sessions" radius={[6,6,0,0]} name="sessions">
                  {(data.monthly || []).map((_, i) => (
                    <Cell key={i} fill={['#6c63ff','#ff6584','#43e97b','#f7971e'][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="no-data">No data yet — start practicing!</div>}
        </div>
      </div>

      <div className="progress-bottom">
        <div className="card">
          <div className="card-header"><h3>Skill Breakdown</h3></div>
          {skillData.some(d => d.score > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={skillData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill:'var(--text2)', fontSize:12 }} />
                <Radar name="Score" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="no-data">Practice different levels to see skill breakdown</div>}
        </div>

        <div className="card">
          <div className="card-header"><h3>Level Accuracy</h3></div>
          <div className="skill-bars">
            {Object.entries(data?.skill_scores || {}).map(([level, score]) => (
              <div key={level} className="skill-bar-item">
                <div className="skill-bar-header">
                  <span className="skill-name">{level}</span>
                  <span className="skill-score" style={{ color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : score > 0 ? 'var(--danger)' : 'var(--text3)' }}>
                    {score > 0 ? `${score}%` : 'No data'}
                  </span>
                </div>
                <div className="skill-track">
                  <div className="skill-fill" style={{
                    width: `${score}%`,
                    background: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
