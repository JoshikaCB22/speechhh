import { useState, useRef, useEffect } from 'react';
import api from '../api';
import { useRefresh } from '../RefreshContext';
import { startRecording } from '../hooks/useAudioRecorder';
import './Practice.css';

const WORD_LISTS = {
  beginner: ['cat', 'dog', 'sun', 'run', 'hat', 'big', 'red', 'cup', 'map', 'sit'],
  intermediate: ['butter', 'purple', 'simple', 'garden', 'window', 'bottle', 'little', 'people', 'mother', 'father'],
  advanced: ['pronunciation', 'articulation', 'communication', 'vocabulary', 'therapeutic', 'specifically', 'particularly', 'approximately'],
  sentences: ['The cat sat on the mat', 'She sells seashells', 'How much wood would a woodchuck chuck', 'Red lorry yellow lorry'],
};

function ScoreCircle({ score }) {
  const r = 54, c = 2 * Math.PI * r;
  const color = score >= 80 ? '#43e97b' : score >= 60 ? '#f7971e' : '#ff6584';
  const offset = c - (score / 100) * c;
  return (
    <div className="score-circle">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--bg3)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="score-center">
        <span className="score-num" style={{ color }}>{score}</span>
        <span className="score-pct">%</span>
      </div>
    </div>
  );
}

