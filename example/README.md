# HNSW向量索引示例

这是一个基于HNSW算法的向量索引示例项目，支持文件上传、文本距离搜索和向量检索。

## 功能特性

- 📁 **文件上传**: 支持拖拽上传和点击上传
- 🔍 **文本搜索**: 使用编辑距离进行文本相似性搜索
- 🧠 **向量搜索**: 使用Transformers.js进行语义向量搜索
- 🌏 **中文支持**: 完整支持中文文本处理
- 📊 **实时统计**: 显示文件数量、文本块数量、索引大小和搜索时间
- 🎨 **现代UI**: 响应式设计，支持移动端

## 技术栈

- **HNSW索引**: `@leolee9086/hnsw` - 高性能向量索引库
- **向量嵌入**: `@xenova/transformers` - 浏览器端Transformer模型
- **构建工具**: Vite - 快速的前端构建工具
- **语言**: TypeScript - 类型安全的JavaScript

## 快速开始

### 安装依赖

```bash
cd example
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:3000 查看应用。

### 构建部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 部署到GitHub Pages
pnpm deploy
```

## 使用说明

### 1. 文件上传

- 支持 `.txt`, `.md`, `.json` 格式的文件
- 可以拖拽文件到上传区域
- 也可以点击"选择文件"按钮上传

### 2. 文本搜索

- 使用编辑距离算法进行文本相似性搜索
- 适合查找拼写错误、近似文本等场景
- 搜索速度快，适合实时搜索

### 3. 向量搜索

- 使用预训练的Transformer模型生成文本向量
- 支持语义搜索，理解文本含义
- 首次使用需要下载模型，可能需要一些时间

### 4. 文本分块

- 自动将长文本分割成200字符左右的块
- 按句子边界分割，保持语义完整性
- 支持中文标点符号

## 项目结构

```
example/
├── index.html          # 主页面
├── package.json        # 项目配置
├── vite.config.ts      # Vite配置
├── tsconfig.json       # TypeScript配置
└── src/
    └── main.ts         # 主要逻辑
```

## 核心功能实现

### 文本距离搜索

```typescript
// 编辑距离函数
const editDistance = (a: string, b: string): number => {
  // 动态规划实现编辑距离计算
  // 返回两个字符串的最小编辑距离
};

// 创建文本索引
const textIndex = createHNSWIndex({
  M: 16,
  efConstruction: 200,
  distanceFunction: editDistance
});
```

### 向量搜索

```typescript
// 余弦距离函数
const cosineDistance = (a: number[], b: number[]): number => {
  // 计算两个向量的余弦距离
  return 1.0 - dotProduct / (normA * normB);
};

// 创建向量索引
const vectorIndex = createHNSWIndex({
  M: 16,
  efConstruction: 200,
  distanceFunction: cosineDistance
});
```

### 文本分块

```typescript
function chunkText(text: string, chunkSize: number = 200): string[] {
  // 按句子分割文本
  const sentences = text.split(/[。！？.!?]/);
  
  // 合并短句子，分割长句子
  // 返回合适大小的文本块
}
```

## 性能优化

- **异步加载**: 向量模型异步加载，不阻塞页面
- **分块处理**: 大文件分块处理，避免内存溢出
- **缓存机制**: 重复搜索结果缓存
- **懒加载**: 按需加载模型和功能

## 浏览器兼容性

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## 部署到GitHub Pages

1. 确保项目在GitHub仓库中
2. 运行 `pnpm deploy` 命令
3. 在仓库设置中启用GitHub Pages
4. 选择 `gh-pages` 分支作为源

## 注意事项

- 首次使用向量搜索时需要下载模型（约50MB）
- 大文件处理可能需要较长时间
- 建议在支持的浏览器中使用
- 向量搜索需要网络连接下载模型

## 许可证

MIT License 