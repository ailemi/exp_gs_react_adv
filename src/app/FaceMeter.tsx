"use client";
// src/app/FaceMeter.tsx

import { useEffect, useRef } from "react";
// import * as faceapi from "@vladmandic/face-api"; //←use clientなので、サーバー側の読み込みはNG。動的インポートで回避。

export default function FaceMeter({
  deviceId,
  onScore,
}: {
  deviceId: string;
  onScore: (n: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 使うカメラが決まるまでは何もしない（設定で選び直したらここからやり直す）
    if (!deviceId) return;

    let timer: ReturnType<typeof setInterval>;
    let stream: MediaStream | undefined;
    let cancelled = false; // 開発中は useEffect が2回走るので、片付け済みかを見張る

    async function start() {
      const faceapi = await import("@vladmandic/face-api"); // ←① 動的インポートに変更(SSRでエラーになるのを回避)
      // ① モデルを読み込む（public/models から）※読み込み済みなら省く
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      }
      if (!faceapi.nets.faceExpressionNet.isLoaded) {
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
      }
      if (cancelled) return;

      // ② 選ばれたカメラを起動して video に流す
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });
      } catch (e) {
        console.error(e);
        alert(
          "カメラを使えませんでした。設定で別のカメラを選ぶか、ブラウザでカメラを『許可』してからページを再読み込みしてください。",
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play(); // ← srcObject 代入だけだと再生されず真っ黒な環境がある
        } catch {
          // autoPlay が先に再生を始めていると AbortError になるが、
          // 映像は出ているので無視してよい（ここで止めると計測が始まらない）
        }
      }

      // ③ 0.5秒ごとに表情を測る
      timer = setInterval(async () => {
        if (!videoRef.current) return;
        const result = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions(),
          )
          .withFaceExpressions();
        if (result) {
          const happy = Math.round(result.expressions.happy * 100);
          onScore(happy); // 笑顔率は親(page.tsx)が受け取って表示する
        }
      }, 500);
    }

    start();
    // 片付け（計測を止めて、カメラも解放する＝ランプが点いたままになるのを防ぐ）
    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // ⚠️ onScore はカメラを起動した時のものが、そのまま使われ続ける。
    //   渡す関数の中で useState の値を読むと「古い値」が見えるので注意。
    //   （useRef の箱や、setXxx を呼ぶのは安全）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      width={320}
      height={240}
      className="mx-auto max-w-full rounded-sm border-2 border-dashed border-gray-300"
    />
  );
}
