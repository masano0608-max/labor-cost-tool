#!/bin/bash
# GitHub 簡単デプロイ

cd "$(dirname "$0")"

if [ -z "$1" ]; then
  echo ""
  echo "【1回だけ】GitHub で空のリポジトリを作成してください"
  echo "  → https://github.com/new"
  echo "  → 名前を入力、READMEは追加しない、Create"
  echo ""
  echo "【実行】次をターミナルで実行："
  echo ""
  echo "  ./deploy.sh https://github.com/ユーザー名/リポジトリ名.git"
  echo ""
  exit 1
fi

echo "=== デプロイ中 ==="
git add -A
git commit -m "Deploy" 2>/dev/null || git commit -m "Initial deploy"
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin "$1"
git push -u origin main

echo ""
echo "✅ 完了！"
echo "→ Settings → Pages → Source で「GitHub Actions」を選択"
