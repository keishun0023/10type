import LegalFooter from '@/components/LegalFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-12 space-y-6">
        <h1 className="text-xl font-bold text-stone-900">利用規約</h1>
        <p className="text-xs text-stone-400">最終更新日：2025年6月</p>

        {[
          {
            title: '第1条（適用）',
            body: '本規約は、ココリフト（以下「当サービス」）が提供するサービスの利用条件を定めるものです。ユーザーは本規約に同意の上、サービスをご利用ください。',
          },
          {
            title: '第2条（サービスの内容）',
            body: '当サービスは、CBT（認知行動療法）の考え方をベースにした自己分析・自己改善支援ツールを提供します。本サービスは医療診断・医療行為ではなく、効果を保証するものではありません。',
          },
          {
            title: '第3条（料金）',
            body: 'ライトプランは1,980円（税込）、スタンダードプランは2,980円（税込）の買い切りです。料金はStripeを通じてクレジットカードで決済します。',
          },
          {
            title: '第4条（返品・キャンセル）',
            body: 'デジタルコンテンツの性質上、購入完了後の返品・キャンセルはお受けできません。ただし、サービスに重大な瑕疵がある場合は個別に対応します。',
          },
          {
            title: '第5条（禁止事項）',
            body: '当サービスのコンテンツの無断転載・複製、当サービスの運営を妨げる行為、その他法令に違反する行為を禁止します。',
          },
          {
            title: '第6条（免責事項）',
            body: '当サービスの利用によって生じた損害について、当サービスは一切の責任を負いません。本サービスは医療ではないため、精神的な健康に関する重大な問題がある場合は専門の医療機関へご相談ください。',
          },
          {
            title: '第7条（規約の変更）',
            body: '当サービスは必要に応じて本規約を変更することがあります。変更後の規約はサイト上に掲示した時点で効力を生じます。',
          },
          {
            title: '第8条（お問い合わせ）',
            body: 'ご不明な点はsupport@kokorift.com までお問い合わせください。',
          },
        ].map(({ title, body }) => (
          <div key={title} className="space-y-2">
            <h2 className="text-sm font-bold text-stone-800">{title}</h2>
            <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <LegalFooter />
    </div>
  );
}
