# HNSW Monorepo

这是一个使用pnpm workspace管理的monorepo项目，包含HNSW向量索引库和示例应用。

## 项目结构

```
hnsw/
├── src/                    # HNSW库源码
├── test/                   # 测试文件
├── bench/                  # 性能基准测试
├── dist/                   # 构建输出
├── example/                # 示例应用
│   ├── src/               # 示例源码
│   ├── index.html         # 示例页面
│   └── package.json       # 示例项目配置
├── package.json           # 根项目配置
├── pnpm-workspace.yaml    # pnpm workspace配置
└── README.md              # 主项目文档
```

## 开发命令

### 根目录命令

```bash
# 安装所有依赖
pnpm install

# 构建主项目
pnpm build

# 运行测试
pnpm test

# 运行基准测试
pnpm bench

# 代码检查
pnpm lint
```

### 示例项目命令

```bash
# 开发模式运行示例
pnpm dev:example

# 构建示例项目
pnpm --filter example build

# 预览构建结果
pnpm --filter example preview

# 部署到GitHub Pages
pnpm --filter example deploy
```

### 全局命令

```bash
# 构建所有项目
pnpm build:all

# 运行所有测试
pnpm test:all

# 开发模式（主项目 + 示例）
pnpm dev & pnpm dev:example
```

## 依赖管理

### 主项目依赖

- `@leolee9086/hnsw`: 核心HNSW库
- `hnswlib-node`: 性能对比库
- `tinyqueue`: 队列实现

### 示例项目依赖

- `@leolee9086/hnsw`: 引用主项目（workspace:*）
- `@xenova/transformers`: 向量嵌入模型
- `vite`: 构建工具

## 工作流程

1. **开发阶段**:
   ```bash
   # 启动主项目开发
   pnpm dev
   
   # 启动示例项目开发
   pnpm dev:example
   ```

2. **测试阶段**:
   ```bash
   # 运行所有测试
   pnpm test:all
   ```

3. **构建阶段**:
   ```bash
   # 构建所有项目
   pnpm build:all
   ```

4. **部署阶段**:
   ```bash
   # 部署示例到GitHub Pages
   pnpm --filter example deploy
   ```

## 注意事项

- 示例项目通过`workspace:*`引用主项目，确保使用最新版本
- 主项目构建后，示例项目会自动使用最新的构建结果
- 使用pnpm workspace确保依赖版本一致性
- 示例项目支持独立开发和部署

## 开发建议

1. **并行开发**: 可以同时开发主库和示例应用
2. **版本同步**: workspace确保示例始终使用最新版本的主库
3. **独立部署**: 示例项目可以独立部署到GitHub Pages
4. **测试覆盖**: 主库和示例都有完整的测试覆盖 