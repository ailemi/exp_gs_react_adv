"use client";
// src/app/page.tsx

import { useState } from "react";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("やさしめ");

  const topic = "自己紹介を1分で";

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");

    // 自分のAPI(/api/coach)を呼ぶ（Groqのキーはこの先＝サーバー側にある）
    // 通信やAPI側の失敗で画面が無反応にならないよう try/catch/finally で守る
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, answer, tone }),
      });
      const data = await res.json();
      setFeedback(
        data.feedback ?? "エラーが起きました。もう一度お試しください。",
      );
    } catch {
      setFeedback("通信に失敗しました。ネットワークを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold tracking-tight">AI練習コーチ</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        お題：{topic}
      </p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        className="mt-6 w-full rounded-lg border border-gray-300 p-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-900"
        placeholder="ここに回答を入力"
      />

      <div className="mt-3 flex items-center gap-2">
        <label
          htmlFor="tone"
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          口調
        </label>
        <select
          id="tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="やさしめ">やさしめ</option>
          <option value="スパルタ">スパルタ</option>
          <option value="ていねい">ていねい</option>
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <p className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed whitespace-pre-wrap dark:border-gray-800 dark:bg-gray-900">
          {feedback}
        </p>
      )}
    </main>
  );
}
