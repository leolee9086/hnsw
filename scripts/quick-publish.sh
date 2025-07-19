#!/bin/bash

# HNSW 快速发布脚本
# 一键完成版本更新、构建、测试和发布

set -e

echo "🚀 HNSW 快速发布工具"

# 检查环境
if [ "$(git branch --show-current)" != "main" ]; then
  echo "❌ 请在 main 分支上发布"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 有未提交的更改，请先提交"
  exit 1
fi

if ! npm whoami > /dev/null 2>&1; then
  echo "❌ 请先登录 npm (npm login)"
  exit 1
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 当前版本: $CURRENT_VERSION"

# 选择版本类型
echo ""
echo "选择版本更新类型:"
echo "1) patch - 补丁版本 (自动)"
echo "2) minor - 次要版本"
echo "3) major - 主要版本"
echo ""

read -p "请选择 (1-3): " choice

case $choice in
  1)
    VERSION_TYPE="patch"
    ;;
  2)
    VERSION_TYPE="minor"
    ;;
  3)
    VERSION_TYPE="major"
    ;;
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

echo "📦 更新版本到 $VERSION_TYPE..."
npm version $VERSION_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ 新版本: $NEW_VERSION"

# 构建和测试
echo "🔨 构建项目..."
npm run clean
npm run build

echo "🧪 运行测试..."
npm test

# 提交更改
echo "📝 提交更改..."
git add package.json
git commit -m "chore: release v$NEW_VERSION"

# 发布
echo "📤 发布到 npm..."
npm publish

if [ $? -eq 0 ]; then
  echo "✅ 发布成功!"
  
  # 创建标签
  echo "🏷️  创建 git 标签..."
  git tag "v$NEW_VERSION"
  git push origin main
  git push origin "v$NEW_VERSION"
  
  echo "🎉 发布完成!"
  echo "🔗 包地址: https://www.npmjs.com/package/@leolee9086/hnsw"
  echo "📋 版本: $NEW_VERSION"
else
  echo "❌ 发布失败"
  exit 1
fi 