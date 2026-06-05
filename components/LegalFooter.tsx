import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer className="w-full border-t border-stone-100 bg-white py-6 px-5 mt-auto">
      <div className="max-w-sm mx-auto space-y-3">
        <p className="text-xs text-stone-400 text-center">
          ※診断は無料です。詳細レポートとプログラムは有料です。
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/legal/tokushoho" className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600">
            特定商取引法に基づく表記
          </Link>
          <Link href="/legal/terms" className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600">
            利用規約
          </Link>
          <Link href="/legal/privacy" className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600">
            プライバシーポリシー
          </Link>
        </div>
        <p className="text-xs text-stone-300 text-center">© 2025 ココリフト</p>
      </div>
    </footer>
  );
}
