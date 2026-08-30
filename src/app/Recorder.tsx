"use client";
// src/app/Recorder.tsx

import { useRef, useState } from "react";

export default function Recorder({ onText }: { onText: (t: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false); // 文字起こし中かどうか
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRec() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error(e);
      alert(
        "マイクを使えませんでした。ブラウザでマイクを『許可』してください。",
      );
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      // 録音が終わったらマイクを解放する（ランプが点いたままになるのを防ぐ）
      stream.getTracks().forEach((t) => t.stop());

      setTranscribing(true);
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "audio.webm");
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok || typeof data.text !== "string") {
          throw new Error(data.error ?? "文字起こしに失敗しました");
        }
        onText(data.text); // 文字起こし結果を親に渡す → 回答欄に入る
      } catch (e) {
        console.error(e);
        alert("文字起こしに失敗しました。もう一度お試しください。");
      } finally {
        setTranscribing(false);
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRec() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <button
      onClick={recording ? stopRec : startRec}
      disabled={transcribing}
      className="rounded-sm border-2 border-gray-600 bg-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition duration-200 enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:bg-gray-400 enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:shadow-none focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {transcribing
        ? "文字にしています…"
        : recording
          ? "■ 録音停止して文字にする"
          : "🎤 録音する"}
    </button>
  );
}
