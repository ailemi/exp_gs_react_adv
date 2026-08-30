// src/app/api/tts/route.ts
import { EdgeTTS } from "@andresaya/edge-tts";

const VOICE = "ja-JP-NanamiNeural"; // 日本語の自然な声
const MAX_LENGTH = 2000; // 1回に読み上げる上限（長すぎる入力を弾く）
const CHUNK_SIZE = 120; // 1回の合成に渡す上限。長すぎると音声が途中で切れる

/**
 * テキストを合成できる長さに分割する。
 * 句読点や改行がまったく無い長文をそのまま渡すと、
 * Edge TTS が途中で打ち切ったり無音を返したりするため、
 * 文の区切りを優先しつつ CHUNK_SIZE 以内に収める。
 */
function splitText(text: string): string[] {
  // 句点・改行のうしろで区切る（区切り文字は前の文に残す）
  const sentences = text.split(/(?<=[。！？!?\n])/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    // 1文だけで長すぎる場合は強制的に切り刻む
    for (let i = 0; i < sentence.length; i += CHUNK_SIZE) {
      const piece = sentence.slice(i, i + CHUNK_SIZE);
      if (current.length + piece.length > CHUNK_SIZE) {
        if (current.trim()) chunks.push(current);
        current = piece;
      } else {
        current += piece;
      }
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks;
}

export async function POST(request: Request) {
  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return Response.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 },
    );
  }

  if (typeof text !== "string" || !text.trim()) {
    return Response.json(
      { error: "読み上げるテキストがありません" },
      { status: 400 },
    );
  }
  if (text.length > MAX_LENGTH) {
    return Response.json(
      { error: `テキストが長すぎます（${MAX_LENGTH}文字まで）` },
      { status: 400 },
    );
  }

  try {
    // 分割したチャンクを順に合成し、mp3 として連結する
    const parts: Buffer[] = [];
    for (const chunk of splitText(text)) {
      const tts = new EdgeTTS();
      await tts.synthesize(chunk, VOICE);
      parts.push(Buffer.from(tts.toBase64(), "base64"));
    }
    const audio = Buffer.concat(parts);

    // 合成に失敗すると例外ではなく空データが返ることがあるので明示的に弾く
    if (audio.length === 0) {
      throw new Error("音声データが空でした");
    }

    // base64 の JSON ではなく mp3 バイナリで返す（データ量が約 1/1.33、
    // ブラウザの data URI 長さ制限にも引っかからない）
    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[tts]", e);
    return Response.json(
      { error: "音声の生成に失敗しました" },
      { status: 500 },
    );
  }
}
