"use client";

import { useEffect, useMemo, useState } from "react";

type LearningExample = {
  id: string;
  title: string;
  body: string;
  note: string;
  createdAt: string;
};

type LearningConfig = {
  ngWords: string[];
  influenceRules: string[];
};

const EXAMPLES_KEY = "yorushokuLearningExamples";
const CONFIG_KEY = "yorushokuLearningConfig";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminLearningPage() {
  const [examples, setExamples] = useState<LearningExample[]>([]);
  const [config, setConfig] = useState<LearningConfig>({
    ngWords: [],
    influenceRules: [],
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");

  const [ngWordInput, setNgWordInput] = useState("");
  const [ruleInput, setRuleInput] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rawExamples = localStorage.getItem(EXAMPLES_KEY);
    const rawConfig = localStorage.getItem(CONFIG_KEY);

    if (rawExamples) {
      setExamples(JSON.parse(rawExamples));
    }

    if (rawConfig) {
      setConfig(JSON.parse(rawConfig));
    }
  }, []);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 1800);
  }

  function saveExamples(next: LearningExample[]) {
    setExamples(next);
    localStorage.setItem(EXAMPLES_KEY, JSON.stringify(next));
  }

  function saveConfig(next: LearningConfig) {
    setConfig(next);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  }

  function addExample() {
    if (!title.trim()) {
      showMessage("タイトルを入力してください");
      return;
    }

    if (!body.trim()) {
      showMessage("本文を入力してください");
      return;
    }

    const newExample: LearningExample = {
      id: createId(),
      title: title.trim(),
      body: body.trim(),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = [newExample, ...examples].slice(0, 100);
    saveExamples(next);

    setTitle("");
    setBody("");
    setNote("");
    showMessage("学習用の日記を追加しました");
  }

  function deleteExample(id: string) {
    const next = examples.filter((item) => item.id !== id);
    saveExamples(next);
    showMessage("学習用の日記を削除しました");
  }

  function addNgWord() {
    const value = ngWordInput.trim();
    if (!value) {
      showMessage("NGワードを入力してください");
      return;
    }

    if (config.ngWords.includes(value)) {
      showMessage("そのNGワードはすでに追加されています");
      return;
    }

    const next = {
      ...config,
      ngWords: [...config.ngWords, value],
    };
    saveConfig(next);
    setNgWordInput("");
    showMessage("NGワードを追加しました");
  }

  function removeNgWord(word: string) {
    const next = {
      ...config,
      ngWords: config.ngWords.filter((item) => item !== word),
    };
    saveConfig(next);
    showMessage("NGワードを削除しました");
  }

  function addRule() {
    const value = ruleInput.trim();
    if (!value) {
      showMessage("影響ルールを入力してください");
      return;
    }

    const next = {
      ...config,
      influenceRules: [...config.influenceRules, value],
    };
    saveConfig(next);
    setRuleInput("");
    showMessage("影響ルールを追加しました");
  }

  function removeRule(index: number) {
    const next = {
      ...config,
      influenceRules: config.influenceRules.filter((_, i) => i !== index),
    };
    saveConfig(next);
    showMessage("影響ルールを削除しました");
  }

  const summary = useMemo(() => {
    return {
      exampleCount: examples.length,
      ngWordCount: config.ngWords.length,
      ruleCount: config.influenceRules.length,
    };
  }, [examples, config]);

  return (
    <main className="min-h-screen bg-[#f6f4f7] px-4 py-8 text-[#1f1f23] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
          <p className="text-sm font-medium text-[#a3476b]">管理画面 / 学習モード</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                学習データ管理
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66616d] sm:text-base">
                良い日記の追加、NGワード管理、添削結果に影響するルール文の管理を行います。
              </p>
              {message && (
                <p className="mt-3 text-sm font-medium text-[#7a2e4d]">{message}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933] transition hover:bg-[#faf8fb]"
              >
                管理画面トップへ戻る
              </a>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">学習用日記</p>
            <p className="mt-3 text-3xl font-bold">{summary.exampleCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">NGワード</p>
            <p className="mt-3 text-3xl font-bold">{summary.ngWordCount}</p>
          </div>
          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-[#ebe7ef]">
            <p className="text-sm text-[#66616d]">影響ルール</p>
            <p className="mt-3 text-3xl font-bold">{summary.ruleCount}</p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <p className="text-sm font-medium text-[#a3476b]">学習用の日記を追加</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                    タイトル
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="良いと思ったタイトル"
                    className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                    本文
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="良いと思った本文"
                    className="min-h-[180px] w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2c2933]">
                    メモ
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="何が良いか、なぜ参考にしたいか"
                    className="min-h-[100px] w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addExample}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#a3476b] px-6 text-sm font-semibold text-white transition hover:bg-[#8c3c5b]"
                  >
                    学習データを追加
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef] sm:p-8">
              <p className="text-sm font-medium text-[#a3476b]">登録済み学習データ</p>
              <div className="mt-5 space-y-4">
                {examples.length > 0 ? (
                  examples.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] p-4"
                    >
                      <p className="text-base font-bold text-[#2c2933]">{item.title}</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5d5965]">
                        {item.body}
                      </p>
                      {item.note && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#7b7682]">
                          メモ：{item.note}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span className="text-xs text-[#7b7682]">
                          {new Date(item.createdAt).toLocaleString("ja-JP")}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteExample(item.id)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d3dc] bg-white px-4 text-sm font-medium text-[#2c2933]"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだ学習データがありません。</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6 xl:col-span-5">
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">NGワード管理</p>
              <div className="mt-4 flex gap-2">
                <input
                  value={ngWordInput}
                  onChange={(e) => setNgWordInput(e.target.value)}
                  placeholder="例：激安"
                  className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={addNgWord}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white"
                >
                  追加
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {config.ngWords.length > 0 ? (
                  config.ngWords.map((word) => (
                    <div
                      key={word}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-3"
                    >
                      <span className="text-sm text-[#2c2933]">{word}</span>
                      <button
                        type="button"
                        onClick={() => removeNgWord(word)}
                        className="text-sm font-medium text-[#7a2e4d]"
                      >
                        削除
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">まだNGワードがありません。</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-[#ebe7ef]">
              <p className="text-sm font-medium text-[#a3476b]">添削に影響する要素</p>
              <div className="mt-4 flex gap-2">
                <input
                  value={ruleInput}
                  onChange={(e) => setRuleInput(e.target.value)}
                  placeholder="例：営業感はできるだけ消す"
                  className="h-12 w-full rounded-2xl border border-[#ddd7e1] bg-[#fcfbfd] px-4 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-[#a3476b] px-4 text-sm font-semibold text-white"
                >
                  追加
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {config.influenceRules.length > 0 ? (
                  config.influenceRules.map((rule, index) => (
                    <div
                      key={`${rule}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-[#ece7ef] bg-[#fcfbfd] px-4 py-3"
                    >
                      <span className="text-sm leading-7 text-[#2c2933]">{rule}</span>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="shrink-0 text-sm font-medium text-[#7a2e4d]"
                      >
                        削除
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#66616d]">
                    まだ影響ルールがありません。
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}