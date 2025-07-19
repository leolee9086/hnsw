/**
 * 泛型版本 vs 向量版本 HNSW 基准测试 - 1K数据专项测试
 * 
 * 🎯 基准测试目标:
 * 1. 1K数据集上的索引构建性能对比
 * 2. 1K数据集上的查询性能对比 
 * 3. 召回率测试对比
 * 4. 删除功能性能对比
 * 5. 内存使用对比
 */

import { describe, bench, expect } from 'vitest';
import { hnsw } from '../src';
const createHNSWIndex = hnsw.createIndex;
const createHNSWIndexGeneric = hnsw.createIndexGeneric;

// 生成测试数据
function generateVectors(count: number, dimensions: number = 128, seed?: number): number[][] {
  let seedValue = seed || 12345;
  let rng = () => {
    const x = Math.sin(seedValue++) * 1000;
    return x - Math.floor(x);
  };

  const vectors: number[][] = [];
  for (let i = 0; i < count; i++) {
    const vector: number[] = [];
    for (let j = 0; j < dimensions; j++) {
      vector.push(rng() * 2 - 1);
    }
    vectors.push(vector);
  }
  return vectors;
}

// 归一化向量
function normalizeVector(vector: number[]): number[] {
  let norm = 0;
  for (const val of vector) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  
  if (norm === 0) return vector;
  
  return vector.map(val => val / norm);
}

// 余弦距离函数 - 标准版本
function cosineDistance(a: number[], b: number[]): number {
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
}

// 余弦距离函数 - 优化版本（循环展开）
function cosineDistanceOptimized(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let i = 0;
  
  // 循环展开优化
  for (; i < a.length - 3; i += 4) {
    dotProduct += a[i]! * b[i]! + a[i + 1]! * b[i + 1]! + a[i + 2]! * b[i + 2]! + a[i + 3]! * b[i + 3]!;
    normA += a[i]! * a[i]! + a[i + 1]! * a[i + 1]! + a[i + 2]! * a[i + 2]! + a[i + 3]! * a[i + 3]!;
    normB += b[i]! * b[i]! + b[i + 1]! * b[i + 1]! + b[i + 2]! * b[i + 2]! + b[i + 3]! * b[i + 3]!;
  }
  
  // 处理剩余部分
  for (; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 1.0;
  return 1.0 - dotProduct / (normA * normB);
}

// 计算召回率
function calculateRecall(trueNeighbors: number[], searchResults: number[]): number {
  const trueSet = new Set(trueNeighbors);
  let matches = 0;
  
  for (const result of searchResults) {
    if (trueSet.has(result)) {
      matches++;
    }
  }
  
  return matches / trueNeighbors.length;
}

// 暴力搜索获取真实最近邻（用于召回率基准）
function bruteForceSearch(queryVector: number[], dataset: number[][], k: number): number[] {
  const distances = dataset.map((vector, idx) => ({
    idx,
    distance: cosineDistance(queryVector, vector)
  }));
  
  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, k).map(d => d.idx);
}

// 1K数据集和查询向量
const DATA_1K = generateVectors(1000, 128, 33333).map(normalizeVector);
const QUERY_VECTORS = generateVectors(100, 128, 44444).map(normalizeVector);

const CONFIG = {
  M: 16,
  efConstruction: 200,
  metricType: 'cosine' as const
};

const GENERIC_CONFIG = {
  M: 16,
  efConstruction: 200,
  distanceFunction: cosineDistance
};

const GENERIC_OPTIMIZED_CONFIG = {
  M: 16,
  efConstruction: 200,
  distanceFunction: cosineDistanceOptimized
};

// 使用高召回率配置
const SEARCH_CONFIG = {
  efSearch: 200
};

// ================================
// 全局预构建索引 - 避免在基准测试中重复构建
// ================================

let globalVectorIndex: any = null;
let globalGenericIndex: any = null;
let globalGenericOptimizedIndex: any = null;

function ensureIndicesBuilt() {
  if (!globalVectorIndex) {
    console.log('🔧 构建全局向量版本HNSW索引...');
    globalVectorIndex = createHNSWIndex(CONFIG);
    for (const vector of DATA_1K) {
      globalVectorIndex.insertNode(vector);
    }
    console.log('✅ 全局向量版本HNSW索引构建完成，节点数量:', globalVectorIndex.getStats().nodeCount);
  }

  if (!globalGenericIndex) {
    console.log('🔧 构建全局泛型版本HNSW索引...');
    globalGenericIndex = createGenericHNSWIndex(GENERIC_CONFIG);
    for (const vector of DATA_1K) {
      globalGenericIndex.insertNode(vector);
    }
    console.log('✅ 全局泛型版本HNSW索引构建完成，节点数量:', globalGenericIndex.getStats().nodeCount);
  }

  if (!globalGenericOptimizedIndex) {
    console.log('🔧 构建全局优化泛型版本HNSW索引...');
    globalGenericOptimizedIndex = createGenericHNSWIndex(GENERIC_OPTIMIZED_CONFIG);
    for (const vector of DATA_1K) {
      globalGenericOptimizedIndex.insertNode(vector);
    }
    console.log('✅ 全局优化泛型版本HNSW索引构建完成，节点数量:', globalGenericOptimizedIndex.getStats().nodeCount);
  }
}

