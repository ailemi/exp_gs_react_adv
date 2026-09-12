// src/app/api/transcribe/route.ts
import { MAX_AUDIO_MB } from "@/lib/options";

export async function POST(request: Request) {
  // 画面から送られた音声ファイルを受け取る
  const inForm = await request.formData();
  const audio = inForm.get("audio");

  // 音声が届いていない／中身が空のときは、理由を画面に返す
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json(
      { error: "録音データが空でした。もう一度録音してください。" },
      { status: 400 },
    );
  }

  // 大きすぎる音声はその分まるごと課金されるので、ここで止める
  if (audio.size > MAX_AUDIO_MB * 1024 * 1024) {
    return Response.json(
      {
        error: `録音が長すぎます（${MAX_AUDIO_MB}MBまで）。短く録り直してください。`,
      },
      { status: 400 },
    );
  }

  // Groqの音声API(Whisper)へ転送する形に詰め替える
  const groqForm = new FormData();
  groqForm.append("file", audio, audio.name || "audio.webm");
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "ja");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm, // ← FormDataのときは Content-Type を自分で付けない
    },
  );

  // Groq側が失敗したときは、理由をサーバーのログに出しつつ画面にも伝える
  if (!res.ok) {
    const detail = await res.text();
    console.error("Groq transcribe error:", res.status, detail);
    return Response.json(
      { error: `文字起こしに失敗しました（${res.status}）: ${detail}` },
      { status: 500 },
    );
  }

  const data = await res.json();
  return Response.json({ text: data.text ?? "" });
}
