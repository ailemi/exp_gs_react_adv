"use client";
// src/app/page.tsx

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import FaceMeter from "./FaceMeter"; // ← ① 追加
import Recorder from "./Recorder";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const topic = "自己紹介を1分で";
  const [smileScore, setSmileScore] = useState(0); // ← ② 追加
  // 読み上げの状態：待機 / 音声を準備中 / 再生中
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "playing">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleSubmit() {
    stopSpeaking(); // 前のフィードバックの読み上げが残らないように止める
    setLoading(true);
    setFeedback("");
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, smileScore }),
    });
    const data = await res.json();
    setFeedback(data.feedback);
    setLoading(false);
  }

  // 再生中の音声を止めて、Blob URL を解放する
  function stopSpeaking() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    setTtsState("idle");
  }

  async function speak() {
    // 再生中にもう一度押したら停止（連打で音声が重なるのを防ぐ）
    if (ttsState === "playing") {
      stopSpeaking();
      return;
    }
    setTtsState("loading");

    let url: string | undefined;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedback }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "音声の生成に失敗しました");
      }

      // mp3 バイナリを Blob URL にして再生する
      url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = stopSpeaking; // 再生し終わったら後片付け
      audio.onerror = stopSpeaking;
      audioRef.current = audio;

      await audio.play(); // 自動再生をブロックされた場合はここで例外になる
      setTtsState("playing");
    } catch (e) {
      console.error(e);
      if (url) URL.revokeObjectURL(url);
      audioRef.current = null;
      setTtsState("idle");
      alert("読み上げに失敗しました。もう一度お試しください。");
    }
  }

  return (
    <main className="mx-auto my-10 w-full max-w-2xl bg-gray-50 px-5 py-10 text-center sm:px-8 sm:py-14">
      <h1 className="text-3xl">AI練習コーチ</h1>

      <div className="mt-6 flex flex-col items-center">
        <FaceMeter onScore={setSmileScore} />
        <p className="mt-2 text-sm tracking-wide text-gray-700/60">
          いまの笑顔率：{smileScore}%
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <span className="shrink-0 text-sm tracking-wide text-gray-700/60">
          お題
        </span>
        <span className="border-b-2 border-dashed border-gray-300 py-1 text-base">
          {topic}
        </span>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        aria-label="回答"
        className="mt-5 w-full resize-none rounded-sm border-2 border-dashed border-gray-300 p-3 text-left text-lg leading-8 outline-none placeholder:text-gray-700/40 focus:outline-none"
        placeholder="ここに回答を入力"
      />

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Recorder onText={(t) => setAnswer(t)} />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-sm border-2 border-gray-600 bg-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition duration-200 enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:bg-gray-400 enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:shadow-none focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "生成中…" : "コーチに見てもらう"}
        </button>
      </div>

      {feedback && (
        <>
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
          <button
            onClick={speak}
            disabled={ttsState === "loading"}
            className="mt-4 rounded-sm border-2 border-gray-600 bg-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition duration-200 enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:bg-gray-400 enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:shadow-none focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ttsState === "loading"
              ? "音声を準備中…"
              : ttsState === "playing"
                ? "■ 読み上げを止める"
                : "🔊 読み上げ"}
          </button>
        </>
      )}
    </main>
  );
}
