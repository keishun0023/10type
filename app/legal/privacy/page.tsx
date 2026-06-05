import LegalFooter from '@/components/LegalFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-12 space-y-6">
        <h1 className="text-xl font-bold text-stone-900">プライバシーポリシー</h1>
        <p className="text-xs text-stone-400">制定日：2026/6/6　最終改定日：2026/6/6</p>
        <p className="text-sm text-stone-600 leading-relaxed">
          松浦圭春（以下「運営者」）は、サービス「ココリフト」（以下「本サービス」）において取得するお客様の個人情報を、以下のとおり適切に取り扱います。
        </p>

        {[
          {
            title: '1. 事業者名・管理責任者・連絡先',
            body: null,
            table: [
              ['事業者名', '松浦圭春'],
              ['個人情報管理責任者', '松浦圭春'],
              ['連絡先メール', 'customer@kokorift.com'],
              ['サービスURL', 'https://kokorift.com/'],
            ],
          },
          {
            title: '2. 取得する個人情報の種類',
            body: '本サービスでは、以下の情報を取得します。\n① 診断の回答・診断結果：性格傾向の診断に関する回答内容、タイプ判定結果、各軸スコア。\n② メールアドレス：アカウント登録・ログイン・本人連絡に使用。\n③ アカウント情報：ユーザー名、パスワード（ハッシュ化して保存）等。\n④ オンボーディング回答：プログラムのパーソナライズに使用する情報。\n⑤ プログラム利用記録：日々のミッションの実施有無・記録内容等。\n⑥ 決済に関する情報：お支払いプラン・決済日等。クレジットカード番号等の決済情報は決済代行サービスStripeが処理し、当社のサーバーには保存しません。\n⑦ アクセス情報：Cookie、UTMパラメータ等のアクセス解析データ、Meta広告経由の流入・行動データ等。',
          },
          {
            title: '3. 利用目的',
            body: '① 本サービスの提供（診断機能・詳細レポート・継続プログラムの表示・配信）。\n② 診断結果・オンボーディング回答に基づくコンテンツのパーソナライズ。\n③ アカウント管理および本人確認。\n④ お問い合わせへの対応・サポート。\n⑤ 決済処理および利用履歴の管理。\n⑥ 本サービスの改善・新機能の開発。\n⑦ Meta広告等を通じた広告効果の測定・最適化。\n⑧ 法令に基づく対応。',
          },
          {
            title: '4. 取得方法',
            body: '① ユーザーによる入力：診断回答、アカウント登録フォーム、オンボーディング回答、プログラム記録等への入力。\n② 自動取得：CookieやMetaピクセル等によるアクセス情報・行動データの自動収集。',
          },
          {
            title: '5. 第三者提供・業務委託',
            body: '運営者は、利用目的の達成に必要な範囲で、以下の外部サービスに個人情報の取扱いを委託または提供します。各サービスは日本国外のサーバーで処理・保存を行う場合があります。',
            table: [
              ['Vercel', 'Webサービスのホスティング'],
              ['Supabase', 'データベース・認証'],
              ['Stripe', '決済処理（カード情報は当社不保持）'],
              ['Meta（Facebook/Instagram）', '広告配信・効果測定（Metaピクセル等）'],
            ],
          },
          {
            title: '6. Cookie・トラッキング・広告計測について',
            body: '本サービスでは、サービス改善および広告効果の測定を目的として、CookieおよびMetaピクセル等のトラッキングツールを使用しています。Cookieの受け入れを拒否したい場合は、ブラウザの設定から無効にすることができます。Metaピクセルによる広告パーソナライズを拒否したい場合は、Metaのプライバシー設定からオプトアウトすることができます。',
          },
          {
            title: '7. 安全管理措置',
            body: '運営者は、取得した個人情報への不正アクセス・紛失・破壊・改ざん・漏洩を防ぐため、適切な安全管理措置を講じます。パスワードはハッシュ化して保存し、クレジットカード情報はStripeが処理します。',
          },
          {
            title: '8. センシティブ情報への配慮',
            body: '診断回答や心理的傾向に関する入力情報は、ユーザー本人の自己理解およびセルフヘルプを目的としてのみ利用します。これらの情報を医療目的・第三者への販売・広告ターゲティング（Meta広告の自動ターゲティング機能を除く）に利用することはありません。',
          },
          {
            title: '9. 個人情報の開示・訂正・削除・利用停止',
            body: 'ユーザーは、自己の個人情報について開示・確認、内容の訂正・追加・削除、利用の停止・消去、第三者への提供の停止を請求できます。請求はメール（customer@kokorift.com）にてお申し込みください。本人確認のうえ、合理的な期間内に対応します。',
          },
          {
            title: '10. 保有期間・退会時の取扱い',
            body: '個人情報は、利用目的の達成に必要な期間、保有します。ユーザーが退会した場合、法令上の保存義務がある情報を除き、アカウント情報および利用記録を合理的な期間内に削除します。統計処理・匿名化された情報は、退会後もサービス改善目的で利用する場合があります。',
          },
          {
            title: '11. 未成年者の利用',
            body: '本サービスは18歳以上を対象としています。18歳未満の方が利用する場合は、保護者の同意のもとで行うものとします。',
          },
          {
            title: '12. プライバシーポリシーの改定',
            body: '運営者は、法令の改正やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更を行う場合は、本サービス上での告知またはメールにてお知らせします。',
          },
          {
            title: '13. お問い合わせ',
            body: '個人情報の取扱いに関するお問い合わせ・請求は下記までご連絡ください。\nメール：customer@kokorift.com\nサービス：https://kokorift.com/',
          },
        ].map(({ title, body, table }) => (
          <div key={title} className="space-y-2">
            <h2 className="text-sm font-bold text-stone-800">{title}</h2>
            {body && (
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{body}</p>
            )}
            {table && (
              <table className="w-full text-sm border-collapse mt-1">
                <tbody>
                  {table.map(([k, v]) => (
                    <tr key={k} className="border-b border-stone-100">
                      <td className="py-2 pr-3 text-stone-500 font-medium align-top whitespace-nowrap">{k}</td>
                      <td className="py-2 text-stone-600">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
      <LegalFooter />
    </div>
  );
}
