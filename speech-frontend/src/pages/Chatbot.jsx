import { useState, useRef, useEffect } from 'react';
import api from '../api';
import './Chatbot.css';

const SUGGESTIONS = [
  'How do I improve my R sound?',
  'What exercises help with stuttering?',
  'Tips for clearer pronunciation',
  'How to practice tongue twisters?',
  'What is a phoneme?',
  'How long should I practice daily?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`message ${isUser ? 'user' : 'bot'}`}>
      {!isUser && <div className="bot-avatar">🤖</div>}
      <div className="message-bubble">
        {msg.content.split('\n').map((line, i) => (
          <p key={i} style={{ margin: line.trim() ? '4px 0' : '8px 0' }}>{line}</p>
        ))}
      </div>
      {isUser && <div className="user-avatar">👤</div>}
    </div>
  );
}

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm SpeechCare AI 🗣️\n\nI'm here to help you with pronunciation, speech exercises, phonemes, fluency, and anything related to speech therapy.\n\nWhat would you like to work on today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/api/chat', { message: msg, history: history.slice(0, -1) });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect right now. Please try again." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: "Chat cleared! How can I help you with your speech practice?" }]);
  };

  return (
    <div className="chatbot-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🤖 AI Chatbot</h1>
          <p className="page-sub">Ask anything about speech therapy and pronunciation</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={clearChat}>🗑 Clear Chat</button>
      </div>

      <div className="chat-container card">
        <div className="chat-messages">
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && (
            <div className="message bot">
              <div className="bot-avatar">🤖</div>
              <div className="message-bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && (
          <div className="suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-btn" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask about pronunciation, exercises, phonemes..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            style={{ resize:'none' }}
          />
          <button
            className="send-btn"
            onClick={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading ? <span className="spinner" /> : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}
