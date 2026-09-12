"use client";
// src/app/history/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { LINK_CLASS, PAGE_CLASS } from "@/lib/styles";

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
  const [loadError, setLoadError] = useState(false); // 読み込みに失敗したか

  // 画面を開いたときに1回だけAPIから一覧を取ってくる
  useEffect(() => {
    async function load() {
      // 通信やDBが落ちていても画面が固まらないように、失敗を受け止める
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) throw new Error("読み込みに失敗しました");
        setRows(await res.json());
      } catch (e) {
        console.error(e);
        setLoadError(true);
      }
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

  return (
    <main className={PAGE_CLASS}>
      <h1 className="text-3xl">練習の記録</h1>

      <Link href="/" className={`${LINK_CLASS} mt-2`}>
        ← 練習にもどる
      </Link>

      {loading ? (
        <p className="mt-8 text-sm tracking-wide text-gray-700/60">
          読み込み中…
        </p>
      ) : loadError ? (
        <p className="mt-8 text-sm tracking-wide text-red-600">
          記録を読み込めませんでした。ページを再読み込みしてください。
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm tracking-wide text-gray-700/60">
          まだありません。練習して「保存」しましょう。
        </p>
      ) : (
        <>
          {/* 笑顔スコアの推移グラフ（左が古い、右が新しい） */}
          <div className="mt-8 rounded-sm bg-sky-100 p-5 shadow-md">
            <p className="text-left text-sm tracking-wide text-gray-700/60">
              😊 平均の笑顔スコアの変化
            </p>
            <div className="mt-3 flex h-24 items-end gap-1">
              {graphRows.map((row) => (
                <div
                  key={row.id}
                  title={`${formatDate(row.createdAt)}：${row.smileScore ?? 0}%`}
                  className="w-4 rounded-t-sm bg-sky-600"
                  // 高さだけは記録ごとに変わるので style で指定する
                  style={{ height: `${row.smileScore ?? 0}%` }}
                />
              ))}
            </div>
          </div>

          {/* 並び替えボタン。選ばれているものだけ枠を実線にする */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {SORT_BUTTONS.map((button) => (
              <button
                key={button.value}
                onClick={() => setSort(button.value)}
                className={
                  button.value === sort
                    ? "rounded-sm border-2 border-gray-600 bg-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700"
                    : "cursor-pointer rounded-sm border-2 border-dashed border-gray-300 px-4 py-1.5 text-sm text-gray-700/60 transition duration-200 hover:border-gray-400 hover:text-gray-700"
                }
              >
                {button.label}
              </button>
            ))}
          </div>

          {/* 記録の一覧（{rows.length}件） */}
          <p className="mt-6 text-sm tracking-wide text-gray-700/60">
            ぜんぶで {rows.length} 件
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {sortedRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-sm border-2 border-dashed border-gray-300 p-4 text-left"
              >
                <Link href={`/history/${row.id}`} className="min-w-0 flex-1">
                  <p className="text-sm tracking-wide text-gray-700/60">
                    {formatDate(row.createdAt)}
                    {row.category ? ` ・ ${row.category}` : ""}
                  </p>
                  <p className="truncate text-lg text-gray-700">{row.topic}</p>
                  <p className="text-sm text-gray-700/60">
                    😊 平均の笑顔 {row.smileScore ?? 0}%
                  </p>
                </Link>

                <button
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.id}
                  className="shrink-0 cursor-pointer rounded-sm border-2 border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-700/60 transition duration-200 hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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
