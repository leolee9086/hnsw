/**
 * VectorIndex 基础类型定义
 */

export type Vector = number[] | Float32Array;

export interface Neighbor {
  idx: number;
  distance: number;
}

export interface HNSWNode {
  id: number | string | null;
  data?: any;
  vector: Float32Array;
  len?: number;
  level?: number;
  norm?: number; // @织: 预计算的L2范数
}

export interface HNSWState {
  cur_level: number;
  root_id: number;
  max_item: number;
  // @织: 扩展HNSW状态以支持新实现
  entryPoint?: number | null;
  maxLevel?: number;
  vectorNorms?: Map<number, number>;
}

export interface OptimizedNeighborStore {
  getNeighbor(id: number, level: number): Uint32Array;
  addNeighbor(id: number, level: number, neighborId: number): void;
  removeNeighbor(id: number, level: number, neighborId: number): void;
  hasNeighbor(id: number, level: number, neighborId: number): boolean;
  getNeighborCount(id: number, level: number): number;
  clear(): void;
}

export type DistanceFunction = (a: Vector, b: Vector) => number;

export interface VamanaConfig {
  dimensions: number;
  L: number;    // 搜索时的beam size
  R: number;    // 最大出度
  alpha: number; // RobustPrune参数
  distanceFunction?: DistanceFunction;
}

export interface SearchResult {
  id: number | string;
  distance: number;
  data?: Vector;
}

export interface VamanaIndex {
  add(id: number | string, vector: Vector): void;
  search(query: Vector, k: number): SearchResult[];
  size(): number;
  clear(): void;
}

// @织: 新增HNSW相关类型定义

export interface HNSWConfig {
  M?: number;
  m?: number; // 旧格式支持
  efConstruction?: number;
  efSearch?: number;
  ml?: number;
  metricType?: number;
  distanceFunction?: string; // 旧格式支持
  customDistanceFunction?: (a: any, b: any) => number;
  dimension?: number | null;
  maxElements?: number;
}

export interface DistanceCache {
  getCachedDistance: (id1: number, id2: number, getDistanceFromId: (id1: number, id2: number) => number) => number;
  clearCache: () => void;
  getCacheSize?: () => number; // @织: 可选的缓存大小查询
}

export interface SearchParams {
  ef?: number;
}

export interface NodeData {
  [key: string]: any;
}

export interface HNSWIndex {
  insertNode: (vector: Vector, data?: NodeData) => number;
  searchKNN: (queryVector: Vector, k?: number, searchParams?: SearchParams) => SearchResult[];
  setEfSearch: (newEfSearch: number) => void;
  getEfSearch: () => number;
  removeNode: (id: number) => boolean;
  getNode: (id: number) => { id: number; data: any; vector: Float32Array | null } | null;
  getStats: () => {
    nodeCount: number;
    maxLevel: number;
    entryPoint: number | null;
    cacheSize: number;
  };
  getNodeConnections: (id: number) => {
    [level: number]: number[];
  };
} 