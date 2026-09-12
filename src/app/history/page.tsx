"use client";
// src/app/history/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";

// APIから返ってくる記録1件分のデータの形
type Session = {
  id: number;
  topic: string;
  smileScore: number | null;
  category: string | null;
  createdAt: string; // JSONで届くときは文字列になる
};

// 並び替えの種類（"new" = 新しい順）
type Sort = "new" | "old" | "smile";

// 並び替えボタンに出す文字。ここに足せばボタンが増える
const SORT_BUTTONS: { value: Sort; label: string }[] = [
  { value: "new", label: "新しい順" },
  { value: "old", label: "古い順" },
  { value: "smile", label: "笑顔スコア順" },
];

// 日時を「2026/09/12 14:30」の形にする
function formatDate(createdAt: string) {
  return new Date(createdAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 記録を並び替えた「新しい配列」を返す
function sortSessions(list: Session[], sort: Sort) {
  const copy = [...list]; // 元の配列は壊さないようにコピーしてから並び替える

  if (sort === "smile") {
    // 笑顔スコアが高い順。スコアが無い記録は0点あつかい
    copy.sort((a, b) => (b.smileScore ?? 0) - (a.smileScore ?? 0));
  } else if (sort === "old") {
    // 古い順（日時を数値に直して小さい方が先）
    copy.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  } else {
    // 新しい順
    copy.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return copy;
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Session[]>([]); // 記録の一覧
  const [loading, setLoading] = useState(true); // 読み込み中かどうか
  const [sort, setSort] = useState<Sort>("new"); // いま選ばれている並び順
  const [deletingId, setDeletingId] = useState<number | null>(null); // 削除中の記録のid

  // 画面を開いたときに1回だけAPIから一覧を取ってくる
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setRows(data);
      setLoading(false);
    }
    load();
  }, []);

  // 削除ボタンを押したとき
  async function handleDelete(row: Session) {
    // ① 本当に消していいか確認する。キャンセルされたら何もしない
    const ok = confirm(`「${row.topic}」の記録を削除します。よろしいですか？`);
    if (!ok) return;

    // ② APIに削除をお願いする
    setDeletingId(row.id);
    const res = await fetch(`/api/sessions/${row.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      alert("削除できませんでした。もう一度お試しください。");
      return;
    }

    // ③ 画面の一覧からも消す（消した1件以外だけ残す）
    setRows(rows.filter((r) => r.id !== row.id));
  }

  // 一覧は選ばれた順番で、グラフは時間の流れを見たいので常に古い順
  const sortedRows = sortSessions(rows, sort);
  const graphRows = sortSessions(rows, "old");

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl py-6">
        <p className="text-gray-500">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">練習の記録（{rows.length}件）</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 練習にもどる
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
          まだありません。練習して「保存」しましょう。
        </p>
      ) : (
        <>
          {/* 笑顔スコアの推移グラフ（左が古い、右が新しい） */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm text-gray-500">😊 笑顔スコアの変化</p>
            <div className="flex h-24 items-end gap-1">
              {graphRows.map((row) => (
                <div
                  key={row.id}
                  title={`${formatDate(row.createdAt)}：${row.smileScore ?? 0}%`}
                  className="w-4 rounded-t bg-blue-600"
                  // 高さだけは記録ごとに変わるので style で指定する
                  style={{ height: `${row.smileScore ?? 0}%` }}
                />
              ))}
            </div>
          </div>

          {/* 並び替えボタン */}
          <div className="mb-3 flex gap-2">
            {SORT_BUTTONS.map((button) => (
              <button
                key={button.value}
                onClick={() => setSort(button.value)}
                className={
                  // いま選ばれているボタンだけ色を濃くする
                  button.value === sort
                    ? "rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
                    : "rounded-full bg-white px-3 py-1 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
                }
              >
                {button.label}
              </button>
            ))}
          </div>

          {/* 記録の一覧 */}
          <ul className="flex flex-col gap-2">
            {sortedRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <Link href={`/history/${row.id}`} className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">
                    {formatDate(row.createdAt)}
                    {row.category ? ` ・ ${row.category}` : ""}
                  </p>
                  <p className="truncate font-bold">{row.topic}</p>
                  <p className="text-sm text-gray-600">
                    😊 笑顔 {row.smileScore ?? 0}%
                  </p>
                </Link>

                <button
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.id}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === row.id ? "削除中…" : "🗑 削除"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
