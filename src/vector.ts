import { BinaryHeapGeneric } from './binary-heap';
import { MidiHeapGeneric } from './midi-heap';

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
  deleteNode: (nodeIdx: number) => boolean;
  getStats: () => { 
    nodeCount: number; 
    activeNodeCount: number;
    deletedNodeCount: number;
    entryPoint: { idx: number; level: number } 
  };
}

export function createHNSWIndex(config: HNSWConfig): HNSWIndex {
  const { M, efConstruction, metricType } = config;

  // --- 数据存储 ---
  // 使用最直接、最高效的数据结构
  const vectors: number[][] = [];
  const norms: number[] = [];
  const neighbors: number[][][] = []; // [nodeId][level] -> [neighborId, ...]
  const entryPoint = { idx: -1, level: -1 };

  // --- 删除功能相关数据结构 ---
  const deletedNodes: Set<number> = new Set();
  const nodeToLevels: Map<number, number> = new Map(); // 记录每个节点的最高层级

  // --- 性能优化组件 ---
  // 在构造时分配，避免重复创建
  let visited: Uint8Array | null = null;
  const maxNodes = 10000; // 预设最大容量
  visited = new Uint8Array(maxNodes);

  // --- 核心算法 ---

  /**
   * 检查节点是否有效（未被删除）
   */
  function isValidNode(idx: number): boolean {
    return idx >= 0 && idx < vectors.length && !deletedNodes.has(idx);
  }

  /**
   * 优化的距离计算函数 - 计算两个已存在节点之间的距离
   * - 使用预计算的范数
   * - 循环展开以提升JIT效率
   */
  function distance(idxA: number, idxB: number): number {
    // 检查节点有效性
    if (!isValidNode(idxA) || !isValidNode(idxB)) {
      return Infinity; // 无效节点返回无穷大距离
    }

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
    // 检查目标节点有效性
    if (!isValidNode(targetIdx)) {
      return Infinity; // 无效节点返回无穷大距离
    }

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
   * 在指定层级上搜索最近的 ef 个邻居 - 使用优化的堆算法
   * @织: 关键优化 - 使用MidiHeap处理有界结果集，用BinaryHeap处理无界候选集
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

    // 检查起始节点有效性
    if (!isValidNode(startNodeIdx)) {
      return []; // 如果起始节点无效，返回空结果
    }

    // @织: 性能优化 - 使用动态二叉堆处理大小不定的候选集
    const candidates = new BinaryHeapGeneric<Neighbor>([], (a, b) => a.distance - b.distance);
    // @织: 性能优化 - 使用固定容量的MidiHeap处理Top-K结果集，性能更高
    const results = new MidiHeapGeneric<Neighbor>(ef, (a, b) => b.distance - a.distance);

    const startNodeDist = distanceToQuery(queryVector, queryNorm, startNodeIdx);
    visited[startNodeIdx] = 1;
    candidates.push({ idx: startNodeIdx, distance: startNodeDist });
    results.push({ idx: startNodeIdx, distance: startNodeDist });

    while (candidates.length > 0) {
      const bestCandidate = candidates.peek()!;
      const farthestResult = results.peek();

      // @织: MidiHeap优化 - 剪枝逻辑更清晰
      if (farthestResult && bestCandidate.distance > farthestResult.distance && results.isFull()) {
        break; 
      }
      const cand = candidates.pop()!;

      const nodeNeighbors = neighbors[cand.idx]?.[level] || [];
      for (const neighborIdx of nodeNeighbors) {
        // 只处理有效的邻居节点
        if (visited[neighborIdx] === 0 && isValidNode(neighborIdx)) {
          visited[neighborIdx] = 1;
          const dist = distanceToQuery(queryVector, queryNorm, neighborIdx);
          const currentFarthest = results.peek();
          
          // @织: MidiHeap优化 - 使用isFull和replace API，效率更高
          if (!currentFarthest || !results.isFull() || dist < currentFarthest.distance) {
            candidates.push({ idx: neighborIdx, distance: dist });

            if (!results.isFull()) {
            results.push({ idx: neighborIdx, distance: dist });
            } else {
                results.replace({ idx: neighborIdx, distance: dist });
            }
          }
        }
      }
    }
    
    // @织: MidiHeap优化 - toSortedArray 直接返回有序数组
    return results.toSortedArray().reverse();
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
    // @织: 此处逻辑较复杂，暂时保持原样，未来可进一步优化
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
   * 从邻居列表中移除指定节点
   */
  function removeNodeFromNeighbors(nodeIdx: number) {
    // 遍历所有节点，从它们的邻居列表中移除被删除的节点
    for (let i = 0; i < neighbors.length; i++) {
      if (!isValidNode(i)) continue; // 跳过已删除的节点
      
      const nodeNeighbors = neighbors[i];
      if (!nodeNeighbors) continue;
      
      for (let level = 0; level < nodeNeighbors.length; level++) {
        const levelNeighbors = nodeNeighbors[level];
        if (!levelNeighbors) continue;
        
        // 过滤掉被删除的节点
        nodeNeighbors[level] = levelNeighbors.filter(neighborIdx => neighborIdx !== nodeIdx);
      }
    }
  }

  /**
   * 重新选择入口点
   */
  function reselectEntryPoint() {
    let newEntryPoint = { idx: -1, level: -1 };
    
    // 找到层级最高的有效节点作为新入口点
    for (let i = 0; i < vectors.length; i++) {
      if (!isValidNode(i)) continue;
      
      const nodeLevel = nodeToLevels.get(i) || 0;
      if (nodeLevel > newEntryPoint.level) {
        newEntryPoint = { idx: i, level: nodeLevel };
      }
    }
    
    // 如果没有找到有效节点，重置入口点
    if (newEntryPoint.idx === -1) {
      entryPoint.idx = -1;
      entryPoint.level = -1;
    } else {
      entryPoint.idx = newEntryPoint.idx;
      entryPoint.level = newEntryPoint.level;
    }
  }

  /**
   * 连接新节点和它的邻居 - 已修复
   * @织: 性能优化 - 在邻居修剪时使用MidiHeap代替排序，性能更佳
   * @织: BUG修复 - 正确处理底层（level 0）的 M*2 连接数限制
   */
  function connectNeighbors(nodeIdx: number, level: number, nearestNeighbors: Neighbor[]) {
    // @织: BUG修复 - 根据层级使用正确的最大连接数：底层M*2，其他层M
    const maxConnections = level === 0 ? M * 2 : M;
    
    // @织: BUG修复 - 应用启发式算法选择最多样化的邻居
    const selectedNeighbors = getNeighborsByHeuristic(nearestNeighbors, maxConnections);
    neighbors[nodeIdx]![level] = selectedNeighbors.map(n => n.idx);

    for (const neighbor of selectedNeighbors) { // @织: BUG修复 - 只连接被选中的邻居
        
        if (!Array.isArray(neighbors[neighbor.idx])) {
            neighbors[neighbor.idx] = [];
        }
        if (!Array.isArray(neighbors[neighbor.idx]![level])) {
            neighbors[neighbor.idx]![level] = [];
        }

        neighbors[neighbor.idx]![level]!.push(nodeIdx);

        // @织: MidiHeap优化 + BUG修复 - 使用层级对应的最大连接数进行修剪
        if (neighbors[neighbor.idx]![level]!.length > maxConnections) {
            const connections = neighbors[neighbor.idx]![level]!;
            
            // 使用MidiHeap选出Top-maxConnections最近的邻居
            const heap = new MidiHeapGeneric<Neighbor>(maxConnections, (a, b) => b.distance - a.distance);

            for(const connIdx of connections) {
                const dist = distance(neighbor.idx, connIdx);
                const connNode = { idx: connIdx, distance: dist };

                if (!heap.isFull()) {
                    heap.push(connNode);
                } else if (dist < heap.peek()!.distance) {
                    heap.replace(connNode);
                }
            }
            neighbors[neighbor.idx]![level] = heap.toArray().map(c => c.idx);
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
      nodeToLevels.set(newNodeIdx, 0);
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
    
    // 记录节点的最高层级
    nodeToLevels.set(newNodeIdx, randomLevel);
    
    let currentNodeIdx = entryPoint.idx;
    
    // 从顶层向下搜索
    for (let level = topLevel; level > randomLevel; level--) {
        const results = searchLayerWithQuery(vector, norm, currentNodeIdx, level, 1);
        if (results.length > 0) {
          currentNodeIdx = results[0]!.idx;
        }
    }

    // 在每一层连接邻居
    for (let level = Math.min(randomLevel, topLevel); level >= 0; level--) {
        const nearestCandidates = searchLayerWithQuery(vector, norm, currentNodeIdx, level, efConstruction);
        
        // @织: BUG修复 - 确保即使候选者少于M个也能正确处理
        const M_level = level === 0 ? M * 2 : M;
        const selectedNeighbors = getNeighborsByHeuristic(nearestCandidates, M_level);

        connectNeighbors(newNodeIdx, level, selectedNeighbors);

        // @织: BUG修复 - 从已选出的、最多样化的邻居中选择下一层的入口点
        if (selectedNeighbors.length > 0) {
          currentNodeIdx = selectedNeighbors[0]!.idx; 
        }
    }
    
    // 如果新节点的层级更高，则更新入口点
    if (randomLevel > topLevel) {
        entryPoint.idx = newNodeIdx;
        entryPoint.level = randomLevel;
    }
  }

  function deleteNode(nodeIdx: number): boolean {
    // 检查节点是否存在且有效
    if (nodeIdx < 0 || nodeIdx >= vectors.length || deletedNodes.has(nodeIdx)) {
      return false; // 节点不存在或已被删除
    }

    // 标记节点为已删除
    deletedNodes.add(nodeIdx);

    // 从所有邻居的连接中移除该节点
    removeNodeFromNeighbors(nodeIdx);

    // 如果删除的是入口点，需要重新选择入口点
    if (nodeIdx === entryPoint.idx) {
      reselectEntryPoint();
    }

    return true;
  }

  function search(queryVector: number[], k: number, efSearch?: number) {
    // @织: BUG修复 - 避免修改全局数组，直接计算查询向量的范数
    let queryNorm = 0;
    for (let i = 0; i < queryVector.length; i++) {
        queryNorm += queryVector[i]! * queryVector[i]!;
    }
    queryNorm = Math.sqrt(queryNorm);

    if (entryPoint.idx === -1 || !isValidNode(entryPoint.idx)) return [];

    let currentNodeIdx = entryPoint.idx;
    const topLevel = entryPoint.level;
    
    // @织: 使用新的searchLayerWithQuery函数
    for (let level = topLevel; level > 0; level--) {
        const results = searchLayerWithQuery(queryVector, queryNorm, currentNodeIdx, level, 1);
        if (results.length > 0) {
          currentNodeIdx = results[0]!.idx;
        } else {
          // 如果当前层级没有找到有效结果，尝试重新选择入口点
          reselectEntryPoint();
          if (entryPoint.idx === -1) return [];
          currentNodeIdx = entryPoint.idx;
          break;
        }
    }
    
    const finalEf = Math.max(k, efSearch || efConstruction);
    const finalResults = searchLayerWithQuery(queryVector, queryNorm, currentNodeIdx, 0, finalEf);

    return finalResults.slice(0, k);
  }

  return {
    insertNode,
    search,
    deleteNode,
    getStats: () => ({
        nodeCount: vectors.length,
        activeNodeCount: vectors.length - deletedNodes.size,
        deletedNodeCount: deletedNodes.size,
        entryPoint: { ...entryPoint }
    }),
  };
}

/**
 * 性能优化总结：
 * 
 * 🚀 主要优化点：
 * 1. MidiHeapGeneric 引入 - 针对HNSW中固定大小（ef, M）的集合进行终极优化。
 * 2. 混合堆策略 - 对大小不定的候选集使用BinaryHeap，对Top-K结果集使用MidiHeap，实现最佳平衡。
 * 3. 高效剪枝 - 在邻居连接阶段使用MidiHeap代替Array.sort，显著降低CPU开销。
 * 4. 删除功能 - 软删除方案，保持高性能的同时支持节点删除。
 * 
 * 📊 预期性能提升：
 * - 搜索操作：显著提升，MidiHeap在小数据集上的性能优势是数量级的。
 * - 插入操作：显著提升，connectNeighbors是插入时的热点之一。
 * - 删除操作：O(1)删除状态检查，软删除避免复杂图重构。
 * 
 * 🎯 适用场景：
 * - 追求极致低延迟的在线查询服务。
 * - 需要快速构建索引的离线任务。
 * - 需要支持动态删除的应用场景。
 */

// 导出泛型版本
export * from './generic';