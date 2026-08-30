"use client";
// src/app/page.tsx

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { TONES, TOPICS } from "@/lib/options";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState(TONES[0]);
  const [topic, setTopic] = useState(TOPICS[0]);

  // 未入力のまま送信させない（同じチェックはサーバー側にもある。
  // こっちは「親切」のため、サーバー側は「防御」のため）
  const canSubmit = !loading && answer.trim() !== "";

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

      // 通信自体は成功しても、API側がエラーを返していることがある。
      // res.ok を見ないと「失敗したのに成功したように見える」状態になる
      if (!res.ok) {
        setFeedback(
          data.feedback ?? "エラーが起きました。もう一度お試しください。",
        );
        return; // return しても finally は必ず動くので loading は解除される
      }

      setFeedback(
        data.feedback ??
          "フィードバックを受け取れませんでした。もう一度お試しください。",
      );
    } catch {
      setFeedback("通信に失敗しました。ネットワークを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto my-10 w-full max-w-2xl bg-gray-50 px-5 py-10 text-center sm:px-8 sm:py-14">
      <h1 className="text-3xl">AI練習コーチ</h1>

      <div className="mt-6 flex items-center justify-center gap-3">
        <label
          htmlFor="topic"
          className="shrink-0 text-sm tracking-wide text-gray-700/60"
        >
          お題
        </label>
        <select
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="max-w-full rounded-none border-0 border-b-2 border-dashed border-gray-300 bg-transparent py-1 text-base focus:outline-none"
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        aria-label="回答"
        className="mt-5 w-full resize-none rounded-sm border-2 border-dashed border-gray-300 p-3 text-left text-lg leading-8 outline-none placeholder:text-gray-700/40 focus:outline-none"
        placeholder="ここに回答を書く"
      />

      <div className="mt-5 flex items-center justify-center gap-3">
        <label
          htmlFor="tone"
          className="shrink-0 text-sm tracking-wide text-gray-700/60"
        >
          口調
        </label>
        <select
          id="tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="max-w-full rounded-none border-0 border-b-2 border-dashed border-gray-300 bg-transparent py-1 text-base focus:outline-none"
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-7 rounded-sm border-2 border-gray-600 bg-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <div className="mt-8 rounded-sm bg-sky-100 p-5 shadow-md">
          <div className="text-left text-base leading-8 text-gray-700">
            <ReactMarkdown
              components={{
                // 段落（先頭だけは上の余白をなくす）
                p: ({ children }) => (
                  <p className="mt-3 first:mt-0">{children}</p>
                ),
                // **太字**
                strong: ({ children }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                // - 箇条書き
                ul: ({ children }) => (
                  <ul className="mt-2 list-disc pl-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mt-2 list-decimal pl-5">{children}</ol>
                ),
                li: ({ children }) => <li className="mt-1">{children}</li>,
              }}
            >
              {feedback}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  );
}
