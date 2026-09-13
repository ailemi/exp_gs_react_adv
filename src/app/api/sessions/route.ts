// app/api/sessions/route.ts
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// 一覧（自分のだけ・新しい順）
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "ログインしてください" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  return Response.json(rows);
}

// 1件保存（本物のログインidで）
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "ログインしてください" }, { status: 401 });
  }

  const body = await request.json();
  await db.insert(sessions).values({
    userId, // ← "demo" ではなく、本物のログインid
    topic: body.topic,
    answerText: body.answer,
    smileScore: body.smileScore,
    feedback: body.feedback,
  });

  return Response.json({ ok: true });
}
