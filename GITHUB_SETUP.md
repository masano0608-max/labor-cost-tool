# GitHub セットアップ＆デプロイ手順

GitHub にコードを上げて、サイトを公開する手順です。

---

## 全体の流れ

1. GitHub アカウントを作る（すでにある人はスキップ）
2. Git をインストールする（すでにある人はスキップ）
3. GitHub で「リポジトリ」を作る
4. このフォルダのコードを GitHub にアップロードする
5. GitHub Pages をオンにする
6. 数分後、サイトが公開される

---

## ① GitHub アカウントを作る

1. **https://github.com** を開く
2. **Sign up**（サインアップ）をクリック
3. メールアドレス、パスワード、ユーザー名を入力
4. メールの認証を完了する

→ これでアカウントの準備OK

---

## ② Git をインストールする

**Mac の場合：**
- ターミナルで `git --version` と入力
- バージョンが出れば入っています（スキップOK）
- 出ない場合：https://git-scm.com からダウンロードしてインストール

**Windows の場合：**
- https://git-scm.com から「Download for Windows」をダウンロード
- インストール画面は全部「Next」でOK

---

## ③ GitHub でリポジトリを作る

1. **https://github.com** にログイン

2. 右上の **＋** マーク → **New repository** をクリック

3. 次のように入力する：
   - **Repository name**：好きな名前（例：`labor-cost-tool`）
   - **Public** を選択
   - **Add a README file** はチェックしない（空のリポジトリにする）
   - **Create repository** をクリック

4. 作ったリポジトリのページが開く
   - 「…or push an existing repository from the command line」というところの URL をメモ
   - 例：`https://github.com/あなたのユーザー名/labor-cost-tool.git`

---

## ④ コードを GitHub にアップロードする

> **ターミナルがよくわからない場合** → 同じフォルダの **「デプロイのやり方.md」** を開いてください。ステップ2をくわしく説明しています。

### ターミナルを開く

**Mac**：⌘＋スペース → 「ターミナル」と入力 → Enter  
**Windows**：Windowsキー → 「cmd」と入力 → Enter

---

### このフォルダに移動する

```bash
cd /Users/masanotanaka/2026.2.26
```

※ フォルダの場所が違う場合は、実際のパスに変えてください。

---

### 次のコマンドを順番に実行する

**1. Git を初期化**
```bash
git init
```

**2. 全部のファイルを追加**
```bash
git add .
```

**3. コミット（保存）**
```bash
git commit -m "初回コミット"
```

**4. ブランチ名を main にする**
```bash
git branch -M main
```

**5. GitHub のリポジトリとつなぐ**  
※ `あなたのユーザー名` と `リポジトリ名` を、③で作ったものに変えてください
```bash
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
```

**6. アップロード**
```bash
git push -u origin main
```

- GitHub のユーザー名とパスワード（またはトークン）を聞かれたら入力
- 「Enumerating objects...」などと表示されて、最後に「done」と出たらOK

---

## ⑤ GitHub Pages をオンにする

1. GitHub のリポジトリのページを開く

2. 上のメニューから **Settings**（設定）をクリック

3. 左のメニューで **Pages** をクリック
   - 「Code and automation」の下にあります

4. **Build and deployment** のところで：
   - **Source**：**GitHub Actions** を選ぶ

5. 何も保存ボタンはありません。選ぶだけでOKです。

---

## ⑥ デプロイを待つ

1. リポジトリのページで **Actions** タブをクリック

2. 「Deploy to GitHub Pages」というワークフローが動いているのを確認
   - 緑のチェック ✅ が出たら完了（2〜3分かかることがあります）

3. もう一度 **Settings** → **Pages** を開く

4. 「Your site is live at ○○○」と表示される
   - その URL をクリックすると、サイトが開きます

**公開URL の例：**
```
https://あなたのユーザー名.github.io/リポジトリ名/
```

---

## コピペ用：まとめて実行

ターミナルでこのフォルダにいる状態で、まとめて実行できます。

```bash
git init
git add .
git commit -m "初回コミット"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git push -u origin main
```

※ `あなたのユーザー名` と `リポジトリ名` は実際のものに書き換えてください

---

## 困ったとき

| 症状 | 対処 |
|------|------|
| `git: command not found` | Git をインストールする（②をやり直す） |
| `Permission denied` | GitHub のユーザー名・パスワードが正しいか確認。パスワードの代わりに「Personal Access Token」が必要な場合あり |
| `failed to push` | `git remote -v` で URL を確認。間違っていたら `git remote remove origin` のあと、⑤の remote add をもう一度 |
| Actions が失敗する | Settings → Pages で Source が「GitHub Actions」になっているか確認 |
