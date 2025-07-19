/**
 * 确定性优化HNSW vs HNSWLib 基准测试 - 1K数据专项测试
 * 
 * 🎯 基准测试目标:
 * 1. 1K数据集上的HNSW索引构建性能
 * 2. 1K数据集上的HNSW查询性能 
 * 3. 召回率测试
 * 4. 与HNSWLib的性能对比
 */

import { describe, bench, expect } from 'vitest';
import { hnsw } from '../src';
const createHNSWIndex = hnsw.createIndex;

// 尝试导入hnswlib，如果失败则跳过对比测试
let HnswLib: any = null;
let HierarchicalNSW: any = null;
let hnswlibAvailable = false;

try {
  HnswLib = require('hnswlib-node');
  HierarchicalNSW = HnswLib.HierarchicalNSW;
  hnswlibAvailable = true;
  console.log('✅ HNSWLib加载成功，将进行对比测试');
} catch (error) {
  console.log(error);
  console.log('⚠️  HNSWLib未安装，仅测试我们的实现');
  hnswlibAvailable = false;
}

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

// 计算余弦距离
function cosineDistance(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!;
    normA += vecA[i]! * vecA[i]!;
    normB += vecB[i]! * vecB[i]!;
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
  metricType: 'cosine' as const,
  maxLevels: 16
};

// 使用原始的高召回率配置
const SEARCH_CONFIG = {
  efSearch: 200  // 恢复到原始配置，获得100%召回率
};

// ================================
// 全局预构建索引 - 避免在基准测试中重复构建
// ================================

// 构建用于查询性能测试的预构建索引
let globalHnswIndex: any = null;
let globalHnswlibIndex: any = null;

function ensureIndicesBuilt() {
  if (!globalHnswIndex) {
    console.log('🔧 构建全局HNSW索引...');
    globalHnswIndex = createHNSWIndex(CONFIG);
    for (const vector of DATA_1K) {
      globalHnswIndex.insertNode(vector);
    }
    console.log('✅ 全局HNSW索引构建完成，节点数量:', globalHnswIndex.getStats().nodeCount);
  }

  if (hnswlibAvailable && !globalHnswlibIndex) {
    console.log('🔧 构建全局HNSWLib索引...');
    globalHnswlibIndex = new HierarchicalNSW('cosine', 128);
    globalHnswlibIndex.initIndex(1000, CONFIG.M, CONFIG.efConstruction);
    
    for (let i = 0; i < DATA_1K.length; i++) {
      globalHnswlibIndex.addPoint(DATA_1K[i]!, i);
    }
    globalHnswlibIndex.setEf(200);
    console.log('✅ 全局HNSWLib索引构建完成');
    
    // 🔍 调试：测试单次查询看返回结果结构
    try {
      const testResult = globalHnswlibIndex.searchKnn(QUERY_VECTORS[0]!, 3);
      console.log('🔍 HNSWLib searchKnn返回结果结构:', testResult);
      console.log('🔍 HNSWLib searchKnn返回结果类型:', typeof testResult);
      if (testResult && typeof testResult === 'object') {
        console.log('🔍 HNSWLib searchKnn返回结果键值:', Object.keys(testResult));
      }
    } catch (error) {
      console.error('❌ HNSWLib searchKnn调用失败:', error);
    }
  }
}

// ================================
// 索引构建性能对比
// ================================

describe('索引构建性能对比', () => {
  
  bench('HNSW构建 - 1K数据', () => {
    const index = createHNSWIndex(CONFIG);
    for (const vector of DATA_1K) {
      index.insertNode(vector);
    }
  });

  if (hnswlibAvailable) {
    bench('HNSWLib构建 - 1K数据', () => {
      const index = new HierarchicalNSW('cosine', 128);
      index.initIndex(1000, CONFIG.M, CONFIG.efConstruction);
      
      for (let i = 0; i < DATA_1K.length; i++) {
        index.addPoint(DATA_1K[i]!, i);
      }
    });
  }
});

// ================================
// 批量查询性能对比
// ================================

describe('批量查询性能对比', () => {
  
  bench('HNSW批量查询 - 100次查询(K=10)', () => {
    ensureIndicesBuilt(); // 确保索引已构建
    for (const query of QUERY_VECTORS) {
      globalHnswIndex.search(query, 10, SEARCH_CONFIG.efSearch);
    }
  });

  if (hnswlibAvailable) {
    bench('HNSWLib批量查询 - 100次查询(K=10)', () => {
      ensureIndicesBuilt(); // 确保索引已构建
      for (const query of QUERY_VECTORS) {
        try {
          globalHnswlibIndex.searchKnn(query, 10);
        } catch (error) {
          console.error('❌ HNSWLib查询失败:', error);
          throw error;
        }
      }
    });
  }
});

// ================================
// 单次查询性能对比
// ================================

