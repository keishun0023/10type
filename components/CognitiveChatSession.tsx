'use client';

import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  missionTitle: string;
  missionWhy: string;
  componentId: string;
  day: number;
  userId: string;
  hints?: string[] | null;
  hintsLoading?: boolean;
  onComplete: (summary: string) => void;
  onSkip: () => void;
};

export default function CognitiveChatSession({
  missionTitle,
  missionWhy,
  hints,
  hintsLoading,
  onComplete,
  onSkip,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const res = await fetch('/api/cognitive-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          missionTitle,
          missionWhy,
          messages: newMessages,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const res = await fetch('/api/cognitive-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          missionTitle,
          messages,
        }),
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (summary !== null) {
    return (
      <div className="space-y-5">
        <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100 space-y-3">
          <p className="text-xs text-purple-500 font-bold">今日の気づき</p>
          <p className="text-sm text-stone-700 leading-relaxed">{summary}</p>
        </div>

        <button
          onClick={() => onComplete(summary)}
          className="w-full py-4 rounded-full font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
        >
          記録して完了
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* ブリッジ説明 */}
      <div className="bg-stone-50 rounded-2xl px-4 py-3 mb-4 border border-stone-100">
        <p className="text-xs text-stone-500 leading-relaxed">✦ AIと一緒に深めましょう。今日、気になった場面があったら思い出してここに話しかけてみてください。AIがいくつか質問しながら一緒に整理して、気づきをまとめます。</p>
      </div>

      {/* 考えるヒント（とっかかり） */}
      {(hintsLoading || (hints && hints.length > 0)) && (
        <div className="bg-amber-50 rounded-2xl px-4 py-3 mb-4 border border-amber-100">
          <p className="text-xs font-bold text-amber-700 mb-2">💡 考えるヒント</p>
          {hintsLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-amber-100 rounded animate-pulse" />
              <div className="h-3 bg-amber-100 rounded animate-pulse w-4/5" />
              <div className="h-3 bg-amber-100 rounded animate-pulse w-3/5" />
            </div>
          ) : (
            <ul className="space-y-1.5">
              {hints!.map((h, i) => (
                <li key={i} className="text-xs text-stone-600 leading-relaxed flex gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">・</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* チャットエリア */}
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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

      {/* まとめるボタン */}
      {userTurns >= 4 && !loading && (
        <div className="mt-2 mb-3">
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="w-full py-3 rounded-full font-bold text-purple-600 text-sm border-2 border-purple-300 bg-purple-50 disabled:opacity-50"
          >
            {summarizing ? 'まとめています...' : '今日の気づきをまとめる'}
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <div className="flex gap-2 items-end mt-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="今日感じたことを書いてみてください..."
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

      {/* 今日は機会がなかったボタン */}
      <div className="flex justify-end mt-3">
        <button
          onClick={onSkip}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          今日は機会がなかった
        </button>
      </div>
    </div>
  );
}
