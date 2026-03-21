export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4f7] text-[#1f1f23]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        <section className="flex flex-col justify-between px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#d9d3df] bg-white px-4 py-2 text-sm font-medium text-[#7a2e4d] shadow-sm">
              会員制 AI 文章添削ツール
            </div>

            <div className="mt-10 max-w-xl">
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                売れる文章は、
                <br />
                才能ではなく
                <br />
                設計で決まる。
              </h1>

              <p className="mt-6 text-base leading-8 text-[#5b5864] sm:text-lg">
                写メ日記・オキニトーク・SNS投稿を、
                予約・来店・指名に繋がる形へ。
                あなたのキャラ設定、ターゲット、USPに合わせて
                最適な文章提案を行います。
              </p>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e7e2ea]">
                <p className="text-sm text-[#6a6572]">対応カテゴリ</p>
                <p className="mt-2 text-lg font-semibold">写メ日記 / オキニ</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e7e2ea]">
                <p className="text-sm text-[#6a6572]">分析軸</p>
                <p className="mt-2 text-lg font-semibold">共感 / 集客 / 指名</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e7e2ea]">
                <p className="text-sm text-[#6a6572]">利用形式</p>
                <p className="mt-2 text-lg font-semibold">承認制会員のみ</p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-sm text-[#7b7682]">
            予約に繋がる文章設計を、毎日の投稿に。
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_12px_40px_rgba(31,31,35,0.08)] ring-1 ring-[#ebe7ef] sm:p-8">
            <div>
              <p className="text-sm font-medium text-[#a3476b]">ログイン</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                承認済み会員専用ページ
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6b6773]">
                招待または承認された会員のみご利用いただけます。
                ログイン後、文章添削・履歴確認・成果記録が可能です。
              </p>
            </div>

            <form className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#2c2933]"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="example@gmail.com"
                  className="h-12 w-full rounded-2xl border border-[#d9d3df] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#2c2933]"
                >
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 w-full rounded-2xl border border-[#d9d3df] bg-[#fcfbfd] px-4 text-sm outline-none transition focus:border-[#a3476b] focus:ring-2 focus:ring-[#f4e2ea]"
                />
              </div>

              <a
                href="/onboarding"
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#a3476b] text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
              >
                ログインする
              </a>
            </form>

            <div className="mt-6 space-y-3">
              <a
                href="/onboarding"
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                招待を受けた方はこちら
              </a>

              <button
                type="button"
                className="w-full text-center text-sm font-medium text-[#7a2e4d] transition hover:opacity-80"
              >
                パスワードを忘れた場合
              </button>
            </div>

            <div className="mt-8 rounded-2xl bg-[#f8f4f7] p-4">
              <p className="text-sm font-semibold text-[#2e2a3b]">
                このツールでできること
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#66616d]">
                <li>・文章の100点評価</li>
                <li>・予約導線を意識した添削提案</li>
                <li>・履歴保存と成果記録</li>
                <li>・ターゲット別の文章最適化</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}