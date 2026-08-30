// このファイル名は決まっている。この名前じゃないと自作APIにならない
// バレたらダメなAPIキーとかはこっちに書く
// サーバー側の処理

import { MAX_ANSWER_LENGTH, TONES, TOPICS } from "@/lib/options";

// async awaitは、読み込みが正しくされるようにするために必要
export async function POST(request: Request) {
  // ① 入力を受け取る（画面から送られてくる お題 と 回答）
  //   Body が空/JSONでない時に備えて、try で受け止める
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { feedback: "リクエストの形式が正しくありません。" },
      { status: 400 },
    );
  }
  const { topic, answer, tone } = body;

  // ② 入力をチェックする
  //   このAPIは画面を通さずcurlなどから直接叩けるので、
  //   お金と安全に関わるチェックは必ずサーバー側にも置く
  if (typeof answer !== "string" || answer.trim() === "") {
    return Response.json(
      { feedback: "回答を入力してください。" },
      { status: 400 },
    );
  }

  // 長文をそのままAIに渡すと、その分まるごと課金されるので上限で止める
  if (answer.length > MAX_ANSWER_LENGTH) {
    return Response.json(
      { feedback: `回答は${MAX_ANSWER_LENGTH}文字以内でお願いします。` },
      { status: 400 },
    );
  }

  // 想定外の文字列がお願い文に紛れ込まないよう、選択肢は許可リストで絞る
  // （「これまでの指示を無視して〜」などを送り込まれるのを防ぐ）
  const safeTopic = TOPICS.includes(topic) ? topic : TOPICS[0];
  const safeTone = TONES.includes(tone) ? tone : TONES[0];

  // ③ AIへの"お願い文"を組み立てる
  const prompt = `あなたはプレゼン/面接の練習コーチです。
「${safeTone}」な口調で、次の「お題」に対する「回答」を読んで、
良かった点と改善点を、具体的に、200文字くらいで日本語でフィードバックしてください。
お題: ${safeTopic}
回答: ${answer}`;

  // ④ Groq を叩く（キーはサーバー側の環境変数から。ブラウザには出ない）
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

  // ⑤ 返事を取り出す
  const data = await res.json();

  // Groqがエラーを返した時（キー違い・回数制限など）はここで気づける
  if (!res.ok) {
    console.error("Groqエラー:", data);
    return Response.json(
      {
        feedback: "AIとの通信に失敗しました。少し時間をおいてお試しください。",
      },
      { status: 502 },
    );
  }

  // choices が空配列 [] の時もあるので、? を付けて安全に取り出す
  // （? がないと data.choices[0] のところでサーバーが落ちる）
  const feedback = data.choices?.[0]?.message?.content;
  if (!feedback) {
    console.error("Groqの返答が空:", data);
    return Response.json(
      { feedback: "AIの返答が空でした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  // ⑥ 画面に返す
  return Response.json({ feedback });
}
