export default function TokushohoPage() {
  return (
    <main className="min-h-screen bg-[#09070f] text-[#f2eefb]">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <a href="/" className="text-sm text-[#8b84a8] hover:text-[#f2eefb] transition">← トップへ</a>

        <h1 className="mt-6 text-2xl font-bold">特定商取引法に基づく表記</h1>
        <p className="mt-2 text-sm text-[#8b84a8]">最終更新日：2026年3月22日</p>

        <div className="mt-8 rounded-[20px] border border-[#231f36] bg-[#110e1c] overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: "販売事業者", value: "mieux" },
                { label: "運営責任者", value: "伊崎 友陽" },
                { label: "所在地", value: "〒160-0023\n東京都新宿区西新宿3丁目3-13 西新宿水間ビル6階" },
                { label: "メールアドレス", value: "narijo.businessschool@gmail.com" },
                { label: "サービス名", value: "Narijo Business School（略称：NBS）\nAI文章添削ツール（本サービス）" },
                {
                  label: "販売価格",
                  value: "各商品ページに記載（表示価格は税込）\n【無料プラン】無料（3回まで利用可能）\n【NBSプラン】月額9,800円（税込）",
                },
                {
                  label: "商品代金以外の必要料金",
                  value: "・インターネット接続にかかる通信料はお客様のご負担となります。\n・銀行振込の場合、振込手数料はお客様のご負担となります。",
                },
                {
                  label: "お支払い方法",
                  value: "・クレジットカード決済\n・銀行振込\n・その他決済代行サービス（月額パンダ等）",
                },
                {
                  label: "代金の支払い時期",
                  value: "・クレジットカード：各カード会社の引き落とし日に準じます\n・銀行振込：ご注文から7日以内にお振込みください\n・サブスクリプション（定額課金）：毎月自動決済",
                },
                {
                  label: "商品の引き渡し時期",
                  value: "決済完了後、即時または3営業日以内にご利用開始いただけます。",
                },
                {
                  label: "返品・キャンセルについて",
                  value: "本サービスはデジタルコンテンツの提供であり、特定商取引法第15条の3に基づき、クーリングオフの適用対象外となります。\n決済完了後のキャンセル・返金はお受けできません。\nただし、サービス提供に著しい不備がある場合はこの限りではありません。",
                },
                {
                  label: "中途解約について",
                  value: "月額課金サービスは、解約の申し出があった翌月以降の請求より停止いたします。\n日割り精算等による返金は行っておりません。",
                },
                {
                  label: "動作環境",
                  value: "インターネットに接続できるPC、タブレット、またはスマートフォン",
                },
              ].map(({ label, value }) => (
                <tr key={label} className="border-b border-[#231f36] last:border-0">
                  <td className="w-36 shrink-0 px-5 py-4 align-top font-semibold text-[#8b84a8] sm:w-44">
                    {label}
                  </td>
                  <td className="px-5 py-4 text-[#c8c2dc] leading-6 whitespace-pre-line">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
