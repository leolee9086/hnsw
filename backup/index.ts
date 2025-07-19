import TinyQueue from 'tinyqueue';

interface HNSWConfig {
  M: number;
  efConstruction: number;
  metricType: 'cosine' | 'l2';
}

interface Neighbor {
  idx: number;
  distance: number;
}

export interface HNSWIndex {
  insertNode: (vector: number[]) => void;
  search: (queryVector: number[], k: number, efSearch?: number) => Neighbor[];
  getStats: () => { nodeCount: number; entryPoint: { idx: number; level: number } };
}

export function createHNSWIndex(config: HNSWConfig): HNSWIndex {
  const { M, efConstruction, metricType } = config;

  // --- 数据存储 ---
  // 使用最直接、最高效的数据结构
  const vectors: number[][] = [];
  const norms: number[] = [];
  const neighbors: number[][][] = []; // [nodeId][level] -> [neighborId, ...]
  const entryPoint = { idx: -1, level: -1 };

  // --- 性能优化组件 ---
  // 在构造时分配，避免重复创建
  let visited: Uint8Array | null = null;
  const maxNodes = 10000; // 预设最大容量
  visited = new Uint8Array(maxNodes);

  // --- 核心算法 ---

  /**
   * 优化的距离计算函数 - 计算两个已存在节点之间的距离
   * - 使用预计算的范数
   * - 循环展开以提升JIT效率
   */
  function distance(idxA: number, idxB: number): number {
    const vecA = vectors[idxA]!;
    const vecB = vectors[idxB]!;
    const normA = norms[idxA]!;
    const normB = norms[idxB]!;
    const len = vecA.length;

    if (metricType === 'l2') {
      let d = 0;
      for (let j = 0; j < len; j++) {
        const diff = vecA[j]! - vecB[j]!;
        d += diff * diff;
      }
      return d;
    }

    // Default to cosine distance
    let dotProduct = 0;
    let i = 0;

    // 循环展开 (手动SIMD)
    for (; i < len - 3; i += 4) {
      dotProduct +=
        vecA[i]! * vecB[i]! +
        vecA[i + 1]! * vecB[i + 1]! +
        vecA[i + 2]! * vecB[i + 2]! +
        vecA[i + 3]! * vecB[i + 3]!;
    }

    // 处理剩余部分
    for (; i < len; i++) {
      dotProduct += vecA[i]! * vecB[i]!;
    }
    
    return (normA === 0 || normB === 0) ? 1.0 : 1.0 - dotProduct / (normA * normB);
  }

  /**
   * 优化的距离计算函数 - 支持查询向量到目标节点
   */
  function distanceToQuery(queryVector: number[], queryNorm: number, targetIdx: number): number {
    const targetVector = vectors[targetIdx]!;
    const targetNorm = norms[targetIdx]!;
    const len = queryVector.length;

    if (metricType === 'l2') {
      let d = 0;
      for (let j = 0; j < len; j++) {
        const diff = queryVector[j]! - targetVector[j]!;
        d += diff * diff;
      }
      return d;
    }

    // Default to cosine distance
    let dotProduct = 0;
    let i = 0;

    // 循环展开 (手动SIMD)
    for (; i < len - 3; i += 4) {
      dotProduct +=
        queryVector[i]! * targetVector[i]! +
        queryVector[i + 1]! * targetVector[i + 1]! +
        queryVector[i + 2]! * targetVector[i + 2]! +
        queryVector[i + 3]! * targetVector[i + 3]!;
    }

    // 处理剩余部分
    for (; i < len; i++) {
      dotProduct += queryVector[i]! * targetVector[i]!;
    }
    
    return (queryNorm === 0 || targetNorm === 0) ? 1.0 : 1.0 - dotProduct / (queryNorm * targetNorm);
  }

  /**
   * 在指定层级上搜索最近的 ef 个邻居 - 支持查询向量
   */
  function searchLayerWithQuery(
    queryVector: number[],
    queryNorm: number,
    startNodeIdx: number,
    level: number,
    ef: number
  ): Neighbor[] {
    if (!visited) throw new Error("Visited set not initialized");
    visited.fill(0);

    // candidates 是最小堆 (距离小的优先)，用于探索
    const candidates = new TinyQueue<Neighbor>([], (a, b) => a.distance - b.distance);
    // results 是最大堆 (距离大的优先)，用于保存最佳结果并剪枝
    const results = new TinyQueue<Neighbor>([], (a, b) => b.distance - a.distance);

    const startNodeDist = distanceToQuery(queryVector, queryNorm, startNodeIdx);
    visited[startNodeIdx] = 1;
    candidates.push({ idx: startNodeIdx, distance: startNodeDist });
    results.push({ idx: startNodeIdx, distance: startNodeDist });

    while (candidates.length > 0) {
      // @织: BUG修复 - 先peek再pop，避免过早剪枝
      const bestCandidate = candidates.peek()!;
      const farthestResult = results.peek();

      if (farthestResult && bestCandidate.distance > farthestResult.distance) {
        break; // 正确的剪枝
      }
      const cand = candidates.pop()!; // 确认后再pop

      const nodeNeighbors = neighbors[cand.idx]?.[level] || [];
      for (const neighborIdx of nodeNeighbors) {
        if (visited[neighborIdx] === 0) {
          visited[neighborIdx] = 1;
          const dist = distanceToQuery(queryVector, queryNorm, neighborIdx);
          const currentFarthest = results.peek();
          if (!currentFarthest || results.length < ef || dist < currentFarthest.distance) {
            candidates.push({ idx: neighborIdx, distance: dist });
            results.push({ idx: neighborIdx, distance: dist });
            if (results.length > ef) {
              results.pop();
            }
          }
        }
      }
    }
    
    // TinyQueue to sorted array
    const finalResults: Neighbor[] = [];
    while(results.length > 0) {
        finalResults.push(results.pop()!);
    }
    return finalResults.reverse();
  }

  /**
   * 通过启发式方法选择邻居 (来自Current版本的核心逻辑)
   * 这是保证图连接多样性、避免陷入局部最优的关键
   */
  function getNeighborsByHeuristic(candidates: Neighbor[], M: number): Neighbor[] {
    if (candidates.length <= M) {
      return candidates;
    }

    const result: Neighbor[] = [];
    const visited = new Set<number>();

    for (const cand of candidates) {
      if (result.length >= M) break;
      if (visited.has(cand.idx)) continue;
      
      let good = true;
      for (const res of result) {
        if (distance(cand.idx, res.idx) < cand.distance) {
          good = false;
          break;
        }
      }

      if (good) {
        result.push(cand);
        visited.add(cand.idx);
      }
    }
    return result;
  }

  /**
   * 连接新节点和它的邻居 - 已修复
   */
  function connectNeighbors(nodeIdx: number, level: number, nearestNeighbors: Neighbor[]) {
    // @织: BUG修复 - 应用启发式算法选择M个最多样化的邻居
    const selectedNeighbors = getNeighborsByHeuristic(nearestNeighbors, M);
    neighbors[nodeIdx]![level] = selectedNeighbors.map(n => n.idx);

    for (const neighbor of selectedNeighbors) { // @织: BUG修复 - 只连接被选中的邻居
        
        // 确保邻居列表存在
        if (!Array.isArray(neighbors[neighbor.idx])) {
            neighbors[neighbor.idx] = [];
        }
        if (!Array.isArray(neighbors[neighbor.idx]![level])) {
            neighbors[neighbor.idx]![level] = [];
        }

        neighbors[neighbor.idx]![level]!.push(nodeIdx);

        // 如果邻居的连接数超过M，则进行修剪
        if (neighbors[neighbor.idx]![level]!.length > M) {
            const connections = neighbors[neighbor.idx]![level]!.map(connIdx => ({
                idx: connIdx,
                distance: distance(neighbor.idx, connIdx)
            }));
            connections.sort((a, b) => a.distance - b.distance);
            neighbors[neighbor.idx]![level] = connections.slice(0, M).map(c => c.idx);
        }
    }
  }


  // --- 公共 API ---

  function insertNode(vector: number[]) {
    const newNodeIdx = vectors.length;
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
        norm += vector[i]! * vector[i]!;
    }
    norm = Math.sqrt(norm);

    vectors.push(vector);
    norms.push(norm);
    neighbors.push([]);

    if (entryPoint.idx === -1) {
      entryPoint.idx = newNodeIdx;
      entryPoint.level = 0;
      neighbors[newNodeIdx]![0] = [];
      return;
    }
    
    // 🎯 确定性层级分配函数 - 与原版本完全相同
    function assignLevelDeterministic(arrayIndex: number, maxLevels: number): number {
      const internalId = arrayIndex + 1;
      const lowestBit = internalId & -internalId;
      const level = 31 - Math.clz32(lowestBit);
      return Math.min(level, maxLevels - 1);
    }

    // 确定新节点的最高层级 - 使用确定性算法
    const max_level = 16; // 与Current HNSW保持一致
    const randomLevel = assignLevelDeterministic(newNodeIdx, max_level);
    const topLevel = entryPoint.level;
    
    let currentNodeIdx = entryPoint.idx;
    
    // 从顶层向下搜索
    for (let level = topLevel; level > randomLevel; level--) {
        const results = searchLayerWithQuery(vector, norm, currentNodeIdx, level, 1);
        currentNodeIdx = results[0]!.idx;
    }

    // 在每一层连接邻居
    for (let level = Math.min(randomLevel, topLevel); level >= 0; level--) {
        const nearestCandidates = searchLayerWithQuery(vector, norm, currentNodeIdx, level, efConstruction);
        
        // @织: BUG修复 - 确保即使候选者少于M个也能正确处理
        const M_level = level === 0 ? M * 2 : M;
        const selectedNeighbors = getNeighborsByHeuristic(nearestCandidates, M_level);

        connectNeighbors(newNodeIdx, level, selectedNeighbors);

        // @织: BUG修复 - 从已选出的、最多样化的邻居中选择下一层的入口点
        currentNodeIdx = selectedNeighbors[0]!.idx; 
    }
    
    // 如果新节点的层级更高，则更新入口点
    if (randomLevel > topLevel) {
        entryPoint.idx = newNodeIdx;
        entryPoint.level = randomLevel;
    }
  }

  function search(queryVector: number[], k: number, efSearch?: number) {
    // @织: BUG修复 - 避免修改全局数组，直接计算查询向量的范数
    let queryNorm = 0;
    for (let i = 0; i < queryVector.length; i++) {
        queryNorm += queryVector[i]! * queryVector[i]!;
    }
    queryNorm = Math.sqrt(queryNorm);

    if (entryPoint.idx === -1) return [];

    let currentNodeIdx = entryPoint.idx;
    const topLevel = entryPoint.level;
    
    // @织: 使用新的searchLayerWithQuery函数
    for (let level = topLevel; level > 0; level--) {
        const results = searchLayerWithQuery(queryVector, queryNorm, currentNodeIdx, level, 1);
        currentNodeIdx = results[0]!.idx;
    }
    
    const finalEf = Math.max(k, efSearch || efConstruction);
    const finalResults = searchLayerWithQuery(queryVector, queryNorm, currentNodeIdx, 0, finalEf);

    return finalResults.slice(0, k);
  }

  return {
    insertNode,
    search,
    getStats: () => ({
        nodeCount: vectors.length,
        entryPoint: { ...entryPoint }
    }),
  };
} 