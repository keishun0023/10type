'use client';

import { fbqEvent, fbqCustomEvent } from '@/lib/pixel';

interface Props {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-5 pt-6 pb-8" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="flex flex-col items-center w-full max-w-sm gap-0">

        {/* サービスアイコン */}
        <img src="/intro-service-icon.png" alt="" className="w-10 h-10 object-contain mb-1" />

        {/* ロゴ */}
        <img src="/intro-logo.png" alt="ここリフト" className="h-12 object-contain mb-2" />

        {/* 区切り線 */}
        <img src="/intro-divider.png" alt="" className="w-12 object-contain mb-3" />

        {/* キャッチコピー */}
        <div className="text-center mb-0 relative z-10">
          <h1 className="text-xl font-bold text-stone-700 leading-relaxed">
            生きづらさの理由がわかる<br />
            そして、少し<span className="text-purple-500 font-bold">軽く</span>なれる
          </h1>
        </div>

        {/* ヒーローイラスト */}
        <img src="/intro-hero.png" alt="" className="w-full max-w-xs object-contain -mt-4 -mb-10" />

        {/* CTAボタン */}
        <div className="w-full flex items-center justify-center gap-2 mb-4">
          <img src="/intro-btn-lines.png" alt="" className="w-8 object-contain" />
          <button
            onClick={() => { fbqCustomEvent('StartTrial'); onStart(); }}
            className="flex-1 flex items-center gap-3 px-5 py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            <span className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <img src="/intro-btn-heart.png" alt="" className="w-5 h-5 object-contain" />
            </span>
            <span className="flex-1 text-center">無料診断を始める</span>
            <span className="text-white/70 text-lg">›</span>
          </button>
          <img src="/intro-btn-lines.png" alt="" className="w-8 object-contain scale-x-[-1]" />
        </div>

        {/* フィーチャー3つ */}
        <div className="w-full grid grid-cols-3 gap-3 mb-5">
          {[
            { img: '/intro-feature-1.png', text: 'しんどさの理由を\n見える化' },
            { img: '/intro-feature-2.png', text: '陥りがちな思考の\nパターンがわかる' },
            { img: '/intro-feature-3.png', text: '今日から試せる\n行動指針' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 text-center">
              <img src={item.img} alt="" className="w-14 h-14 object-contain" />
              <p className="text-xs text-stone-500 leading-snug whitespace-pre-line">{item.text}</p>
            </div>
          ))}
        </div>

        {/* メタ情報 */}
        <p className="text-xs text-stone-400 text-center mb-6">
          約3分・40問・無料
        </p>

        {/* 免責 */}
        <p className="text-xs text-stone-400 text-center leading-relaxed">
          ビッグファイブ／認知行動療法（CBT）の考え方をベースにしています。<br />
          医療診断ではありません。
        </p>
      </div>
    </div>
  );
}
