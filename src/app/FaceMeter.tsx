"use client";
// src/app/FaceMeter.tsx

import { useEffect, useRef, useState } from "react";
// import * as faceapi from "@vladmandic/face-api"; //←use clientなので、サーバー側の読み込みはNG。動的インポートで回避。

export default function FaceMeter({
  onScore,
}: {
  onScore: (n: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [smile, setSmile] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function start() {
      const faceapi = await import("@vladmandic/face-api"); // ←① 動的インポートに変更(SSRでエラーになるのを回避)
      // ① モデルを読み込む（public/models から）
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");

      // ② カメラを起動して video に流す
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play(); // ← srcObject 代入だけだと再生されず真っ黒な環境がある
        }
      } catch (e) {
        console.error(e);
        alert(
          "カメラを使えませんでした。ブラウザのアドレスバーでカメラを『許可』してから、ページを再読み込みしてください。",
        );
        return;
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
          setSmile(happy);
          onScore(happy); // 親(page.tsx)にも笑顔率を渡す
        }
      }, 500);
    }

    start();
    return () => clearInterval(timer); // 片付け
    // onScore は常に setSmileScore を渡す（インライン関数にすると毎回カメラが再起動するので注意）
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted
        width={320}
        height={240}
        className="mx-auto max-w-full rounded-sm border-2 border-dashed border-gray-300"
      />
      <p className="mt-2 text-sm tracking-wide text-gray-700/60">
        😊 笑顔 {smile}%
      </p>
    </div>
  );
}