export default function Practice() {
  const { refresh } = useRefresh();
  const [level, setLevel] = useState('beginner');
  const [word, setWord] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [newAchievements, setNewAchievements] = useState([]);
  const [browserTranscript, setBrowserTranscript] = useState('');

  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const timerValRef = useRef(0);
  const speechRecRef = useRef(null);

  useEffect(() => { pickRandom(); }, [level]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const pickRandom = () => {
    const list = WORD_LISTS[level];
    setWord(list[Math.floor(Math.random() * list.length)]);
    setResult(null); setAudioBlob(null); setAudioUrl(null);
    setError(''); setBrowserTranscript('');
  };

  // Start Web Speech API recognition alongside recording
  const startBrowserSpeech = (target) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim = t;
      }
      setBrowserTranscript((finalText + interim).trim());
    };
    rec.onerror = () => {};
    rec.start();
    speechRecRef.current = { rec, getFinal: () => finalText.trim() };
  };

  const stopBrowserSpeech = () => {
    if (speechRecRef.current) {
      try { speechRecRef.current.rec.stop(); } catch {}
      const t = speechRecRef.current.getFinal();
      speechRecRef.current = null;
      return t;
    }
    return '';
  };

  const startRec = async () => {
    setError(''); setResult(null); setAudioBlob(null);
    setAudioUrl(null); setBrowserTranscript('');
    try {
      const recorder = await startRecording();
      recorderRef.current = recorder;
      setRecording(true);
      setTimer(0); timerValRef.current = 0;
      timerRef.current = setInterval(() => {
        timerValRef.current += 1;
        setTimer(t => t + 1);
      }, 1000);
      startBrowserSpeech(useCustom ? customWord : word);
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone in browser settings.'
        : `Microphone error: ${err.message}`);
    }
  };

  const stopRec = async () => {
    clearInterval(timerRef.current);
    setRecording(false);
    const finalTranscript = stopBrowserSpeech();
    if (finalTranscript) setBrowserTranscript(finalTranscript);
    if (!recorderRef.current) return;
    const blob = await recorderRef.current.stop();
    recorderRef.current = null;
    console.log(`WAV: ${blob.size} bytes, transcript="${finalTranscript}"`);
    setAudioBlob(blob);
    setAudioUrl(URL.createObjectURL(blob));
  };

  const analyze = async () => {
    if (!audioBlob) return;
    const target = useCustom ? customWord.trim() : word;
    if (!target) { setError('Please enter a word to practice.'); return; }

    setAnalyzing(true); setError('');

    const form = new FormData();
    form.append('audio', audioBlob, 'recording.wav');
    form.append('word', target);
    form.append('level', level);
    // Send browser transcript as hint — backend uses it if Whisper fails
    if (browserTranscript) form.append('transcript_hint', browserTranscript);

    try {
      const { data } = await api.post('/api/practice/analyze', form);
      setResult(data);
      refresh();
      if (data.new_achievements?.length) setNewAchievements(data.new_achievements);
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      setError(detail || 'Analysis failed. Please try again.');
    } finally { setAnalyzing(false); }
  };

  const targetWord = useCustom ? customWord : word;

  return (
    <div className="practice-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🎙️ Practice</h1>
          <p className="page-sub">Record yourself and get instant AI feedback</p>
        </div>
      </div>

      {newAchievements.length > 0 && (
        <div className="achievement-toast">
          🏆 New Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked: {newAchievements.join(', ')}
          <button onClick={() => setNewAchievements([])}>✕</button>
        </div>
      )}

      <div className="practice-grid">
        <div className="practice-left">
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Select Level</h3>
            <div className="level-tabs">
              {Object.keys(WORD_LISTS).map(l => (
                <button key={l} className={`level-tab ${level === l ? 'active' : ''}`}
                  onClick={() => { setLevel(l); setUseCustom(false); }}>
                  {l}
                </button>
              ))}
            </div>
            <div className="word-section">
              <div className="word-toggle">
                <button className={`toggle-btn ${!useCustom ? 'active' : ''}`} onClick={() => setUseCustom(false)}>Suggested</button>
                <button className={`toggle-btn ${useCustom ? 'active' : ''}`} onClick={() => setUseCustom(true)}>Custom</button>
              </div>
              {useCustom ? (
                <input type="text" placeholder="Type your word or sentence..."
                  value={customWord} onChange={e => setCustomWord(e.target.value)}
                  style={{ marginTop: 12 }} />
              ) : (
                <div className="word-display">
                  <span className="target-word">{word}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      const u = new SpeechSynthesisUtterance(word);
                      u.lang = 'en-US'; u.rate = 0.85;
                      window.speechSynthesis.speak(u);
                    }}>🔊 Listen</button>
                    <button className="btn btn-secondary btn-sm" onClick={pickRandom}>🔀 New</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card recorder-card">
            <h3 style={{ marginBottom: 20 }}>Record Your Voice</h3>
            <div className="mic-area">
              {recording && (
                <div className="recording-rings">
                  <div className="ring r1" /><div className="ring r2" /><div className="ring r3" />
                </div>
              )}
              <button className={`mic-btn ${recording ? 'recording' : ''}`}
                onClick={recording ? stopRec : startRec}>
                {recording ? '⏹' : '🎙️'}
              </button>
            </div>

            {recording && (
              <div className="recording-status">
                <span className="rec-dot pulse" />
                Recording... {timer}s
                {browserTranscript && (
                  <span style={{ color: 'var(--text2)', fontSize: 12, marginLeft: 8 }}>
                    "{browserTranscript}"
                  </span>
                )}
              </div>
            )}

            {audioUrl && !recording && (
              <div className="audio-preview">
                {browserTranscript && (
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>
                    🗣️ Heard: <strong style={{ color: 'var(--primary)' }}>{browserTranscript}</strong>
                  </div>
                )}
                <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 12 }} />
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={analyze} disabled={analyzing}>
                  {analyzing ? <><span className="spinner" /> Analyzing...</> : '🔍 Analyze Pronunciation'}
                </button>
              </div>
            )}

            {!recording && !audioUrl && (
              <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, marginTop: 12 }}>
                Click the mic to start recording
              </p>
            )}
            {error && <div className="practice-error">{error}</div>}
          </div>
        </div>

        <div className="practice-right">
          {result ? (
            <div className="result-card card fade-in">
              <h3 style={{ marginBottom: 20 }}>Analysis Result</h3>
              <div className="result-top">
                <ScoreCircle score={result.score} />
                <div className="result-meta">
                  <div className="result-word">
                    <span style={{ color: 'var(--text2)', fontSize: 13 }}>Target:</span>
                    <span className="rword">{targetWord}</span>
                  </div>
                  {result.transcribed && (
                    <div className="result-word">
                      <span style={{ color: 'var(--text2)', fontSize: 13 }}>Heard:</span>
                      <span className="rword" style={{ color: 'var(--warning)' }}>{result.transcribed}</span>
                    </div>
                  )}
                  <div className={`score-label ${result.score >= 80 ? 'good' : result.score >= 60 ? 'ok' : 'bad'}`}>
                    {result.score >= 92 ? 'Outstanding!' : result.score >= 80 ? 'Great Job!' : result.score >= 65 ? 'Good Attempt' : result.score >= 40 ? 'Keep Practicing' : 'Needs Work'}
                  </div>
                </div>
              </div>

              <div className="feedback-box">
                <h4>AI Feedback</h4>
                <p>{result.feedback}</p>
              </div>

              {result.phoneme_details?.ref_phonemes?.length > 0 && (
                <div className="phoneme-section">
                  <h4>Phoneme Analysis</h4>
                  <div className="phoneme-row">
                    <span className="ph-label">Target:</span>
                    <div className="phonemes">
                      {result.phoneme_details.ref_phonemes.map((p, i) => (
                        <span key={i} className={`phoneme ${result.phoneme_details.spoken_phonemes?.[i] === p ? 'match' : 'miss'}`}>{p}</span>
                      ))}
                    </div>
                  </div>
                  {result.phoneme_details.spoken_phonemes?.length > 0 && (
                    <div className="phoneme-row">
                      <span className="ph-label">Spoken:</span>
                      <div className="phonemes">
                        {result.phoneme_details.spoken_phonemes.map((p, i) => (
                          <span key={i} className={`phoneme ${result.phoneme_details.ref_phonemes?.[i] === p ? 'match' : 'miss'}`}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.phoneme_details.tips?.length > 0 && (
                    <div className="tips">
                      {result.phoneme_details.tips.map((t, i) => <p key={i} className="tip">💡 {t}</p>)}
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }}
                onClick={() => { setResult(null); setAudioBlob(null); setAudioUrl(null); setBrowserTranscript(''); pickRandom(); }}>
                🔄 Try Another Word
              </button>
            </div>
          ) : (
            <div className="card placeholder-card">
              <div className="placeholder-icon">🎯</div>
              <h3>Ready to analyze</h3>
              <p>Record yourself saying the target word, then click Analyze to get instant AI feedback on your pronunciation.</p>
              <div className="tips-preview">
                <p>💡 Press 🔊 Listen first to hear the correct pronunciation</p>
                <p>💡 Speak clearly at a normal pace</p>
                <p>💡 Record in a quiet environment</p>
                <p>💡 Say the complete word or sentence</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
