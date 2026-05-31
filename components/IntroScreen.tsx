'use client';

interface Props {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-stone-50 px-5 py-12">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-8">
        {/* Badge */}
        <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          内在化タイプ診断
        </div>

        {/* Headline */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">
            あなたの<br />
            <span className="text-indigo-600">"生きづらさのかたち"</span>を、<br />
            8つの軸で見てみませんか
          </h1>
          <p className="text-sm text-stone-500 leading-relaxed">
            毒親育ち、HSP、完璧主義——<br />
            そのラベルの奥にある、あなただけのベクトル。
          </p>
        </div>

        {/* Feature list */}
        <div className="w-full space-y-3">
          {[
            { icon: '🔍', text: '8軸のレーダーチャートで可視化' },
            { icon: '✓', text: '10タイプの中から、あなたに一番近いかたちを特定' },
            { icon: '💬', text: '「わかる」が連鎖するあるある共感文' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-stone-700">
              <span className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm text-base flex-shrink-0">
                {icon}
              </span>
              {text}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-4 rounded-2xl text-base transition-colors shadow-md shadow-indigo-200"
        >
          診断をはじめる
        </button>

        {/* Meta info */}
        <p className="text-xs text-stone-400 text-center">
          約3分・40問｜ログイン不要・無料
        </p>
      </div>

      {/* Legal note */}
      <p className="text-xs text-stone-400 text-center max-w-xs mt-6 leading-relaxed">
        ビッグファイブ／認知行動療法（CBT）の考え方をベースにしています。
        医療診断ではありません。
      </p>
    </div>
  );
}
