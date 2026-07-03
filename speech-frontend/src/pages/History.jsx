import { useEffect, useState } from 'react';
import api from '../api';
import { useRefresh } from '../RefreshContext';
import './History.css';

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const { tick } = useRefresh();

  useEffect(() => {
    api.get('/api/sessions?limit=100').then(r => setSessions(r.data)).finally(() => setLoading(false));
  }, [tick]);

  const filtered = sessions.filter(s => {
    const matchWord = s.word.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || s.level === levelFilter;
    return matchWord && matchLevel;
  });

  const scoreColor = s => s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--danger)';
  const scoreBadge = s => s >= 80 ? 'badge-success' : s >= 60 ? 'badge-warning' : 'badge-danger';

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width:40, height:40, borderWidth:3 }} /></div>;

  return (
    <div className="history-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 History</h1>
          <p className="page-sub">{sessions.length} total sessions recorded</p>
        </div>
      </div>

      <div className="history-filters card">
        <input
          type="text" placeholder="🔍 Search by word..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div className="filter-tabs">
          {['all','beginner','intermediate','advanced','sentences'].map(l => (
            <button key={l} className={`level-tab ${levelFilter === l ? 'active' : ''}`}
              onClick={() => setLevelFilter(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <p>No sessions found. {sessions.length === 0 ? 'Start practicing to see your history!' : 'Try a different filter.'}</p>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map(s => {
            const details = s.phoneme_details ? (() => { try { return JSON.parse(s.phoneme_details); } catch { return null; } })() : null;
            const isOpen = expanded === s.id;
            return (
              <div key={s.id} className="history-item card">
                <div className="history-row" onClick={() => setExpanded(isOpen ? null : s.id)}>
                  <div className="history-word">
                    <span className="word-text">{s.word}</span>
                    <span className={`badge badge-${s.level === 'advanced' ? 'danger' : s.level === 'intermediate' ? 'warning' : 'success'}`}>
                      {s.level}
                    </span>
                  </div>
                  <div className="history-score">
                    <span className={`badge ${scoreBadge(s.score)}`} style={{ fontSize:14, padding:'6px 14px' }}>
                      {s.score}%
                    </span>
                  </div>
                  <div className="history-date">
                    {new Date(s.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    <span style={{ color:'var(--text3)', marginLeft:6, fontSize:11 }}>
                      {new Date(s.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <span style={{ color:'var(--text3)', fontSize:12 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div className="history-detail fade-in">
                    <div className="detail-feedback">
                      <h4>Feedback</h4>
                      <p>{s.feedback}</p>
                    </div>
                    {details?.ref_phonemes?.length > 0 && (
                      <div className="detail-phonemes">
                        <h4>Phonemes</h4>
                        <div className="phoneme-row">
                          <span className="ph-label">Target:</span>
                          <div className="phonemes">
                            {details.ref_phonemes.map((p, i) => (
                              <span key={i} className={`phoneme ${details.spoken_phonemes?.[i] === p ? 'match' : 'miss'}`}>{p}</span>
                            ))}
                          </div>
                        </div>
                        {details.spoken_phonemes?.length > 0 && (
                          <div className="phoneme-row">
                            <span className="ph-label">Spoken:</span>
                            <div className="phonemes">
                              {details.spoken_phonemes.map((p, i) => (
                                <span key={i} className={`phoneme ${details.ref_phonemes?.[i] === p ? 'match' : 'miss'}`}>{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {s.duration_seconds > 0 && (
                      <p style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>
                        Duration: {s.duration_seconds.toFixed(1)}s
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
