// src/app/history/[id]/page.tsx
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LINK_CLASS, PAGE_CLASS } from "@/lib/styles";

export default async function HistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, Number(id)));
  const row = rows[0];

  if (!row) {
    return (
      <main className={PAGE_CLASS}>
        <p className="text-sm tracking-wide text-gray-700/60">
          見つかりませんでした。
        </p>
        <Link href="/history" className={`${LINK_CLASS} mt-4`}>
          ← 記録の一覧にもどる
        </Link>
      </main>
    );
  }

  const smileScore = row.smileScore ?? 0;

  return (
    <main className={PAGE_CLASS}>
      <h1 className="text-3xl">{row.topic}</h1>

      <Link href="/history" className={`${LINK_CLASS} mt-2`}>
        ← 記録の一覧にもどる
      </Link>

      {/* 笑顔率を絵文字と色で出し分ける（70%以上=😄 / 40%以上=🙂 / それ未満=😐） */}
      <p
        className={`mt-6 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide ${
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
        話している間の平均笑顔率：{smileScore}%
      </p>

      {/* 自分の回答（TOPの入力欄と同じ破線の枠） */}
      <div className="mt-6 rounded-sm border-2 border-dashed border-gray-300 p-3">
        <p className="text-left text-sm tracking-wide text-gray-700/60">
          🗣 あなたの回答
        </p>
        <p className="mt-2 text-left text-lg leading-8 whitespace-pre-wrap text-gray-700">
          {row.answerText}
        </p>
      </div>

      {/* 自分で書いたメモ（書いていない記録もあるので、ある時だけ出す） */}
      {row.memo && (
        <div className="mt-6 rounded-sm border-2 border-dashed border-gray-300 p-3">
          <p className="text-left text-sm tracking-wide text-gray-700/60">
            📝 メモ
          </p>
          <p className="mt-2 text-left text-base leading-8 whitespace-pre-wrap text-gray-700">
            {row.memo}
          </p>
        </div>
      )}

      {/* AIのフィードバック（TOPと同じ水色のカード） */}
      <div className="mt-6 rounded-sm bg-sky-100 p-5 shadow-md">
        <p className="text-left text-sm tracking-wide text-gray-700/60">
          🤖 コーチから
        </p>
        <div className="mt-2 text-left text-base leading-8 text-gray-700">
          <ReactMarkdown>{row.feedback}</ReactMarkdown>
        </div>
      </div>
    </main>
  );
}
