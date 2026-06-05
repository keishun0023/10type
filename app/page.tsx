'use client';

import { useRouter } from 'next/navigation';
import LegalFooter from '@/components/LegalFooter';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="flex-1 flex flex-col items-center px-5 pt-6 pb-8">
        <div className="flex flex-col items-center w-full max-w-sm gap-0">

          {/* サービスアイコン */}
          <img src="/intro-service-icon.png" alt="" className="w-10 h-10 object-contain mb-1" />

          {/* ロゴ */}
          <img src="/intro-logo.png" alt="ココリフト" className="h-12 object-contain mb-2" />

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
              onClick={() => router.push('/start?from=lp')}
              className="flex-1 flex items-center gap-3 px-5 py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
            >
              <img src="/intro-btn-heart.png" alt="" className="w-5 h-5 object-contain" />
              <span className="flex-1 text-center">無料で診断する</span>
            </button>
            <img src="/intro-btn-lines.png" alt="" className="w-8 object-contain scale-x-[-1]" />
          </div>

          <p className="text-xs text-stone-400 text-center mb-6">
            ※診断は無料です。詳細レポートとプログラムは有料です。
          </p>

          {/* 特徴3つ */}
          <div className="w-full grid grid-cols-3 gap-3 mb-6">
            {[
              { img: '/intro-feature-1.png', label: '8タイプ\n診断' },
              { img: '/intro-feature-2.png', label: '恐れの\n可視化' },
              { img: '/intro-feature-3.png', label: '30日\nプログラム' },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 bg-white rounded-2xl p-3 border border-stone-100">
                <img src={f.img} alt="" className="w-8 h-8 object-contain" />
                <p className="text-xs text-stone-600 font-medium text-center whitespace-pre-line leading-tight">{f.label}</p>
              </div>
            ))}
          </div>

          {/* サービス説明 */}
          <div className="w-full bg-white rounded-2xl p-4 border border-stone-100 space-y-2 mb-4">
            <p className="text-xs font-bold text-stone-700">ココリフトとは</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              CBT（認知行動療法）とビッグファイブの考え方をベースに、あなたの「生きづらさのかたち」を8タイプで分析するセルフケアサービスです。診断は無料。詳細レポートと30日間の改善プログラムは有料でご提供しています。
            </p>
          </div>

          <p className="text-xs text-stone-400 text-center leading-relaxed">
            ※医療診断ではありません。効果を保証するものではありません。
          </p>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
