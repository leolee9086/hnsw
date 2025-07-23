# @leolee9086/hnsw

JavaScript HNSW (Hierarchical Navigable Small World) 向量索引库，用于快速相似性搜索。纯 JavaScript 实现，支持动态操作和泛型搜索。

## 🚀 特性

- **动态操作**: 支持插入、搜索、删除操作，软删除设计
- **泛型支持**: 完全泛型化，支持任意数据类型和自定义距离函数
- **轻量级**: 最小化依赖，专注于核心功能
- **易用性**: 简洁的API设计，快速上手
- **可扩展**: 支持动态插入和实时搜索
- **类型安全**: 完整的TypeScript支持

## 📦 安装

```bash
npm install @leolee9086/hnsw
# 或使用 pnpm
pnpm add @leolee9086/hnsw
# 或使用 yarn
yarn add @leolee9086/hnsw
```

## 🚀 快速开始

### 基本使用

```typescript
import { hnsw } from '@leolee9086/hnsw';

// 创建HNSW索引
const index = hnsw.createIndex({
  M: 16,              // 每个节点的最大连接数
  efConstruction: 200, // 构建时的搜索参数
  metricType: 'cosine' // 距离度量类型: 'cosine' | 'l2'
});

// 插入向量
const vectors = [
  [1, 2, 3, 4],
  [2, 3, 4, 5],
  [3, 4, 5, 6],
  // ... 更多向量
];

vectors.forEach(vector => {
  index.insertNode(vector);
});

// 搜索最近邻
const queryVector = [1.5, 2.5, 3.5, 4.5];
const results = index.search(queryVector, 5); // 返回5个最近邻

console.log(results);
// [
//   { idx: 0, distance: 0.1 },
//   { idx: 1, distance: 0.2 },
//   ...
// ]
```

### 高级使用

```typescript
// 使用L2距离
const l2Index = hnsw.createIndex({
  M: 32,
  efConstruction: 400,
  metricType: 'l2'
});

// 自定义搜索参数
const results = index.search(queryVector, 10, 300); // 使用efSearch=300

// 删除节点
index.deleteNode(0); // 删除索引为0的节点

// 获取统计信息
const stats = index.getStats();
console.log(stats);
// {
//   nodeCount: 100,
//   activeNodeCount: 99,
//   deletedNodeCount: 1,
//   entryPoint: { idx: 5, level: 3 }
// }
```

### 🎨 泛型版使用

本库提供了泛型化版本，支持任意数据类型和自定义距离函数：

```typescript
import { hnsw } from '@leolee9086/hnsw';

// 1. 向量相似性搜索（使用自定义距离函数）
const cosineDistance = (a: number[], b: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 1.0;
  return 1.0 - dotProduct / (normA * normB);
};

const vectorIndex = hnsw.createIndexGeneric({
  M: 16,
  efConstruction: 200,
  distanceFunction: cosineDistance
});

// 2. 字符串相似性搜索（使用编辑距离）
const editDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [];
    matrix[i]![0] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0]![j] = j;
  }
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,     // 删除
          matrix[i]![j - 1]! + 1,     // 插入
          matrix[i - 1]![j - 1]! + 1  // 替换
        );
      }
    }
  }
  
  return matrix[a.length]![b.length]!;
};

const stringIndex = hnsw.createIndexGeneric({
  M: 16,
  efConstruction: 200,
  distanceFunction: editDistance
});

// 插入字符串
const strings = ['hello', 'world', 'help', 'hell', 'hero'];
strings.forEach(str => stringIndex.insertNode(str));

// 搜索相似字符串
const results = stringIndex.search('help', 3);
console.log(results); // 找到编辑距离最小的字符串

// 3. 自定义对象相似性搜索
interface Point {
  x: number;
  y: number;
  label: string;
}

const euclideanDistance = (a: Point, b: Point): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const pointIndex = hnsw.createIndexGeneric({
  M: 16,
  efConstruction: 200,
  distanceFunction: euclideanDistance
});

// 插入点对象
const points: Point[] = [
  { x: 0, y: 0, label: 'origin' },
  { x: 1, y: 0, label: 'right' },
  { x: 0, y: 1, label: 'up' },
  { x: 1, y: 1, label: 'diagonal' }
];

points.forEach(point => pointIndex.insertNode(point));

// 搜索最近的点
const queryPoint: Point = { x: 0.1, y: 0.1, label: 'near_origin' };
const nearestPoints = pointIndex.search(queryPoint, 2);

// 4. 优化距离函数（支持预计算）
const optimizedCosineDistance = (a: number[], b: number[]): number => {
  let dotProduct = 0;
  let i = 0;

  // 循环展开优化
  for (; i < a.length - 3; i += 4) {
    dotProduct +=
      a[i]! * b[i]! +
      a[i + 1]! * b[i + 1]! +
      a[i + 2]! * b[i + 2]! +
      a[i + 3]! * b[i + 3]!;
  }

  // 处理剩余部分
  for (; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
  }
  
  // 假设向量已归一化，简化计算
  return 1.0 - dotProduct;
};

const optimizedIndex = hnsw.createIndexGeneric({
  M: 16,
  efConstruction: 200,
  distanceFunction: optimizedCosineDistance
});
```

