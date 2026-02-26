#!/bin/bash
# GitHub 簡単デプロイ

cd "$(dirname "$0")"

if [ -z "$1" ]; then
  echo ""
  echo "【1回だけ】GitHub で空のリポジトリを作成"
  echo "  → https://github.com/new"
  echo ""
  echo "【実行】次の2行をターミナルで順番に実行："
  echo ""
  echo "  cd $(pwd)"
  echo "  ./deploy.sh https://github.com/ユーザー名/リポジトリ名.git"
  echo ""
  echo "  ※ユーザー名とリポジトリ名は自分のものに変えてください"
  echo "  ※詳しくは「デプロイのやり方.md」を開いてください"
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
