const quickActions = [
  {
    title: "新しく添削する",
    description: "掲載予定の文章を入力して、予約導線を強化します。",
    href: "/dashboard/new",
  },
  {
    title: "成果を記録する",
    description: "使った文章の反応を入力して、提案精度を高めます。",
    href: "/dashboard/results",
  },
  {
    title: "マイページを見る",
    description: "診断結果やUSP・STPの整理内容をいつでも見返せます。",
    href: "/mypage",
  },
];

const historyItems = [
  {
    category: "写メ日記",
    score: 82,
    status: "使用済み",
    text: "今日は少し甘えたい気分の人いる？ただ会うだけじゃなくて…",
  },
  {
    category: "オキニトーク",
    score: 76,
    status: "下書き",
    text: "お仕事おつかれさま。最近ちゃんと癒される時間とれてる？",
  },
  {
    category: "SNS",
    score: 68,
    status: "未使用",
    text: "なんとなく満たされない日ってない？そんな日に思い出してほしい…",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#a3476b]">ダッシュボード</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              今日の文章を整えましょう
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#66616d]">
              添削、履歴確認、成果入力、診断結果の確認をここから行えます。
            </p>
          </div>

          <a
            href="/dashboard/new"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
          >
            新しく添削する
          </a>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">今月の添削回数</p>
            <p className="mt-3 text-3xl font-bold">12</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">使用回数</p>
            <p className="mt-3 text-3xl font-bold">8</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">成果入力件数</p>
            <p className="mt-3 text-3xl font-bold">5</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">平均評価点</p>
            <p className="mt-3 text-3xl font-bold">75</p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {quickActions.map((action) => (
            <a
              key={action.title}
              href={action.href}
              className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-xl font-bold">{action.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#66616d]">
                {action.description}
              </p>
            </a>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">最近の添削履歴</h2>
              <a
                href="#"
                className="text-sm font-medium text-[#7a2e4d] hover:opacity-80"
              >
                すべて見る
              </a>
            </div>

            <div className="space-y-4">
              {historyItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-[#ece7ef] bg-[#fcfbfd] p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#f4e2ea] px-3 py-1 text-xs font-semibold text-[#7a2e4d]">
                      {item.category}
                    </span>
                    <span className="rounded-full bg-[#f1eff4] px-3 py-1 text-xs font-semibold text-[#4d4855]">
                      {item.status}
                    </span>
                    <span className="text-sm font-semibold text-[#2e2a3b]">
                      {item.score}点
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#585460]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="xl:col-span-4 space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">今日の改善ヒント</p>
              <h3 className="mt-3 text-xl font-bold">
                最近は導入で感情ワードを入れた文章の反応が高いです
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#66616d]">
                たとえば「疲れてない？」「少し甘えたい日ない？」のように、
                感情に触れる導入を入れると、共感力とクリック率が上がりやすくなります。
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">おすすめ導線</p>
              <ul className="mt-4 space-y-3 text-sm text-[#5c5763]">
                <li>・まずはマイページで診断結果を確認</li>
                <li>・次に新規添削で文章を作成</li>
                <li>・使ったら成果入力で精度を上げる</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}