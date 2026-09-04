// src/app/api/coach/route.ts
import { TONES, TOPICS } from "@/lib/options";

export async function POST(request: Request) {
  const { topic, answer, tone, smileScore } = await request.json();

  // 選択肢は許可リストで絞る（画面を通さず直接叩かれた時に
  // 想定外の文字列がお願い文へ紛れ込むのを防ぐ）
  const safeTopic = TOPICS.includes(topic) ? topic : TOPICS[0];
  const safeTone = TONES.includes(tone) ? tone : TONES[0];

  const prompt = `あなたはプレゼン/面接の練習コーチです。
「${safeTone}」な口調で、次の「お題」に対する「回答」を読んで、
良かった点と改善点を、具体的に、200文字くらいで日本語でフィードバックしてください。
お題: ${safeTopic}
回答: ${answer}
笑顔率: ${smileScore}%`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const feedback = data.choices[0].message.content;
  return Response.json({ feedback });
}
