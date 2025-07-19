#!/bin/bash

# HNSW npm 发布脚本

echo "🚀 开始发布 @leolee9086/hnsw 到 npm..."

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

# 运行测试
echo "🧪 运行测试..."
npm test

if [ $? -ne 0 ]; then
  echo "❌ 错误: 测试失败"
  exit 1
fi

# 检查 package.json 版本
VERSION=$(node -p "require('./package.json').version")
echo "📋 当前版本: $VERSION"

# 确认发布
read -p "确认发布版本 $VERSION 到 npm? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 发布已取消"
  exit 1
fi

# 发布到 npm
echo "📤 发布到 npm..."
npm publish

if [ $? -eq 0 ]; then
  echo "✅ 发布成功!"
  echo "🔗 包地址: https://www.npmjs.com/package/@leolee9086/hnsw"
  echo "📋 版本: $VERSION"
else
  echo "❌ 发布失败"
  exit 1
fi 