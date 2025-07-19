#!/bin/bash

# HNSW 版本管理和发布脚本

set -e

echo "📋 HNSW 版本管理工具"

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "当前版本: $CURRENT_VERSION"

# 显示版本选项
echo ""
echo "选择版本更新类型:"
echo "1) patch - 补丁版本 (1.0.0 -> 1.0.1)"
echo "2) minor - 次要版本 (1.0.0 -> 1.1.0)"
echo "3) major - 主要版本 (1.0.0 -> 2.0.0)"
echo "4) 自定义版本"
echo "5) 仅构建不发布"
echo ""

read -p "请选择 (1-5): " choice

case $choice in
  1)
    echo "📦 更新补丁版本..."
    npm version patch --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "新版本: $NEW_VERSION"
    ;;
  2)
    echo "📦 更新次要版本..."
    npm version minor --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "新版本: $NEW_VERSION"
    ;;
  3)
    echo "📦 更新主要版本..."
    npm version major --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "新版本: $NEW_VERSION"
    ;;
  4)
    read -p "请输入新版本号 (例如: 1.2.3): " custom_version
    npm version $custom_version --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "新版本: $NEW_VERSION"
    ;;
  5)
    echo "🔨 仅构建项目..."
    npm run build
    echo "✅ 构建完成"
    exit 0
    ;;
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

# 提交版本更改
echo "📝 提交版本更改..."
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# 询问是否立即发布
read -p "是否立即发布到 npm? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
  echo "✅ 版本已更新到 $NEW_VERSION，但未发布"
  echo "💡 稍后可以运行: npm run build:publish"
else
  echo "🚀 开始自动发布流程..."
  ./scripts/auto-publish.sh
fi 