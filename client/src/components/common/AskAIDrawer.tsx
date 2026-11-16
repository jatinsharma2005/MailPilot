import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.js';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  engine?: string;
  timestamp: string;
}

export const AskAIDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Analyzing conversation records...');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your MailPilot Assistant. Ask me anything about your current emails, client attention items, upcoming meetings, or pending follow-ups.',
      engine: 'MailPilot AI',
      timestamp: 'Just now',
    },
  ]);

  const quickPrompts = [
    'Which emails require client attention?',
    'What meetings are coming up?',
    'Show pending follow-ups',
    'Summarize contracts needing review',
  ];

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    const loadingStages = [
      'Analyzing verified database records...',
      'Reviewing sender contexts and classifications...',
      'Determining response responsibility...',
    ];
    let stageIndex = 0;
    const interval = setInterval(() => {
      stageIndex = (stageIndex + 1) % loadingStages.length;
      setLoadingText(loadingStages[stageIndex]);
    }, 1200);

    try {
      const res = await api.post('/ai/ask', { query: q });
      clearInterval(interval);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.data.data.answer,
          engine: res.data.data.engine,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      clearInterval(interval);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to query email context right now. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Pill */}
      <button
        onClick={() => setIsOpen(true)}
        className="mailpilot-ask-launcher fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest text-white font-medium shadow-elevated hover:bg-forest-hover transition-all duration-200 border border-forest/20 text-sm"
      >
        <Sparkles size={16} />
        <span>Ask MailPilot AI</span>
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/25 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-surface-main h-full shadow-elevated flex flex-col border-l border-border-main animate-slideInRight">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border-main flex items-center justify-between bg-bg-primary">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-forest-soft text-forest flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-text-primary">MailPilot Contextual AI</h3>
                  <p className="text-[11px] text-text-secondary flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-forest" />
                    Verified database context only
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Prompts Bar */}
            <div className="p-3 bg-bg-secondary/40 border-b border-border-main flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-main border border-border-main text-text-secondary hover:text-forest hover:border-forest/40 transition-colors text-[11px]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-forest-soft text-forest flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={13} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-card p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-forest text-white rounded-br-none'
                        : 'bg-bg-primary text-text-primary border border-border-main rounded-bl-none whitespace-pre-wrap'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div
                      className={`mt-1.5 flex items-center justify-between text-[10px] ${
                        msg.sender === 'user' ? 'text-white/70' : 'text-text-secondary'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.engine && <span className="opacity-80 font-mono text-[9px]">{msg.engine}</span>}
                    </div>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 p-3 bg-bg-primary rounded-card border border-border-main text-xs text-text-secondary animate-pulse">
                  <Sparkles size={14} className="text-forest shrink-0 animate-spin" />
                  <span>{loadingText}</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border-main bg-bg-primary">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 bg-surface-main rounded-card border border-border-main px-3 py-2 shadow-subtle focus-within:border-forest transition-colors"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about emails, meetings, or tasks..."
                  className="w-full text-xs bg-transparent outline-none text-text-primary placeholder:text-text-secondary/70"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="p-1.5 rounded-md bg-forest text-white disabled:opacity-30 hover:bg-forest-hover transition-colors"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
