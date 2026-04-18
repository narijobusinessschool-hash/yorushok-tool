export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <a href="/" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← トップへ</a>

        <h1 className="mt-6 text-2xl font-bold">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-[#8b84a8]">最終更新日：2026年4月18日</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-[#c8c2dc]">

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">1. 事業者情報</h2>
            <p>mieux（代表：伊崎 友陽）が運営するAI文章添削ツール「Narijo Business School AI文章添削ツール」（以下「本サービス」）における個人情報の取り扱いについて、以下のとおり定めます。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">2. 収集する個人情報</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>メールアドレス（登録・ログイン用）</li>
              <li>パスワード（bcryptによる暗号化ハッシュで保存）</li>
              <li>ご利用状況（添削回数、スコア履歴等）</li>
              <li>入力された文章（添削処理のためのみ使用）</li>
              <li>端末識別ハッシュ値（不正利用防止のため、ブラウザ・端末の特徴から生成されるハッシュ値のみを収集。個人を直接特定する情報は含まれません）</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">3. 個人情報の利用目的</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスの提供・運営・改善</li>
              <li>ご本人への連絡・通知</li>
              <li>利用状況の分析によるサービス向上</li>
              <li>法令に基づく対応</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">4. 第三者への情報提供・委託</h2>
            <p className="mb-3">本サービスでは、以下の外部サービスにデータを送信・委託しています。</p>
            <div className="space-y-3 rounded-[16px] border border-[#231f36] bg-[#110e1c] p-4">
              <div>
                <p className="font-semibold text-[#f2eefb]">OpenAI, Inc.（米国）</p>
                <p className="text-[#8b84a8]">目的：AIによる文章添削処理。ユーザーが入力した文章がOpenAIのAPIに送信されます。</p>
                <p className="text-[#8b84a8]"><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#e85d8a] hover:underline">OpenAI プライバシーポリシー</a></p>
              </div>
              <div>
                <p className="font-semibold text-[#f2eefb]">Supabase, Inc.（米国）</p>
                <p className="text-[#8b84a8]">目的：データベース・認証基盤。会員情報・添削履歴が保存されます。</p>
                <p className="text-[#8b84a8]"><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#e85d8a] hover:underline">Supabase プライバシーポリシー</a></p>
              </div>
              <div>
                <p className="font-semibold text-[#f2eefb]">Vercel, Inc.（米国）</p>
                <p className="text-[#8b84a8]">目的：ウェブアプリケーションのホスティング・配信。</p>
                <p className="text-[#8b84a8]"><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#e85d8a] hover:underline">Vercel プライバシーポリシー</a></p>
              </div>
              <div>
                <p className="font-semibold text-[#f2eefb]">月額パンダ（GMOペイメントゲートウェイ株式会社・日本）</p>
                <p className="text-[#8b84a8]">目的：有料プランの決済処理。決済に必要な情報が送信されます。</p>
              </div>
              <div>
                <p className="font-semibold text-[#f2eefb]">Fingerprint, Inc.（米国）</p>
                <p className="text-[#8b84a8]">目的：不正利用（複数アカウント作成による無料枠の悪用等）の防止。ブラウザ・端末の特徴から生成したハッシュ値のみを取得し、個人を直接特定する情報は送信されません。</p>
                <p className="text-[#8b84a8]"><a href="https://fingerprint.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#e85d8a] hover:underline">Fingerprint プライバシーポリシー</a></p>
              </div>
            </div>
            <p className="mt-3">上記以外の第三者への個人情報提供は、法令に基づく場合を除き行いません。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">5. 個人情報の管理</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>パスワードはbcryptアルゴリズムによりハッシュ化して保存します。平文では保存しません。</li>
              <li>通信はSSL/TLSによって暗号化されます。</li>
              <li>不要になった個人情報は適切に削除します。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">6. 開示・訂正・削除のご請求</h2>
            <p>ご自身の個人情報について、開示・訂正・利用停止・削除を希望される場合は、お問い合わせフォームよりご連絡ください。本人確認を行った上で、合理的な期間内に対応いたします。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">7. Cookieの使用</h2>
            <p>本サービスは、ログイン状態の維持のためにCookie（セッションクッキー）を使用します。ブラウザの設定により無効化できますが、本サービスが正常に機能しなくなる場合があります。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">8. プライバシーポリシーの変更</h2>
            <p>本ポリシーは法令の変更やサービス改善に伴い改定することがあります。重要な変更がある場合は、サービス内でお知らせします。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">お問い合わせ</h2>
            <p>個人情報の取り扱いに関するお問い合わせは、<a href="https://www.narijo.net/" target="_blank" rel="noopener noreferrer" className="text-[#e85d8a] hover:underline">narijo.net</a> のお問い合わせフォームよりご連絡ください。</p>
          </section>
        </div>
      </div>
    </main>
  );
}
