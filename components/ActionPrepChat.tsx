'use client';

import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  missionTitle: string;
  missionWhy: string;
  onCommit: (summary: string, anxiety: number) => void;
  onClose: () => void;
};

export default function ActionPrepChat({ missionTitle, missionWhy, onCommit, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [anxiety, setAnxiety] = useState(3);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter(m => m.role === 'user').length;

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
      const res = await fetch('/api/action-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', missionTitle, missionWhy, messages: newMessages }),
      });
      const data = await res.json();
      if (data.message) setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const res = await fetch('/api/action-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', missionTitle, messages }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
    } catch {
      setSummary('まとめの取得に失敗しました。');
    } finally {
      setSummarizing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // まとめ確認＆挑む画面
  if (summary !== null) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
          <button onClick={() => setSummary(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-lg">←</button>
          <p className="text-sm font-bold text-stone-700">挑む準備</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100 space-y-2">
            <p className="text-xs text-purple-500 font-bold">今日の宣言</p>
            <p className="text-sm text-stone-700 leading-relaxed">{summary}</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-bold text-stone-700">いま、この不安はどれくらい強いですか？</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setAnxiety(n)} className={`flex-1 h-10 rounded-full text-sm font-bold transition-colors ${anxiety >= n ? 'bg-purple-400 text-white' : 'bg-stone-100 text-stone-400'}`}>●</button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-stone-300"><span>小さい</span><span>大きい</span></div>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed text-center">
            この宣言を胸に、今日を過ごしてみましょう。<br />終えたら戻ってきて、実際どうだったかを記録します。
          </p>
        </div>
        <div className="px-4 py-3 border-t border-stone-100">
          <button
            onClick={() => onCommit(summary, anxiety)}
            className="w-full py-4 rounded-full font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            これで挑む！
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-lg">✕</button>
        <p className="text-sm font-bold text-stone-700 truncate">挑む前に、状況を整理</p>
      </div>

      {/* お題（全画面で隠れないよう上部に固定表示） */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
        <p className="text-[11px] text-purple-400 font-medium mb-0.5">今日の一歩</p>
        <p className="text-sm font-bold text-stone-700 leading-snug">{missionTitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {messages.length === 0 && (
          <div className="bg-stone-50 rounded-2xl px-4 py-4 mb-4 border border-stone-100">
            <p className="text-sm text-stone-600 leading-relaxed">
              挑む前に、今日やることと「何が不安か」を一緒に整理しましょう。<br />
              まず、このミッションを<strong>今日どんな場面で試せそうか</strong>、思いついたまま書いてみてください。
            </p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-purple-500 text-white rounded-br-md' : 'bg-white border border-stone-100 text-stone-700 rounded-bl-md'}`}>
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

      {userTurns >= 2 && !loading && (
        <div className="px-4 pb-2">
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="w-full py-3 rounded-full font-bold text-purple-600 text-sm border-2 border-purple-300 bg-purple-50 disabled:opacity-50"
          >
            {summarizing ? 'まとめています...' : 'この内容で挑む準備をする'}
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end px-4 py-3 border-t border-stone-100">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="思いついたまま書いてみてください..."
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
