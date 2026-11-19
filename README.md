# 放射線技師クイズ

診療放射線技師を目指す人のための、解説つき四択クイズです。スマホで空き時間に解けます。

- 全66問（基礎22・応用22・国家試験22）
- 7カテゴリ：放射線物理学／X線・CT画像技術／MRI／核医学（PET・SPECT）／放射線管理・防護／解剖・生理／医療機器の安全管理
- 1問ごとに正誤と解説（なぜそうなるか、国家試験でのポイント）を表示
- 学習の記録（正答率・カテゴリ別正答率・解いた問題数・間違えた問題・前回の続き）をブラウザに保存
- 間違えた問題だけを解き直す復習モード、ランダム出題、今日の10問

## 構成

```
index.html         画面
css/style.css      スタイル（白基調＋1色アクセント）
js/questions.js    問題データ
js/app.js          出題・採点・保存の処理
```

ビルドは不要です。`index.html` をブラウザで開けば動きます（ファイルを直接開いても可）。

## 問題を追加するには

`js/questions.js` の `questions` 配列に1件足すだけです。

```js
{
  id: "phy-a5",             // 重複しないID
  cat: "phy",               // phy / img / mri / nuc / pro / ana / saf
  diff: "applied",          // basic / applied / national
  q: "問題文",
  choices: ["A", "B", "C", "D"],
  answer: 2,                // 正解の番号（0〜3）
  exp: "解説文",
  point: "覚えるポイント"    // 省略可
}
```

カテゴリや難易度を増やすときは、同じファイルの `categories` / `difficulties` に追加します。

## 配備

ビルド不要の静的サイトなので、そのまま静的ホスティングに置けます。

- Render（Static Site・Publish Directory `.`）: https://radiation-quiz.onrender.com
- GitHub Pages（Settings → Pages → Deploy from a branch / `main` / `/ (root)`）: https://hato2170.github.io/radiation-quiz/

参照はすべて相対パス（`css/style.css`、`js/app.js` など）なので、`https://hato2170.github.io/radiation-quiz/` のようなサブパス配信でもそのまま動きます。
