export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <a href="/" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← トップへ</a>

        <h1 className="mt-6 text-2xl font-bold">利用規約</h1>
        <p className="mt-2 text-sm text-[#8b84a8]">最終更新日：2026年3月22日</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-[#c8c2dc]">

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第1条（適用）</h2>
            <p>本利用規約（以下「本規約」）は、NBS（Narijo Business School）が提供するAI文章添削ツール「yorushoku-tool」（以下「本サービス」）の利用条件を定めるものです。登録ユーザーの皆様には、本規約に従って本サービスをご利用いただきます。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第2条（利用資格）</h2>
            <p>本サービスは<strong className="text-[#f2eefb]">18歳以上</strong>の方を対象としています。18歳未満の方は本サービスをご利用いただけません。登録することで、18歳以上であることに同意したものとみなします。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第3条（利用登録）</h2>
            <p>登録希望者が所定の方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。当社は、以下の場合に利用登録を拒否することがあります。</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>18歳未満である場合</li>
              <li>虚偽の情報を申請した場合</li>
              <li>過去に本規約に違反したことがある場合</li>
              <li>その他当社が不適当と判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第4条（料金・支払い）</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-[#f2eefb]">無料プラン：</strong>新規登録後、月10回まで無料でご利用いただけます。</li>
              <li><strong className="text-[#f2eefb]">有料プラン（NBS）：</strong>月額9,800円（税込）。無制限でご利用いただけます。</li>
              <li>有料プランの料金は、月額パンダ（getsugaku-panda.jp）を通じてお支払いください。</li>
              <li>支払いが完了した旨を管理者にご連絡いただいた後、プランを手動でアップグレードいたします。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第5条（解約・返金）</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>解約を希望される場合は、月額パンダの管理画面より手続きを行ってください。</li>
              <li>月の途中での解約による日割り返金は行いません。</li>
              <li>既に提供済みのサービスに対する返金は原則として対応いたしません。ただし、サービスに重大な不具合があった場合はこの限りではありません。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第6条（禁止事項）</h2>
            <p>ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>当社または第三者の知的財産権を侵害する行為</li>
              <li>本サービスのシステムに不正アクセスする行為</li>
              <li>本サービスを商業目的で無断転用・再販売する行為</li>
              <li>反社会的勢力等への利益供与</li>
              <li>その他当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第7条（AIの利用について）</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>本サービスはOpenAI社のAPIを使用しています。ユーザーが入力した文章はOpenAI社のサーバーに送信されます。</li>
              <li>AI生成の結果はあくまで参考情報であり、当社はその正確性・完全性を保証しません。</li>
              <li>入力した文章にOpenAI利用規約で禁止されているコンテンツを含めないでください。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第8条（免責事項）</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>当社は、本サービスによって生じた損害について、一切の責任を負いません。</li>
              <li>本サービスは「現状有姿」で提供されます。サービスの中断・終了・変更について事前に通知する場合がありますが、保証はいたしません。</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第9条（サービスの変更・終了）</h2>
            <p>当社は、ユーザーへの事前告知をもって、本サービスの内容を変更または終了できるものとします。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">第10条（準拠法・管轄）</h2>
            <p>本規約の解釈には日本法が適用されます。本サービスに関して紛争が生じた場合は、当社所在地を管轄する裁判所を専属合意管轄とします。</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-[#f2eefb]">お問い合わせ</h2>
            <p>本規約に関するお問い合わせは、<a href="https://www.narijo.net/" target="_blank" rel="noopener noreferrer" className="text-[#e85d8a] hover:underline">narijo.net</a> のお問い合わせフォームよりご連絡ください。</p>
          </section>
        </div>
      </div>
    </main>
  );
}
