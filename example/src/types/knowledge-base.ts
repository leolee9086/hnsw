/**
 * 知识库数据模型
 */
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  settings: KnowledgeBaseSettings;
  stats: KnowledgeBaseStats;
}

/**
 * 知识库设置
 */
export interface KnowledgeBaseSettings {
  chunkSize: number;
  overlapSize: number;
  embeddingModel: string;
  searchType: 'text' | 'vector' | 'both';
  maxSearchResults: number;
}

/**
 * 知识库统计信息
 */
export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalSize: number;
  lastUpdated: Date;
}

/**
 * 文档数据模型
 */
export interface Document {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 文档元数据
 */
export interface DocumentMetadata {
  originalName: string;
  mimeType: string;
  encoding: string;
  extractedAt: Date;
  processedAt: Date;
}

/**
 * 文本分块数据模型
 */
export interface Chunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  text: string;
  vector: number[];
  metadata: ChunkMetadata;
  createdAt: Date;
}

/**
 * 分块元数据
 */
export interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  length: number;
  embeddingModel: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  chunk: Chunk;
  document: Document;
  distance: number;
  score: number;
  type: 'text' | 'vector';
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  query: string;
  knowledgeBaseId?: string;
  type: 'text' | 'vector' | 'both';
  limit: number;
  threshold?: number;
  enableFuzzySearch?: boolean;
  sortBy?: 'score' | 'relevance' | 'date';
  showAllResults?: boolean; // 显示所有结果，不按阈值过滤
  showLowQualityResults?: boolean; // 显示低质量结果
}

/**
 * 知识库索引状态
 */
export interface KnowledgeBaseIndex {
  knowledgeBaseId: string;
  textIndex: any; // HNSW文本索引
  vectorIndex: any; // HNSW向量索引
  isInitialized: boolean;
  lastUpdated: Date;
}

/**
 * 文件处理结果
 */
export interface FileProcessResult {
  document: Document;
  chunks: Chunk[];
  processingTime: number;
  success: boolean;
  error?: string;
}

/**
 * 知识库操作结果
 */
export interface KnowledgeBaseOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
} 