describe('单次查询性能对比', () => {

  bench('HNSW单次查询 - K=10', () => {
    ensureIndicesBuilt(); // 确保索引已构建
    globalHnswIndex.search(QUERY_VECTORS[0]!, 10, SEARCH_CONFIG.efSearch);
  });

  if (hnswlibAvailable) {
    bench('HNSWLib单次查询 - K=10', () => {
      ensureIndicesBuilt(); // 确保索引已构建
      if (!globalHnswlibIndex) {
        console.error('❌ globalHnswlibIndex未初始化');
        throw new Error('globalHnswlibIndex未初始化');
      }
      try {
        globalHnswlibIndex.searchKnn(QUERY_VECTORS[0]!, 10);
      } catch (error) {
        console.error('❌ HNSWLib单次查询失败:', error);
        throw error;
      }
    });
  }
});

// ================================
// 召回率基准测试 - 衡量召回率计算的平均性能
// ================================

describe('召回率基准测试', () => {
  let hnswRecallResults: number[] = [];
  let hnswlibRecallResults: number[] = [];

  bench('HNSW召回率测试 - K=10 (10次查询)',
    () => {
      ensureIndicesBuilt(); // 确保索引已构建
      const querySubset = QUERY_VECTORS.slice(0, 10); // 取前10个查询
      let totalRecall = 0;

      for (const query of querySubset) {
        // 暴力搜索获取真实答案
        const trueNeighbors = bruteForceSearch(query, DATA_1K, 10);
        
        // HNSW搜索结果
        const hnswResults = globalHnswIndex.search(query, 10, SEARCH_CONFIG.efSearch);
        const hnswIndices = hnswResults.map((r: any) => r.idx);
        
        // 计算召回率
        const recall = calculateRecall(trueNeighbors, hnswIndices);
        totalRecall += recall;
      }

      const avgRecall = totalRecall / querySubset.length;
      hnswRecallResults.push(avgRecall);
      
      // 确保召回率合理
      if (avgRecall < 0.8) {
        throw new Error(`HNSW召回率过低: ${(avgRecall * 100).toFixed(2)}%`);
      }
    },
    {
      setup: () => {
        hnswRecallResults = [];
      },
      teardown: () => {
        if (hnswRecallResults.length > 0) {
          const overallAvgRecall = hnswRecallResults.reduce((sum, r) => sum + r, 0) / hnswRecallResults.length;
          console.log(`\n🎯 HNSW 平均召回率: ${(overallAvgRecall * 100).toFixed(2)}% (基于 ${hnswRecallResults.length} 次采样)`);
        }
      }
    }
  );

  if (hnswlibAvailable) {
    bench('HNSWLib召回率测试 - K=10 (10次查询)',
      () => {
        ensureIndicesBuilt(); // 确保索引已构建
        const querySubset = QUERY_VECTORS.slice(0, 10);
        let totalRecall = 0;

        for (const query of querySubset) {
          // 暴力搜索获取真实答案
          const trueNeighbors = bruteForceSearch(query, DATA_1K, 10);
          
          // HNSWLib搜索结果
          if (!globalHnswlibIndex) {
            throw new Error('globalHnswlibIndex未初始化');
          }
          
          const hnswlibResults = globalHnswlibIndex.searchKnn(query, 10);
          
          let hnswlibIndices: number[];
          if (hnswlibResults && hnswlibResults.neighbors) {
            hnswlibIndices = hnswlibResults.neighbors;
          } else if (Array.isArray(hnswlibResults)) {
            hnswlibIndices = hnswlibResults;
          } else {
            throw new Error('无法解析HNSWLib搜索结果结构');
          }
          
          const recall = calculateRecall(trueNeighbors, hnswlibIndices);
          totalRecall += recall;
        }

        const avgRecall = totalRecall / querySubset.length;
        hnswlibRecallResults.push(avgRecall);
        
        if (avgRecall < 0.8) {
          throw new Error(`HNSWLib召回率过低: ${(avgRecall * 100).toFixed(2)}%`);
        }
      },
      {
        setup: () => {
          hnswlibRecallResults = [];
        },
        teardown: () => {
          if (hnswlibRecallResults.length > 0) {
            const overallAvgRecall = hnswlibRecallResults.reduce((sum, r) => sum + r, 0) / hnswlibRecallResults.length;
            console.log(`🎯 HNSWLib 平均召回率: ${(overallAvgRecall * 100).toFixed(2)}% (基于 ${hnswlibRecallResults.length} 次采样)`);
          }
        }
      }
    );
  }
});

/**
 * 🎯 基准测试使用说明:
 * 
 * 运行基准测试:
 * ```bash
 * pnpm test bench/hnsw-vs-hnswlib-benchmark.bench.ts
 * ```
 * 
 * 预期性能指标 (1K数据集):
 * - 构建性能: ~5-20ms 
 * - 批量查询性能: ~10-50ms (100次查询)
 * - 单次查询性能: ~0.1-1ms/查询 (efSearch=200)
 * - 召回率: >90% (K=10, efSearch=200)
 * - QPS: >1000 
 * 
 * 对比指标:
 * - 我们的HNSW vs HNSWLib构建性能
 * - 我们的HNSW vs HNSWLib批量查询性能
 * - 我们的HNSW vs HNSWLib单次查询性能  
 * - 两者的召回率对比
 * 
 * 🔧 修复内容:
 * - 修复了导入路径问题
 * - 添加了hnswlib-node依赖
 * - 修复了TypeScript类型错误
 * - 确保基准测试的准确性和可重复性
 * - 统一在基准测试模式下运行所有性能测试
 */ 