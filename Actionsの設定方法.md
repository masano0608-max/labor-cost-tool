# Actions 画面でのやり方

「Get started with GitHub Actions」と表示されている場合の手順です。

---

## 方法A：Static HTML を使う（おすすめ）

1. **Settings** タブをクリック
2. 左メニューの **Pages** をクリック
3. 下の方にある **「Static HTML」** のカードを探す
4. そのカードの **「Configure」** ボタンをクリック
5. 編集画面が開くので、**そのまま**（何も変えずに）右上の **「Commit changes」** をクリック
6. 1〜2分待つ
7. もう一度 **Settings** → **Pages** を開く
8. 「Your site is live at ○○○」の URL が表示されていれば完了

---

## 方法B：もう一度 push する

プロジェクトにワークフローが入っている場合、もう一度 push すると動くことがあります。

ターミナルで：

```bash
cd /Users/masanotanaka/2026.2.26
git add -A
git commit -m "Trigger deploy" --allow-empty
git push
```

その後、**Actions** タブを開いて「Deploy to GitHub Pages」が動いているか確認してください。
