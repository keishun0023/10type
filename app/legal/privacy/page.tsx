import LegalFooter from '@/components/LegalFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-12 space-y-6">
        <h1 className="text-xl font-bold text-stone-900">プライバシーポリシー</h1>
        <p className="text-xs text-stone-400">最終更新日：2025年6月</p>

        {[
          {
            title: '取得する情報',
            body: '当サービスでは、メールアドレス、診断の回答データ、決済情報（Stripeが管理）、アクセスログを取得します。',
          },
          {
            title: '利用目的',
            body: '取得した情報は、サービスの提供・改善、メールでの連絡、分析・統計処理（個人を特定しない形）のために利用します。第三者への販売・提供は行いません。',
          },
          {
            title: 'Cookieの使用',
            body: '当サービスはGoogle Analytics、Meta Pixel等のサービスを利用しており、これらはCookieを使用することがあります。ブラウザの設定でCookieを無効にすることができます。',
          },
          {
            title: '第三者サービス',
            body: '決済にStripe、メール送信にResend、データベースにSupabaseを利用しています。各サービスのプライバシーポリシーが適用されます。',
          },
          {
            title: '情報の保管',
            body: '取得した情報はSupabaseのセキュアなサーバーで管理します。不要になった情報は適切に削除します。',
          },
          {
            title: '開示・訂正・削除',
            body: 'ご自身の情報の開示・訂正・削除を希望される場合は、support@kokorift.com までご連絡ください。',
          },
          {
            title: '未成年者',
            body: '18歳未満の方のご利用は、保護者の同意を得た上でお願いします。',
          },
          {
            title: 'お問い合わせ',
            body: 'プライバシーに関するご質問は support@kokorift.com までお問い合わせください。',
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
