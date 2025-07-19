#!/bin/bash

# HNSW 自动发布脚本
# 构建成功后自动发布到 npm

set -e  # 遇到错误立即退出

echo "🚀 HNSW 自动发布流程开始..."

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 当前版本: $CURRENT_VERSION"

# 检查是否在正确的分支
if [ "$(git branch --show-current)" != "main" ]; then
  echo "❌ 错误: 请在 main 分支上发布"
  exit 1
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 错误: 有未提交的更改，请先提交"
  exit 1
fi

# 检查是否已登录 npm
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ 错误: 请先登录 npm (npm login)"
  exit 1
fi

# 清理并构建
echo "📦 清理并构建项目..."
npm run clean
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
  echo "❌ 错误: 构建失败，dist 目录不存在"
  exit 1
fi

# 检查构建产物
echo "🔍 检查构建产物..."
if [ ! -f "dist/index.js" ] || [ ! -f "dist/index.mjs" ] || [ ! -f "dist/index.d.ts" ]; then
  echo "❌ 错误: 构建产物不完整"
  exit 1
fi

# 运行测试
echo "🧪 运行测试..."
npm test

if [ $? -ne 0 ]; then
  echo "❌ 错误: 测试失败"
  exit 1
fi

# 检查版本是否已发布
echo "🔍 检查版本是否已发布..."
if npm view @leolee9086/hnsw@$CURRENT_VERSION version > /dev/null 2>&1; then
  echo "⚠️  警告: 版本 $CURRENT_VERSION 已经发布过"
  read -p "是否继续发布? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 发布已取消"
    exit 1
  fi
fi

# 自动发布
echo "📤 自动发布到 npm..."
npm publish

if [ $? -eq 0 ]; then
  echo "✅ 发布成功!"
  echo "🔗 包地址: https://www.npmjs.com/package/@leolee9086/hnsw"
  echo "📋 版本: $CURRENT_VERSION"
  
  # 创建 git 标签
  echo "🏷️  创建 git 标签..."
  git tag "v$CURRENT_VERSION"
  git push origin "v$CURRENT_VERSION"
  
  echo "🎉 发布流程完成!"
else
  echo "❌ 发布失败"
  exit 1
fi 