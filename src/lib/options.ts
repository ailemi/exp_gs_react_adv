// お題と口調の選択肢。画面（page.tsx）とAPI（route.ts）の両方から使う。
// ここ1箇所を直せば、選択肢の追加・変更が両方に反映される。
export const TOPICS = ["自己紹介を1分で", "志望動機", "自分の強み", "転職理由"];

export const TONES = ["やさしめ", "スパルタ", "ていねい"];

// 回答の最大文字数。長文を投げられるとその分AIに課金されるので上限を決めておく
export const MAX_ANSWER_LENGTH = 2000;
