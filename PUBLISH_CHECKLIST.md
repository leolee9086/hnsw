# HNSW npm 发布检查清单

## 📋 发布前检查

### 1. 代码质量
- [ ] 所有测试通过 (`npm test`)
- [ ] 代码风格检查通过 (`npm run lint`)
- [ ] TypeScript 类型检查通过 (`npm run type-check`)
- [ ] 构建成功 (`npm run build`)

### 2. 文档更新
- [ ] README.md 内容完整且准确
- [ ] 示例代码可运行
- [ ] API 文档清晰
- [ ] 安装和使用说明正确

### 3. 包配置
- [ ] package.json 版本号正确
- [ ] 包名称正确 (`@leolee9086/hnsw`)
- [ ] 描述信息准确
- [ ] 关键词合适
- [ ] 许可证正确 (MIT)
- [ ] 作者信息正确

### 4. 文件配置
- [ ] .npmignore 文件存在且配置正确
- [ ] package.json 的 "files" 字段包含必要文件
- [ ] 构建产物在 dist/ 目录中
- [ ] 源代码和测试文件被正确排除

### 5. 依赖检查
- [ ] 生产依赖正确
- [ ] 开发依赖不会被打包
- [ ] 版本号合理
- [ ] 没有安全漏洞

### 6. 发布准备
- [ ] 已登录 npm (`npm login`)
- [ ] 在 main 分支上
- [ ] 所有更改已提交
- [ ] 版本号已更新

## 🚀 发布步骤

1. **更新版本号** (如果需要)
   ```bash
   npm version patch  # 或 minor 或 major
   ```

2. **运行发布脚本**
   ```bash
   ./scripts/publish.sh
   ```

3. **验证发布**
   - 检查 npm 页面: https://www.npmjs.com/package/@leolee9086/hnsw
   - 测试安装: `npm install @leolee9086/hnsw`
   - 验证功能正常

## 📝 发布后

- [ ] 更新 GitHub 标签
- [ ] 更新 GitHub Release
- [ ] 通知相关用户
- [ ] 监控包下载量

## 🔧 故障排除

### 常见问题
1. **发布失败**: 检查是否已登录 npm
2. **版本冲突**: 确保版本号唯一
3. **构建失败**: 检查 TypeScript 错误
4. **测试失败**: 修复失败的测试用例

### 回滚步骤
```bash
npm unpublish @leolee9086/hnsw@版本号
``` 