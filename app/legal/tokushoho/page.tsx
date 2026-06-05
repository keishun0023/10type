import LegalFooter from '@/components/LegalFooter';

export default function TokushohoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-12 space-y-8">
        <h1 className="text-xl font-bold text-stone-900">特定商取引法に基づく表記</h1>

        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              ['販売事業者名', '（準備中）'],
              ['運営責任者', '（準備中）'],
              ['所在地', '請求があった場合に遅滞なく開示します'],
              ['電話番号', '請求があった場合に遅滞なく開示します'],
              ['メールアドレス', 'support@kokorift.com'],
              ['販売URL', 'https://kokorift.com'],
              ['販売価格', 'ライトプラン：1,980円（税込）/ スタンダードプラン：2,980円（税込）'],
              ['支払方法', 'クレジットカード（Stripe）'],
              ['支払時期', '購入手続き完了時に即時決済'],
              ['商品の引渡し時期', '決済完了後、即時にサービスをご利用いただけます'],
              ['返品・キャンセル', 'デジタルコンテンツの性質上、購入完了後の返品・キャンセルはお受けできません。ただし、サービスに重大な瑕疵がある場合はこの限りではありません。'],
              ['動作環境', 'インターネット接続環境、最新のブラウザ'],
            ].map(([key, val]) => (
              <tr key={key} className="border-b border-stone-100">
                <td className="py-3 pr-4 text-stone-500 font-medium align-top whitespace-nowrap w-36">{key}</td>
                <td className="py-3 text-stone-700 leading-relaxed">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-stone-400 leading-relaxed">
          ※本サービスはCBT（認知行動療法）の考え方をベースにした自己改善ツールです。医療診断ではありません。効果を保証するものではありません。
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
