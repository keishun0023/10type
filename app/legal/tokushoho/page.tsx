import LegalFooter from '@/components/LegalFooter';

export default function TokushohoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-12 space-y-8">
        <h1 className="text-xl font-bold text-stone-900">特定商取引法に基づく表記</h1>

        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              ['販売事業者名', '松浦圭春'],
              ['運営責任者', '松浦圭春'],
              ['所在地', '〒150-0043 東京都渋谷区道玄坂1丁目10番8号 渋谷道玄坂東急ビル2F−C'],
              ['電話番号', '請求があれば遅滞なく開示いたします。'],
              ['メールアドレス', 'customer@kokorift.com'],
              ['サービス名', 'ココリフト'],
              ['販売価格', 'ライトプラン：980円（税込・1ヶ月アクセス）\nスタンダードプラン：3,980円（税込・3ヶ月アクセス）\nプレミアムプラン：8,980円（税込・半年アクセス）'],
              ['商品代金以外の必要料金', '本サービスの利用に必要となるインターネット接続料金、通信料金等はお客様のご負担となります。'],
              ['支払方法', 'クレジットカード決済（Stripe）'],
              ['支払時期', 'お申し込み時（一回のみ）'],
              ['役務の提供時期', 'クレジットカードでの決済完了後、すぐにご利用いただけます。'],
              ['返品・キャンセル・解約に関する規定', '提供するサービスの性質上（デジタルコンテンツおよびオンラインサービス）、決済完了後の返品・キャンセル・返金は原則としてお受けできかねます。あらかじめご了承ください。'],
              ['動作環境', 'スマートフォン：iOS、Androidの標準ブラウザ（最新版）\nPC：Windows、macOSの主要ブラウザ（Google Chrome、Safari、Edgeの最新版）'],
              ['サービスの性質および免責事項', '本サービスは、心理学の考え方を参考にした自己理解およびセルフヘルプのための一般向けコンテンツを提供するものです。医療行為、診断、治療を提供するものではありません。特定の疾患の治癒や症状の改善、およびいかなる確実な効果を保証するものではありません。'],
            ].map(([key, val]) => (
              <tr key={key} className="border-b border-stone-100">
                <td className="py-3 pr-4 text-stone-500 font-medium align-top whitespace-nowrap w-36">{key}</td>
                <td className="py-3 text-stone-700 leading-relaxed whitespace-pre-line">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LegalFooter />
    </div>
  );
}