## 📚 API 文档

### 标准版 API

#### `hnsw.createIndex(config)`

创建HNSW索引实例（标准版，仅支持向量）。

**参数:**
- `config.M` (number): 每个节点的最大连接数，影响图的连接密度
  - 推荐值: 16-64
  - 值越大构建越慢但搜索越快
- `config.efConstruction` (number): 构建时的搜索参数，影响构建质量
  - 推荐值: 100-400
  - 值越大构建质量越高但速度越慢
- `config.metricType` ('cosine' | 'l2'): 距离度量类型
  - `'cosine'`: 余弦距离，适用于归一化向量
  - `'l2'`: 欧几里得距离的平方

**返回:** HNSWIndex实例

### 🎨 泛型版 API

#### `hnsw.createIndexGeneric<T>(config)`

创建泛型HNSW索引实例，支持任意数据类型。

**参数:**
- `config.M` (number): 每个节点的最大连接数
- `config.efConstruction` (number): 构建时的搜索参数
- `config.distanceFunction` (a: T, b: T) => number: **必需**，自定义距离函数
- `config.distanceToQuery?` (query: T, target: T) => number: **可选**，查询专用距离函数

**返回:** HNSWIndex<T>实例

**距离函数要求:**
- 必须返回非负数
- 必须满足对称性：distance(a, b) === distance(b, a)
- 必须满足自反性：distance(a, a) === 0
- 建议满足三角不等式

**示例距离函数:**
```typescript
// 余弦距离
const cosineDistance = (a: number[], b: number[]): number => {
  // 实现余弦距离计算
  return 1.0 - dotProduct / (normA * normB);
};

// 编辑距离
const editDistance = (a: string, b: string): number => {
  // 实现编辑距离计算
  return matrix[a.length]![b.length]!;
};

// 欧几里得距离
const euclideanDistance = (a: Point, b: Point): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
```

### `index.insertNode(item)`

向索引中插入新项目。

**标准版参数:**
- `item` (number[]): 要插入的向量
  - 必须是非空数组
  - 所有向量的维度必须一致

**泛型版参数:**
- `item` (T): 要插入的项目
  - 类型必须与索引创建时指定的类型一致

**注意:** 插入操作是O(log n)复杂度，适合实时插入

### `index.search(queryItem, k, efSearch?)`

搜索最近邻。

**标准版参数:**
- `queryItem` (number[]): 查询向量
  - 必须与索引中向量维度一致

**泛型版参数:**
- `queryItem` (T): 查询项目
  - 类型必须与索引创建时指定的类型一致

**通用参数:**
- `k` (number): 返回的最近邻数量
  - 必须大于0
- `efSearch` (number, 可选): 搜索时的参数
  - 默认使用构建时的efConstruction
  - 推荐值: k的2-4倍

**返回:** Neighbor[] - 包含idx和distance的对象数组，按距离升序排列

### `index.deleteNode(nodeIdx)`

删除指定节点。

**参数:**
- `nodeIdx` (number): 要删除的节点索引

**返回:** boolean - 删除是否成功

