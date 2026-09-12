"use client";
// src/app/Recorder.tsx

import { useRef, useState } from "react";
import { BUTTON_CLASS } from "@/lib/styles";

// ブラウザが録音できる形式を選ぶ（Chrome系はwebm / Safariはmp4）
function pickMimeType() {
  const candidates = ["audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // 判定できないときはブラウザ任せ
}

export default function Recorder({
  deviceId,
  onText,
  onRecordingChange,
}: {
  deviceId: string;
  onText: (t: string) => void;
  // 録音の開始・終了を親に知らせる（話している間の笑顔率を測るのに使う）
  onRecordingChange?: (recording: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false); // 文字起こし中かどうか
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRec() {
    if (typeof MediaRecorder === "undefined") {
      alert("このブラウザは録音に対応していません。Chromeをお試しください。");
      return;
    }

    let stream: MediaStream;
    try {
      // 設定で選ばれたマイクを使う（未選択のときはブラウザ任せ）
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
    } catch (e) {
      console.error(e);
      alert(
        "マイクを使えませんでした。設定で別のマイクを選ぶか、ブラウザでマイクを『許可』してください。",
      );
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    chunksRef.current = [];
    // 空のかけらは混ぜない（0バイトの音声ができるのを防ぐ）
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      // 録音が終わったらマイクを解放する（ランプが点いたままになるのを防ぐ）
      stream.getTracks().forEach((t) => t.stop());

      setTranscribing(true);
      try {
        // 実際に録音された形式に合わせてファイル名の拡張子も変える
        const type = recorder.mimeType || mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) {
          throw new Error(
            "録音データが空でした。もう少し長く話してからボタンを押してください。",
          );
        }

        const form = new FormData();
        form.append("audio", blob, `audio.${ext}`);
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || typeof data?.text !== "string") {
          throw new Error(data?.error ?? "文字起こしに失敗しました");
        }
        if (data.text.trim() === "") {
          throw new Error(
            "音声を聞き取れませんでした。マイクに近づいてもう一度お試しください。",
          );
        }
        onText(data.text); // 文字起こし結果を親に渡す → 回答欄に入る
      } catch (e) {
        console.error(e);
        // 原因が分かるように、そのままの理由を画面に出す
        alert(e instanceof Error ? e.message : "文字起こしに失敗しました");
      } finally {
        setTranscribing(false);
      }
    };
    // 1秒ごとにデータを受け取る（長い録音でも取りこぼさない）
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    onRecordingChange?.(true);
  }

  function stopRec() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    // 停止直後にもう一度押せてしまうのを防ぐため、先に「文字にしています」へ切り替える
    setRecording(false);
    setTranscribing(true);
    onRecordingChange?.(false);
    recorder.stop();
  }

  return (
    <button
      onClick={recording ? stopRec : startRec}
      disabled={transcribing}
      className={BUTTON_CLASS}
    >
      {transcribing
        ? "文字にしています…"
        : recording
          ? "■ 録音停止して文字にする"
          : "🎤 録音する"}
    </button>
  );
}
