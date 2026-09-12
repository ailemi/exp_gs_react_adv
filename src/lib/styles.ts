// 画面ぜんぶで使う共通の見た目。ここ1箇所を直せば、全部のボタンの見た目が変わる。

// 押すと少し浮き上がる立体ボタン
export const BUTTON_CLASS =
  "rounded-sm border-2 border-gray-600 bg-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition duration-200 focus:ring-2 focus:ring-gray-400 focus:outline-none enabled:cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:bg-gray-400 enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-40";

// ページ全体を囲む紙のような枠
export const PAGE_CLASS =
  "mx-auto my-10 w-full max-w-2xl bg-gray-50 px-5 py-10 text-center sm:px-8 sm:py-14";

// 控えめなリンク（「履歴を見る」「練習にもどる」など）
export const LINK_CLASS =
  "inline-block text-sm tracking-wide text-gray-700/60 hover:text-gray-700";
