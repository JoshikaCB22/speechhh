import { useEffect, useState } from 'react';
import api from '../api';
import { useRefresh } from '../RefreshContext';
import './Feedback.css';

function PhonemeCompare({ details }) {
  if (!details?.ref_phonemes?.length) return null;
  const ref = details.ref_phonemes;
  const spoken = details.spoken_phonemes || [];
  const matches = ref.filter((p, i) => spoken[i] === p).length;
  const pct = ref.length ? Math.round((matches / ref.length) * 100) : 0;

  return (
    <div className="phoneme-compare">
      <div className="ph-match-rate">
        <span style={{ color: pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)', fontWeight:700 }}>
          {pct}% phoneme match
        </span>
      </div>
      <div className="phoneme-row">
        <span className="ph-label">Target:</span>
        <div className="phonemes">
          {ref.map((p, i) => (
            <span key={i} className={`phoneme ${spoken[i] === p ? 'match' : 'miss'}`}>{p}</span>
          ))}
        </div>
      </div>
      {spoken.length > 0 && (
        <div className="phoneme-row">
          <span className="ph-label">Spoken:</span>
          <div className="phonemes">
            {spoken.map((p, i) => (
              <span key={i} className={`phoneme ${ref[i] === p ? 'match' : 'miss'}`}>{p}</span>
            ))}
          </div>
        </div>
      )}
      {details.tips?.length > 0 && (
        <div className="ph-tips">
          {details.tips.map((t, i) => <p key={i} className="tip">💡 {t}</p>)}
        </div>
      )}
    </div>
  );
}

export default function Feedback() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { tick } = useRefresh();

  useEffect(() => {
    api.get('/api/feedback/recent?limit=20').then(r => {
      setSessions(r.data);
      if (r.data.length) setSelected(r.data[0]);
    }).finally(() => setLoading(false));
  }, [tick]);

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width:40, height:40, borderWidth:3 }} /></div>;

  const scoreColor = s => s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="feedback-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 AI Feedback</h1>
          <p className="page-sub">Detailed analysis of your recent sessions</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card empty-state">
          <p>No sessions yet. Practice some words to see detailed AI feedback here!</p>
        </div>
      ) : (
        <div className="feedback-layout">
          <div className="feedback-list">
            {sessions.map(s => (
              <div key={s.id}
                className={`feedback-item card ${selected?.id === s.id ? 'active' : ''}`}
                onClick={() => setSelected(s)}
              >
                <div className="fi-top">
                  <span className="fi-word">{s.word}</span>
                  <span className="fi-score" style={{ color: scoreColor(s.score) }}>{s.score}%</span>
                </div>
                <div className="fi-bottom">
                  <span className={`badge badge-${s.level === 'advanced' ? 'danger' : s.level === 'intermediate' ? 'warning' : 'success'}`}>
                    {s.level}
                  </span>
                  <span className="fi-date">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="feedback-detail card fade-in">
              <div className="fd-header">
                <div>
                  <h2 className="fd-word">{selected.word}</h2>
                  <span className={`badge badge-${selected.level === 'advanced' ? 'danger' : selected.level === 'intermediate' ? 'warning' : 'success'}`}>
                    {selected.level}
                  </span>
                </div>
                <div className="fd-score-wrap">
                  <div className="fd-score" style={{ color: scoreColor(selected.score) }}>{selected.score}%</div>
                  <div className="fd-score-label">accuracy</div>
                </div>
              </div>

              <div className="fd-score-bar">
                <div className="fd-score-fill" style={{
                  width: `${selected.score}%`,
                  background: scoreColor(selected.score)
                }} />
              </div>

              <div className="fd-section">
                <h4>AI Feedback</h4>
                <p>{selected.feedback}</p>
              </div>

              {selected.phoneme_details && (
                <div className="fd-section">
                  <h4>Phoneme Analysis</h4>
                  <PhonemeCompare details={selected.phoneme_details} />
                </div>
              )}

              <div className="fd-meta">
                <span>📅 {new Date(selected.created_at).toLocaleString()}</span>
                {selected.duration_seconds > 0 && <span>⏱ {selected.duration_seconds.toFixed(1)}s</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
