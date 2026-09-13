// app/history/page.tsx
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function HistoryPage() {
  // ① まず未ログインを弾く（他のAPIと同じ思想＝ログインしていない人は入れない）
  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="p-8">
        <p>履歴を見るにはログインしてください。</p>
      </main>
    );
  }

  // ② 一覧は"自分のだけ"（userId 一致）・新しい順
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>練習の記録（{rows.length}件）</h1>
      {rows.length === 0 ? (
        <p>まだありません。練習して「保存」しましょう。</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/history/${row.id}`}>
                {row.topic} ／ 笑顔 {row.smileScore ?? 0}%
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}