**注意:** 
- 使用软删除机制，不影响搜索性能
- 删除的节点不会出现在搜索结果中
- 删除入口点时会自动重新选择入口点

### `index.getStats()`

获取索引统计信息。

**返回:**
```typescript
{
  nodeCount: number,      // 节点总数（包括已删除的）
  activeNodeCount: number, // 活跃节点数（未删除的）
  deletedNodeCount: number, // 已删除节点数
  entryPoint: {           // 入口点信息
    idx: number,          // 入口点索引
    level: number         // 入口点层级
  }
}
```

## 🎯 使用建议

### 参数调优

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| M | 16-64 | 连接数，影响搜索精度和速度 |
| efConstruction | 100-400 | 构建质量，影响索引质量 |
| efSearch | k的2-4倍 | 搜索精度，影响召回率 |

### 向量预处理

- **归一化**: 使用余弦距离时确保向量已归一化
- **维度**: 推荐100-1000维，过高维度会影响性能
- **稀疏性**: 避免使用稀疏向量，使用密集向量

### 最佳实践

1. **批量插入**: 对于大量数据，建议批量插入而非逐个插入
2. **参数平衡**: 根据应用场景平衡精度和速度
3. **监控性能**: 使用`getStats()`监控索引状态
4. **内存管理**: 大规模应用注意内存使用

### 🎨 泛型版最佳实践

1. **距离函数优化**: 
   - 使用循环展开优化向量运算
   - 预计算常用值（如范数）
   - 避免在距离函数中进行复杂计算

2. **类型安全**: 
   - 确保距离函数返回正确的数值类型
   - 验证距离函数的数学性质（对称性、自反性）

3. **性能考虑**: 
   - 对于复杂对象，考虑使用缓存机制
   - 避免在距离函数中创建大量临时对象

4. **应用场景**: 
   - **向量搜索**: 使用标准版API
   - **字符串搜索**: 使用编辑距离、Jaccard距离等
   - **图节点搜索**: 使用图距离函数
   - **自定义对象**: 根据业务需求定义距离函数

## ⚠️ 限制说明

### 当前限制

#### 标准版限制
1. **向量维度**: 所有向量必须具有相同维度
2. **数据类型**: 仅支持number[]类型的向量
3. **距离度量**: 仅支持余弦距离和L2距离
4. **内存使用**: 大规模数据集需要足够内存
5. **并发安全**: 当前版本不支持并发操作

#### 泛型版限制
1. **距离函数性能**: 自定义距离函数可能影响搜索性能
2. **类型一致性**: 所有插入和搜索的项目类型必须一致
3. **距离函数要求**: 必须满足对称性和自反性
4. **内存使用**: 复杂对象可能增加内存占用
5. **并发安全**: 当前版本不支持并发操作

### 性能限制

- **构建时间**: 大规模数据集构建时间较长
- **内存占用**: 索引会占用额外内存存储图结构
- **搜索精度**: 近似搜索，不保证100%召回率

## 🔧 开发

### 安装依赖

```bash
pnpm install
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并监听变化
pnpm test:watch

# 运行基准测试
pnpm bench

# 生成覆盖率报告
pnpm test:coverage
```

### 构建

```bash
# 构建项目
pnpm build

# 开发模式构建
pnpm dev
```

## 📊 基准测试

项目包含完整的基准测试套件，对比HNSWLib等主流实现：

```bash
# 运行性能基准测试
pnpm bench
```

基准测试包括：
- 索引构建性能
- 搜索性能
- 召回率测试
- 内存使用分析

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 运行测试确保通过
5. 提交Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 📝 更新日志

### 1.0.0
- 🎉 初始版本发布
- ⚡ 高性能HNSW算法实现
- 🎯 支持余弦距离和L2距离
- 🔧 支持插入、搜索、删除操作
- 📦 完整的TypeScript支持
- 🧪 全面的测试覆盖
- 📊 性能基准测试套件

## 🔗 相关链接

- [GitHub Repository](https://github.com/leolee9086/hnsw)
- [Issue Tracker](https://github.com/leolee9086/hnsw/issues)
- [HNSW论文](https://arxiv.org/abs/1603.09320) 