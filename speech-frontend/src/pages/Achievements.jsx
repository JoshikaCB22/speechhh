import { useEffect, useState } from 'react';
import api from '../api';
import { useRefresh } from '../RefreshContext';
import './Achievements.css';

const CATEGORIES = ['all', 'milestone', 'streak', 'score', 'skill'];

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const { tick } = useRefresh();

  useEffect(() => {
    api.get('/api/achievements').then(r => setData(r.data)).finally(() => setLoading(false));
  }, [tick]);

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width:40, height:40, borderWidth:3 }} /></div>;

  const filtered = (data?.achievements || []).filter(a => cat === 'all' || a.category === cat);
  const earned = (data?.achievements || []).filter(a => a.earned).length;
  const total = (data?.achievements || []).length;
  const levelProgress = data ? (data.total_xp % 200) / 200 * 100 : 0;

  return (
    <div className="achievements-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Achievements</h1>
          <p className="page-sub">{earned} of {total} unlocked</p>
        </div>
        <div className="xp-summary card">
          <div className="xp-level">Level {data?.level ?? 1}</div>
          <div className="xp-amount">{data?.total_xp ?? 0} XP</div>
          <div className="xp-bar-mini">
            <div className="xp-fill-mini" style={{ width:`${levelProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="ach-progress card">
        <div className="ach-prog-bar">
          <div className="ach-prog-fill" style={{ width: `${total ? (earned/total)*100 : 0}%` }} />
        </div>
        <div className="ach-prog-labels">
          <span>{earned} earned</span>
          <span style={{ color:'var(--text3)' }}>{total - earned} remaining</span>
        </div>
      </div>

      <div className="cat-tabs">
        {CATEGORIES.map(c => (
          <button key={c} className={`level-tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="ach-grid">
        {filtered.map(a => (
          <div key={a.id} className={`ach-card card ${a.earned ? 'earned' : 'locked'}`}>
            <div className="ach-icon">{a.icon}</div>
            <div className="ach-body">
              <div className="ach-title">{a.title}</div>
              <div className="ach-desc">{a.description}</div>
              <div className="ach-footer">
                <span className="ach-xp">+{a.xp} XP</span>
                {a.earned ? (
                  <span className="badge badge-success">✓ Earned</span>
                ) : (
                  <div className="ach-prog-mini">
                    <div className="ach-prog-mini-track">
                      <div className="ach-prog-mini-fill" style={{ width:`${a.progress || 0}%` }} />
                    </div>
                    <span className="ach-prog-pct">{a.progress || 0}%</span>
                  </div>
                )}
              </div>
              {a.earned && a.earned_at && (
                <div className="ach-date">
                  {new Date(a.earned_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