// ================================
// 索引构建性能对比
// ================================

describe('索引构建性能对比', () => {
  
  bench('向量版本构建 - 1K数据', () => {
    const index = createHNSWIndex(CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
  });

  bench('泛型版本构建 - 1K数据', () => {
    const index = createGenericHNSWIndex(GENERIC_CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
  });

  bench('优化泛型版本构建 - 1K数据', () => {
    const index = createGenericHNSWIndex(GENERIC_OPTIMIZED_CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
  });
});

// ================================
// 批量查询性能对比
// ================================

describe('批量查询性能对比', () => {
  
  bench('向量版本批量查询 - 100次查询(K=10)', () => {
    ensureIndicesBuilt();
    for (const query of QUERY_VECTORS) {
      globalVectorIndex.search(query, 10, SEARCH_CONFIG.efSearch);
    }
  });

  bench('泛型版本批量查询 - 100次查询(K=10)', () => {
    ensureIndicesBuilt();
    for (const query of QUERY_VECTORS) {
      globalGenericIndex.search(query, 10, SEARCH_CONFIG.efSearch);
    }
  });

  bench('优化泛型版本批量查询 - 100次查询(K=10)', () => {
    ensureIndicesBuilt();
    for (const query of QUERY_VECTORS) {
      globalGenericOptimizedIndex.search(query, 10, SEARCH_CONFIG.efSearch);
    }
  });
});

// ================================
// 单次查询性能对比
// ================================

describe('单次查询性能对比', () => {

  bench('向量版本单次查询 - K=10', () => {
    ensureIndicesBuilt();
    globalVectorIndex.search(QUERY_VECTORS[0]!, 10, SEARCH_CONFIG.efSearch);
  });

  bench('泛型版本单次查询 - K=10', () => {
    ensureIndicesBuilt();
    globalGenericIndex.search(QUERY_VECTORS[0]!, 10, SEARCH_CONFIG.efSearch);
  });

  bench('优化泛型版本单次查询 - K=10', () => {
    ensureIndicesBuilt();
    globalGenericOptimizedIndex.search(QUERY_VECTORS[0]!, 10, SEARCH_CONFIG.efSearch);
  });
});

// ================================
// 召回率对比测试
// ================================

describe('召回率对比测试', () => {
  let vectorRecallResults: number[] = [];
  let genericRecallResults: number[] = [];
  let genericOptimizedRecallResults: number[] = [];

  bench('向量版本召回率测试 - K=10 (10次查询)',
    () => {
      ensureIndicesBuilt();
      const querySubset = QUERY_VECTORS.slice(0, 10);
      let totalRecall = 0;

      for (const query of querySubset) {
        const trueNeighbors = bruteForceSearch(query, DATA_1K, 10);
        const searchResults = globalVectorIndex.search(query, 10, SEARCH_CONFIG.efSearch);
        const resultIndices = searchResults.map((r: any) => r.idx);
        const recall = calculateRecall(trueNeighbors, resultIndices);
        totalRecall += recall;
      }

      const avgRecall = totalRecall / querySubset.length;
      vectorRecallResults.push(avgRecall);
      
      if (avgRecall < 0.8) {
        throw new Error(`向量版本召回率过低: ${(avgRecall * 100).toFixed(2)}%`);
      }
    },
    {
      setup: () => {
        vectorRecallResults = [];
      },
      teardown: () => {
        if (vectorRecallResults.length > 0) {
          const overallAvgRecall = vectorRecallResults.reduce((sum, r) => sum + r, 0) / vectorRecallResults.length;
          console.log(`🎯 向量版本 平均召回率: ${(overallAvgRecall * 100).toFixed(2)}% (基于 ${vectorRecallResults.length} 次采样)`);
        }
      }
    }
  );

  bench('泛型版本召回率测试 - K=10 (10次查询)',
    () => {
      ensureIndicesBuilt();
      const querySubset = QUERY_VECTORS.slice(0, 10);
      let totalRecall = 0;

      for (const query of querySubset) {
        const trueNeighbors = bruteForceSearch(query, DATA_1K, 10);
        const searchResults = globalGenericIndex.search(query, 10, SEARCH_CONFIG.efSearch);
        const resultIndices = searchResults.map((r: any) => r.idx);
        const recall = calculateRecall(trueNeighbors, resultIndices);
        totalRecall += recall;
      }

      const avgRecall = totalRecall / querySubset.length;
      genericRecallResults.push(avgRecall);
      
      if (avgRecall < 0.8) {
        throw new Error(`泛型版本召回率过低: ${(avgRecall * 100).toFixed(2)}%`);
      }
    },
    {
      setup: () => {
        genericRecallResults = [];
      },
      teardown: () => {
        if (genericRecallResults.length > 0) {
          const overallAvgRecall = genericRecallResults.reduce((sum, r) => sum + r, 0) / genericRecallResults.length;
          console.log(`🎯 泛型版本 平均召回率: ${(overallAvgRecall * 100).toFixed(2)}% (基于 ${genericRecallResults.length} 次采样)`);
        }
      }
    }
  );

  bench('优化泛型版本召回率测试 - K=10 (10次查询)',
    () => {
      ensureIndicesBuilt();
      const querySubset = QUERY_VECTORS.slice(0, 10);
      let totalRecall = 0;

      for (const query of querySubset) {
        const trueNeighbors = bruteForceSearch(query, DATA_1K, 10);
        const searchResults = globalGenericOptimizedIndex.search(query, 10, SEARCH_CONFIG.efSearch);
        const resultIndices = searchResults.map((r: any) => r.idx);
        const recall = calculateRecall(trueNeighbors, resultIndices);
        totalRecall += recall;
      }

      const avgRecall = totalRecall / querySubset.length;
      genericOptimizedRecallResults.push(avgRecall);
      
      if (avgRecall < 0.8) {
        throw new Error(`优化泛型版本召回率过低: ${(avgRecall * 100).toFixed(2)}%`);
      }
    },
    {
      setup: () => {
        genericOptimizedRecallResults = [];
      },
      teardown: () => {
        if (genericOptimizedRecallResults.length > 0) {
          const overallAvgRecall = genericOptimizedRecallResults.reduce((sum, r) => sum + r, 0) / genericOptimizedRecallResults.length;
          console.log(`🎯 优化泛型版本 平均召回率: ${(overallAvgRecall * 100).toFixed(2)}% (基于 ${genericOptimizedRecallResults.length} 次采样)`);
        }
      }
    }
  );
});

// ================================
// 删除功能性能对比
// ================================

describe('删除功能性能对比', () => {
  
  bench('向量版本删除性能 - 删除100个节点', () => {
    const index = createHNSWIndex(CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
    
    // 删除前100个节点
    for (let i = 0; i < 100; i++) {
      index.deleteNode(i);
    }
  });

  bench('泛型版本删除性能 - 删除100个节点', () => {
    const index = createGenericHNSWIndex(GENERIC_CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
    
    // 删除前100个节点
    for (let i = 0; i < 100; i++) {
      index.deleteNode(i);
    }
  });

  bench('优化泛型版本删除性能 - 删除100个节点', () => {
    const index = createGenericHNSWIndex(GENERIC_OPTIMIZED_CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
    
    // 删除前100个节点
    for (let i = 0; i < 100; i++) {
      index.deleteNode(i);
    }
  });
});

// ================================
// 内存使用对比
// ================================

describe('内存使用对比', () => {
  
  bench('向量版本内存使用 - 1K数据', () => {
    const index = createHNSWIndex(CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
    const stats = index.getStats();
    // 这里可以添加内存使用统计
  });

  bench('泛型版本内存使用 - 1K数据', () => {
    const index = createGenericHNSWIndex(GENERIC_CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
    const stats = index.getStats();
    // 这里可以添加内存使用统计
  });

  bench('优化泛型版本内存使用 - 1K数据', () => {
    const index = createGenericHNSWIndex(GENERIC_OPTIMIZED_CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
    const stats = index.getStats();
    // 这里可以添加内存使用统计
  });
});

/**
 * 🎯 基准测试使用说明:
 * 
 * 运行基准测试:
 * ```bash
 * pnpm bench bench/generic-vs-vector-benchmark.bench.ts
 * ```
 * 
 * 预期性能指标 (1K数据集):
 * - 构建性能: 向量版本 > 优化泛型版本 > 泛型版本
 * - 查询性能: 向量版本 ≈ 优化泛型版本 > 泛型版本
 * - 召回率: 所有版本都应该 >90% (K=10, efSearch=200)
 * - 删除性能: 所有版本都应该很快 (软删除)
 * 
 * 对比指标:
 * - 向量版本 vs 泛型版本 vs 优化泛型版本的构建性能
 * - 向量版本 vs 泛型版本 vs 优化泛型版本的查询性能
 * - 三种版本的召回率对比
 * - 三种版本的删除性能对比
 * - 三种版本的内存使用对比
 */ 