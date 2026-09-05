"use client";
// src/app/DeviceSettings.tsx

import type { DeviceOption } from "./useMediaDevices";

type Props = {
  cameras: DeviceOption[];
  mics: DeviceOption[];
  cameraId: string;
  setCameraId: (id: string) => void;
  micId: string;
  setMicId: (id: string) => void;
  error: string;
};

// 折りたたみの中に、カメラとマイクの選択をまとめる
export default function DeviceSettings({
  cameras,
  mics,
  cameraId,
  setCameraId,
  micId,
  setMicId,
  error,
}: Props) {
  return (
    <details className="mt-2 w-full max-w-sm text-left">
      <summary className="cursor-pointer list-none text-center text-sm tracking-wide text-gray-700/60 hover:text-gray-700">
        ⚙ カメラ・マイクの設定
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <label
            htmlFor="camera"
            className="w-12 shrink-0 text-sm tracking-wide text-gray-700/60"
          >
            カメラ
          </label>
          <select
            id="camera"
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            disabled={cameras.length === 0}
            className="min-w-0 flex-1 rounded-none border-0 border-b-2 border-dashed border-gray-300 bg-transparent py-1 text-base focus:outline-none disabled:opacity-40"
          >
            {cameras.length === 0 ? (
              <option value="">カメラが見つかりません</option>
            ) : (
              cameras.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="mic"
            className="w-12 shrink-0 text-sm tracking-wide text-gray-700/60"
          >
            マイク
          </label>
          <select
            id="mic"
            value={micId}
            onChange={(e) => setMicId(e.target.value)}
            disabled={mics.length === 0}
            className="min-w-0 flex-1 rounded-none border-0 border-b-2 border-dashed border-gray-300 bg-transparent py-1 text-base focus:outline-none disabled:opacity-40"
          >
            {mics.length === 0 ? (
              <option value="">マイクが見つかりません</option>
            ) : (
              mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    </details>
  );
}
