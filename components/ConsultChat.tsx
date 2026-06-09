'use client';

import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export type ConsultContext = {
  typeName?: string;
  fearSummary?: string;
  userInsight?: string;
  currentFocus?: string;
  recentLogs?: { title: string; memo: string }[];
};

type Props = {
  context: ConsultContext;
  onClose: () => void;
};

export default function ConsultChat({ context, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'うまく応答できませんでした。もう一度試してみてください。' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-lg">
          ✕
        </button>
        <p className="text-sm font-bold text-stone-700">AIに相談する</p>
      </div>

      {/* 本体 */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {messages.length === 0 && (
          <div className="bg-purple-50 rounded-2xl px-4 py-4 mb-4 border border-purple-100">
            <p className="text-sm text-stone-600 leading-relaxed">
              こんにちは。今日はどんなことが気になっていますか？<br />
              うまく言葉にできなくても大丈夫です。思いついたまま、書いてみてください。
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-purple-500 text-white rounded-br-md'
                    : 'bg-white border border-stone-100 text-stone-700 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="flex gap-2 items-end px-4 py-3 border-t border-stone-100">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="気になっていることを書いてみてください..."
          rows={2}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400 resize-none disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
