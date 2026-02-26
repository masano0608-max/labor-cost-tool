# 予想 vs 実際経費 割合ツール

人件費の予想と実際を比較し、割合・差異を可視化するWebアプリケーションです。

## 機能

- **計算画面** (`index.html`)：予想・実際の入力から人件費を計算し、割合を表示
- **過去データ** (`history.html`)：月別に保存したデータの一覧・詳細・読み込み・削除
- **テスト画面** (`test.html`)：計算ロジックの検証

### 主な機能

- 日報・音声・コーチングの3チーム別計算
- 予想と実際を同じ項目で入力・比較
- 予想⇔実際のコピーボタンで入力の手間を軽減
- 入力値の自動保存（リロードしても復元）
- 月別データの保存・読み込み
- CSVエクスポート
- 印刷対応

## 計算式

- **日報・音声チーム**：`単価（円/時）× (対応分数/60) × 営業日数 × 提出率(%)`
- **コーチングチーム**：`単価（円/回）× 対応回数 × 提出率(%)`
- **総額**：`1人あたり合計 × 在籍生徒数`

## ファイル構成

```
├── index.html           # 計算画面
├── history.html         # 過去データ
├── test.html            # テスト画面
├── calculator.js        # 計算ロジック（テスト可能な純粋関数）
├── test-cases.js        # テストケース定義
├── test.js              # ブラウザ用テストランナー
├── app.js               # UI・保存・イベント処理
├── styles.css           # スタイル
├── calculator.test.js   # Node.js 用ユニットテスト
├── package.json         # npm スクリプト（test）
├── firebase.json        # Firebase Hosting 設定
├── .firebaserc          # Firebase プロジェクトID（要編集）
├── DEPLOY.md            # Netlify / Firebase でデプロイ
├── GITHUB_SETUP.md      # GitHub セットアップ＆デプロイ手順
└── README.md
```

## テスト

### ブラウザでテスト

1. `test.html` をブラウザで開く
2. 「選択ケースをテスト」：選択したケースのみ実行
3. 「全テスト実行」：予想計算3件 + 逆算2件の計5件を一括実行

### コマンドラインでテスト（Node.js 18+）

```bash
npm test
# または
node --test calculator.test.js
```

## 使い方

1. `index.html` をブラウザで開く
2. 対象月・在籍生徒数・営業日数を入力
3. 各チームの予想・実際の単価・時間・提出率を入力
4. 計算結果と割合が自動表示される
5. 「この月のデータを保存」で過去データに追加
6. 「CSVダウンロード」で結果をCSVで保存
7. 「印刷」で印刷用レイアウトで表示

## 技術スタック

- HTML5 / CSS3 / Vanilla JavaScript
- localStorage によるデータ永続化
- 外部ライブラリ不要

## デプロイ方法

**→ [GITHUB_SETUP.md](./GITHUB_SETUP.md)** … GitHub でセットアップ＆デプロイ（おすすめ）  
**→ [DEPLOY.md](./DEPLOY.md)** … Netlify や Firebase でデプロイ

### すぐ始める（Google Cloud / Firebase）

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. ターミナルで `npm install -g firebase-tools` を実行
3. `firebase login` でログイン
4. `.firebaserc` の `YOUR_PROJECT_ID` を自分のプロジェクトIDに変更
5. `firebase deploy --only hosting` でデプロイ完了

→ `https://<プロジェクトID>.web.app` で公開されます

### GitHub Pages

1. GitHub でリポジトリを作成
2. このフォルダのファイルをプッシュ
3. リポジトリの **Settings** → **Pages**（左メニューの「Code and automation」内）
4. **Build and deployment** の **Source** で **GitHub Actions** を選択
5. 以降は自動：main ブランチへ push するとデプロイされる
6. 数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開

> 「Deploy from a branch」が表示されない場合、**GitHub Actions** を選んでください。  
> `.github/workflows/deploy.yml` が含まれているため、そのまま動作します。

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

### Netlify

1. [netlify.com](https://netlify.com) にアクセス
2. **Add new site** → **Deploy manually**
3. このフォルダをドラッグ&ドロップ
4. または Git リポジトリを接続して自動デプロイ

### Vercel

1. [vercel.com](https://vercel.com) にアクセス
2. **Add New** → **Project**
3. Git リポジトリをインポート、またはフォルダをアップロード
