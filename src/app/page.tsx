"use client";
// src/app/page.tsx

import { useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { TONES } from "@/lib/options";
import { BUTTON_CLASS, LINK_CLASS, PAGE_CLASS } from "@/lib/styles";
import DeviceSettings from "./DeviceSettings";
import FaceMeter from "./FaceMeter";
import Recorder from "./Recorder";
import { useMediaDevices } from "./useMediaDevices";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [memo, setMemo] = useState(""); // 自分用のメモ
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [smileScore, setSmileScore] = useState(0); // いまの笑顔率（画面に出す用）
  const [practiceSmile, setPracticeSmile] = useState(0); // 話している間の平均
  // 平均を出すのに使えた回数。null=まだ録音していない / 0=録音したが測れなかった
  const [practiceCount, setPracticeCount] = useState<number | null>(null);
  const recordingRef = useRef(false); // いま録音中かどうか
  const scoresRef = useRef<number[]>([]); // 録音中に測った笑顔率をためる箱
  const [tone, setTone] = useState(TONES[0]); // AIの口調
  const topic = "自己紹介を1分で";
  // 使えるカメラ・マイクを調べる（cameraId / micId に最初の機器が入る）
  const devices = useMediaDevices();
  // 読み上げの状態：待機 / 音声を準備中 / 再生中
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "playing">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // FaceMeterが0.5秒ごとに笑顔率を教えてくれる
  function handleScore(score: number) {
    setSmileScore(score);
    // 話している間だけ、あとで平均を出すためにためておく
    if (recordingRef.current) scoresRef.current.push(score);
  }

  // Recorderが録音の開始・終了を教えてくれる
  function handleRecordingChange(recording: boolean) {
    recordingRef.current = recording;

    if (recording) {
      // 録り直したときは、前回ためた分を捨ててやり直す
      scoresRef.current = [];
      setPracticeSmile(0);
      setPracticeCount(null);
      return;
    }

    // 録音が終わったので、ためた笑顔率の平均を出す
    const scores = scoresRef.current;
    setPracticeCount(scores.length); // 0回なら「測れなかった」
    if (scores.length === 0) return;
    const total = scores.reduce((sum, score) => sum + score, 0);
    setPracticeSmile(Math.round(total / scores.length));
  }

  // 話している間の平均が取れていればそれを記録する。
  // 録音を使わなかった・測れなかったときは、今の笑顔率を記録する
  const measured = practiceCount !== null && practiceCount > 0;
  const scoreToSave = measured ? practiceSmile : smileScore;

  async function handleSubmit() {
    stopSpeaking(); // 前のフィードバックの読み上げが残らないように止める
    setLoading(true);
    setFeedback("");
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, tone, smileScore: scoreToSave }),
    });
    const data = await res.json();
    setFeedback(data.feedback);
    setLoading(false);
  }

  async function save() {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        answer,
        smileScore: scoreToSave,
        feedback,
      }),
    });
    alert("保存しました");
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
    <main className={PAGE_CLASS}>
      <h1 className="text-3xl">AI練習コーチ</h1>

      <Link href="/history" className={`${LINK_CLASS} mt-2`}>
        📖 履歴を見る
      </Link>

      <div className="mt-6 flex flex-col items-center">
        <FaceMeter deviceId={devices.cameraId} onScore={handleScore} />
        {/* 笑顔率を絵文字と色で出し分ける（70%以上=😄 / 40%以上=🙂 / それ未満=😐） */}
        <p
          className={`mt-2 flex items-center gap-2 text-sm font-semibold tracking-wide ${
            smileScore >= 70
              ? "text-green-600"
              : smileScore >= 40
                ? "text-amber-600"
                : "text-gray-500"
          }`}
        >
          <span className="text-2xl leading-none">
            {smileScore >= 70 ? "😄" : smileScore >= 40 ? "🙂" : "😐"}
          </span>
          いまの笑顔率：{smileScore}%
        </p>
        {/* 録音が終わると、話している間の平均が出る（これが記録される値） */}
        {measured && (
          <p className="mt-1 text-sm tracking-wide text-gray-700/60">
            話している間の平均：{practiceSmile}%（{practiceCount}
            回はかりました・ この値を記録します）
          </p>
        )}

        {/* 録音したのに一度も測れなかったときは、原因が分かるように知らせる */}
        {practiceCount === 0 && (
          <p className="mt-1 text-sm tracking-wide text-red-600">
            話している間の笑顔を測れませんでした（顔がカメラに写っていますか？）
          </p>
        )}

        <DeviceSettings {...devices} />
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <span className="shrink-0 text-sm tracking-wide text-gray-700/60">
          お題
        </span>
        <span className="text-base">{topic}</span>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        aria-label="回答"
        className="mt-5 w-full resize-none rounded-sm border-2 border-dashed border-gray-300 p-3 text-left text-lg leading-8 outline-none placeholder:text-gray-700/40 focus:outline-none"
        placeholder="ここに回答を入力"
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

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Recorder
          deviceId={devices.micId}
          onText={(t) => setAnswer(t)}
          onRecordingChange={handleRecordingChange}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={BUTTON_CLASS}
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

          {/* 練習の気づきを自分用に書き残す（書かなくても保存できる） */}
          <div className="mt-6 text-left">
            <label
              htmlFor="memo"
              className="text-sm tracking-wide text-gray-700/60"
            >
              📝 メモ（任意）
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded-sm border-2 border-dashed border-gray-300 p-3 text-base leading-7 outline-none placeholder:text-gray-700/40 focus:outline-none"
              placeholder="次はゆっくり話す、結論から言う、など"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={speak}
              disabled={ttsState === "loading"}
              className={BUTTON_CLASS}
            >
              {ttsState === "loading"
                ? "音声を準備中…"
                : ttsState === "playing"
                  ? "■ 読み上げを止める"
                  : "🔊 読み上げ"}
            </button>
            <button onClick={save} className={BUTTON_CLASS}>
              💾 保存する
            </button>
          </div>
        </>
      )}
    </main>
  );
}
