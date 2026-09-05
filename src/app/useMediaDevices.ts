"use client";
// src/app/useMediaDevices.ts

import { useEffect, useState } from "react";

export type DeviceOption = { deviceId: string; label: string };

// 使えるカメラ・マイクの一覧と、いま選んでいる機器を管理する
export function useMediaDevices() {
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const all = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) return;

      // 許可前は deviceId が空になるので、使える機器だけに絞る
      const collect = (kind: MediaDeviceKind, fallback: string) =>
        all
          .filter((d) => d.kind === kind && d.deviceId !== "")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `${fallback} ${i + 1}`,
          }));

      const nextCameras = collect("videoinput", "カメラ");
      const nextMics = collect("audioinput", "マイク");
      setCameras(nextCameras);
      setMics(nextMics);

      // 未選択のとき、または選んでいた機器が外されたときは先頭の機器に戻す
      const keepOrFirst = (list: DeviceOption[]) => (current: string) =>
        list.some((d) => d.deviceId === current)
          ? current
          : (list[0]?.deviceId ?? "");
      setCameraId(keepOrFirst(nextCameras));
      setMicId(keepOrFirst(nextMics));
    }

    async function start() {
      try {
        // 機器名を表示するには一度許可が必要（許可が取れたらすぐ解放する）
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setError(
          "カメラとマイクを『許可』してから、ページを再読み込みしてください。",
        );
      }
      if (cancelled) return;
      await load();
    }

    start();
    // USBマイクの抜き差しなどにも追従する
    navigator.mediaDevices.addEventListener("devicechange", load);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", load);
    };
  }, []);

  return { cameras, mics, cameraId, setCameraId, micId, setMicId, error };
}
