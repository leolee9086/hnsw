# HNSW 发布指南

## 🚀 快速发布

### 方法一：一键快速发布
```bash
npm run quick:publish
```
这个命令会：
1. 自动更新版本号（patch/minor/major）
2. 构建项目
3. 运行测试
4. 发布到 npm
5. 创建 git 标签

### 方法二：分步发布
```bash
# 1. 更新版本号
npm run version:patch

# 2. 构建并发布
npm run build:publish
```

### 方法三：手动发布
```bash
# 1. 更新版本
npm version patch

# 2. 构建
npm run build

# 3. 测试
npm test

# 4. 发布
npm publish
```

## 📋 发布前检查

### 环境检查
- [ ] 在 main 分支上
- [ ] 已登录 npm (`npm login`)
- [ ] 没有未提交的更改
- [ ] 所有测试通过

### 代码检查
- [ ] 构建成功 (`npm run build`)
- [ ] 测试通过 (`npm test`)
- [ ] 类型检查通过 (`npm run type-check`)

## 🔧 脚本说明

### `scripts/quick-publish.sh`
- **用途**: 一键完成版本更新和发布
- **特点**: 自动化程度最高，适合快速发布

### `scripts/auto-publish.sh`
- **用途**: 构建后自动发布
- **特点**: 检查构建产物完整性，适合 CI/CD

### `scripts/version.sh`
- **用途**: 版本管理和发布
- **特点**: 提供多种版本更新选项

## 📦 发布配置

### package.json 关键字段
```json
{
  "name": "@leolee9086/hnsw",
  "version": "1.0.0",
  "description": "JavaScript HNSW 向量索引库",
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": {
    "access": "public"
  }
}
```

### .npmignore 排除文件
- 源代码 (`src/`)
- 测试文件 (`test/`, `bench/`)
- 示例应用 (`example/`)
- 开发配置文件
- 备份文件

## 🎯 版本策略

### 版本号规则
- **patch**: 修复 bug，向后兼容 (1.0.0 → 1.0.1)
- **minor**: 新功能，向后兼容 (1.0.0 → 1.1.0)
- **major**: 破坏性更改 (1.0.0 → 2.0.0)

### 发布频率
- **patch**: 修复 bug 时立即发布
- **minor**: 添加新功能时发布
- **major**: API 重大变更时发布

## 🔍 发布后验证

### 检查清单
- [ ] npm 页面显示正确
- [ ] 包可以正常安装
- [ ] 功能测试通过
- [ ] git 标签已创建
- [ ] GitHub Release 已更新

### 验证命令
```bash
# 测试安装
npm install @leolee9086/hnsw

# 测试功能
node -e "const { hnsw } = require('@leolee9086/hnsw'); console.log('✅ 安装成功')"
```

## 🚨 故障排除

### 常见问题
1. **发布失败**: 检查 npm 登录状态
2. **版本冲突**: 确保版本号唯一
3. **构建失败**: 检查 TypeScript 错误
4. **测试失败**: 修复失败的测试用例

### 回滚步骤
```bash
# 取消发布（72小时内）
npm unpublish @leolee9086/hnsw@版本号

# 删除本地标签
git tag -d v版本号
git push origin :refs/tags/v版本号
``` 