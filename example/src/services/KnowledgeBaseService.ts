/**
 * 知识库管理服务
 * 负责知识库的创建、管理和索引维护
 */
import { hnsw } from '@leolee9086/hnsw';
import { createStorageService, StorageService } from './StorageService';
import { createOfflineEmbeddingProvider, OfflineEmbeddingService } from './OfflineEmbeddingService';
import { processFileContent, isSupportedFile } from '../utils/fileProcessor';
import type { 
  KnowledgeBase, 
  Document, 
  Chunk, 
  KnowledgeBaseIndex,
  SearchResult,
  SearchOptions,
  FileProcessResult
} from '../types/knowledge-base';

/**
 * 知识库管理服务类
 */
export class KnowledgeBaseService {
  private storageService: StorageService;
  private indexes: Map<string, KnowledgeBaseIndex> = new Map();
  private embedder: OfflineEmbeddingService | null = null;

  constructor() {
    this.storageService = createStorageService();
  }

  /**
   * 初始化嵌入模型
   */
  async initializeEmbedder(modelName: string): Promise<void> {
    try {
      this.embedder = createOfflineEmbeddingProvider(modelName);
      await this.embedder.loadModel();
      console.log('嵌入模型初始化完成:', modelName);
    } catch (error) {
      console.error('嵌入模型初始化失败:', error);
      this.embedder = null;
    }
  }

  /**
   * 创建知识库
   */
  async createKnowledgeBase(
    name: string, 
    description: string, 
    settings?: any
  ): Promise<KnowledgeBase> {
    const knowledgeBase = await this.storageService.createKnowledgeBase(name, description, settings);
    
    // 初始化索引
    await this.initializeIndex(knowledgeBase.id);
    
    return knowledgeBase;
  }

  /**
   * 更新知识库
   */
  async updateKnowledgeBase(
    id: string, 
    updates: Partial<KnowledgeBase>
  ): Promise<KnowledgeBase | null> {
    return await this.storageService.updateKnowledgeBase(id, updates);
  }

  /**
   * 删除知识库
   */
  async deleteKnowledgeBase(id: string): Promise<boolean> {
    // 清理索引
    this.indexes.delete(id);
    
    return await this.storageService.deleteKnowledgeBase(id);
  }

  /**
   * 重建知识库索引
   */
  async rebuildIndex(knowledgeBaseId: string): Promise<boolean> {
    try {
      // 删除现有索引
      this.indexes.delete(knowledgeBaseId);
      
      // 重新初始化索引
      await this.initializeIndex(knowledgeBaseId);
      
      console.log(`知识库索引重建完成: ${knowledgeBaseId}`);
      return true;
    } catch (error) {
      console.error('重建索引失败:', error);
      return false;
    }
  }

  /**
   * 获取知识库列表
   */
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    const knowledgeBases = await this.storageService.getKnowledgeBases();
    
    // 确保所有知识库的索引都已初始化
    for (const kb of knowledgeBases) {
      if (!this.indexes.has(kb.id)) {
        try {
          await this.initializeIndex(kb.id);
        } catch (error) {
          console.warn(`知识库索引初始化失败: ${kb.name} (${kb.id})`, error);
        }
      }
    }
    
    return knowledgeBases;
  }

  /**
   * 根据ID获取知识库
   */
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    return await this.storageService.getKnowledgeBase(id);
  }

  /**
   * 获取知识库调试信息
   */
  async getKnowledgeBaseDebugInfo(knowledgeBaseId: string): Promise<{
    chunksCount: number;
    documentsCount: number;
    vectorChunksCount: number;
  }> {
    const chunks = await this.storageService.getChunks(knowledgeBaseId);
    const documents = await this.storageService.getDocuments(knowledgeBaseId);
    const vectorChunks = chunks.filter(chunk => chunk.vector && chunk.vector.length > 0);
    
    return {
      chunksCount: chunks.length,
      documentsCount: documents.length,
      vectorChunksCount: vectorChunks.length
    };
  }

  /**
   * 获取知识库分块数据
   */
  async getKnowledgeBaseChunks(knowledgeBaseId: string): Promise<any[]> {
    return await this.storageService.getChunks(knowledgeBaseId);
  }

  /**
   * 初始化知识库索引
   */
  private async initializeIndex(knowledgeBaseId: string): Promise<void> {
    const knowledgeBase = await this.storageService.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) return;

    // 创建文本索引（使用编辑距离）
    const stringDistance = (a: string, b: string): number => {
      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      
      for (let i = 0; i <= a.length; i++) {
        matrix[0]![i] = i;
      }
      
      for (let j = 0; j <= b.length; j++) {
        matrix[j]![0] = j;
      }
      
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j]![i] = Math.min(
            matrix[j]![i - 1]! + 1, // 删除
            matrix[j - 1]![i]! + 1, // 插入
            matrix[j - 1]![i - 1]! + indicator // 替换
          );
        }
      }
      
      // 归一化到 [0,1]
      const maxLength = Math.max(a.length, b.length);
      return maxLength === 0 ? 0 : matrix[b.length]![a.length]! / maxLength;
    };

    const textIndex = hnsw.createIndexGeneric({
      M: 16,
      efConstruction: 200,
      distanceFunction: stringDistance
    });

    // 创建向量索引
    const vectorIndex = hnsw.createIndex({
      M: 16,
      efConstruction: 200,
      metricType: 'cosine'
    });

    // 加载现有分块到索引
    const chunks = await this.storageService.getChunks(knowledgeBaseId);
    console.log(`知识库 ${knowledgeBase.name} 有 ${chunks.length} 个分块`);
    
    for (const chunk of chunks) {
      textIndex.insertNode(chunk.text);
      if (chunk.vector && chunk.vector.length > 0) {
        vectorIndex.insertNode(chunk.vector);
      }
    }

    this.indexes.set(knowledgeBaseId, {
      knowledgeBaseId,
      textIndex,
      vectorIndex,
      isInitialized: true,
      lastUpdated: new Date()
    });

    console.log(`知识库索引初始化完成: ${knowledgeBase.name} (${chunks.length} 个分块)`);
  }

  /**
   * 处理文件并添加到知识库
   */
  async processFile(
    knowledgeBaseId: string, 
    file: File
  ): Promise<FileProcessResult> {
    const startTime = performance.now();

    try {
      // 检查文件是否支持
      if (!isSupportedFile(file.name)) {
        throw new Error(`不支持的文件格式: ${file.name}`);
      }

      // 确保索引已初始化
      if (!this.indexes.has(knowledgeBaseId)) {
        await this.initializeIndex(knowledgeBaseId);
      }

      // 处理文件内容
      const processedFile = await processFileContent(file);
      
      // 添加到文档存储
      const document = await this.storageService.addDocument(
        knowledgeBaseId,
        file.name,
        processedFile.metadata.fileType,
        file.size,
        processedFile.content,
        processedFile.metadata
      );

      // 文本分块
      const chunks = this.chunkText(
        processedFile.content, 
        knowledgeBaseId,
        document.id
      );

      // 向量化分块
      const vectorizedChunks = await this.vectorizeChunks(chunks);

      // 保存分块
      await this.storageService.addChunks(vectorizedChunks);

      // 更新索引
      await this.updateIndex(knowledgeBaseId, vectorizedChunks);

      const processingTime = performance.now() - startTime;

      return {
        document,
        chunks: vectorizedChunks,
        processingTime,
        success: true
      };

    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        document: null as any,
        chunks: [],
        processingTime,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 文本分块
   */
  private chunkText(text: string, knowledgeBaseId: string, documentId: string): Omit<Chunk, 'id' | 'vector' | 'createdAt'>[] {
    // 确保索引已初始化
    if (!this.indexes.has(knowledgeBaseId)) {
      console.warn(`知识库索引未初始化: ${knowledgeBaseId}`);
      return [];
    }

    const chunks: Omit<Chunk, 'id' | 'vector' | 'createdAt'>[] = [];
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startIndex = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 200) {
        if (currentChunk) {
                     chunks.push({
             documentId,
             knowledgeBaseId,
             text: currentChunk.trim(),
             metadata: {
               startIndex,
               endIndex: startIndex + currentChunk.length,
               chunkIndex,
               length: currentChunk.length,
               embeddingModel: 'Xenova/all-MiniLM-L6-v2'
             }
           });
          chunkIndex++;
          startIndex += currentChunk.length;
          currentChunk = '';
        }
        // 如果单个句子就超过200字符，强制分割
        if (sentence.length > 200) {
          for (let i = 0; i < sentence.length; i += 200) {
            const chunkText = sentence.slice(i, i + 200);
                         chunks.push({
               documentId,
               knowledgeBaseId,
               text: chunkText,
               metadata: {
                 startIndex: startIndex + i,
                 endIndex: startIndex + i + chunkText.length,
                 chunkIndex,
                 length: chunkText.length,
                 embeddingModel: 'Xenova/all-MiniLM-L6-v2'
               }
             });
            chunkIndex++;
          }
          startIndex += sentence.length;
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence + '。';
      }
    }
    
    if (currentChunk) {
      chunks.push({
        documentId,
        knowledgeBaseId,
        text: currentChunk.trim(),
        metadata: {
          startIndex,
          endIndex: startIndex + currentChunk.length,
          chunkIndex,
          length: currentChunk.length,
          embeddingModel: 'Xenova/all-MiniLM-L6-v2'
        }
      });
    }
    
    return chunks;
  }

  /**
   * 向量化分块
   */
  private async vectorizeChunks(
    chunks: Omit<Chunk, 'id' | 'vector' | 'createdAt'>[]
  ): Promise<Chunk[]> {
    const vectorizedChunks: Chunk[] = [];

    // 确保嵌入模型已初始化
    if (!this.embedder) {
      console.warn('嵌入模型未初始化，尝试初始化...');
      try {
        await this.initializeEmbedder('Xenova/all-MiniLM-L6-v2');
      } catch (error) {
        console.error('嵌入模型初始化失败:', error);
      }
    }

    for (const chunk of chunks) {
      const chunkId = this.generateId();
      let vector: number[] = [];
      
      if (this.embedder) {
        try {
          vector = await this.embedder.embedContent(chunk.text);
          console.log(`向量化分块: ${chunk.text.substring(0, 50)}... -> 向量长度: ${vector.length}`);
        } catch (error) {
          console.error('向量化分块失败:', error);
        }
      } else {
        console.warn('嵌入模型未初始化，跳过向量化');
      }

      vectorizedChunks.push({
        ...chunk,
        id: chunkId,
        vector,
        createdAt: new Date()
      });
    }

    return vectorizedChunks;
  }

  /**
   * 更新索引
   */
  private async updateIndex(knowledgeBaseId: string, chunks: Chunk[]): Promise<void> {
    const index = this.indexes.get(knowledgeBaseId);
    if (!index) return;

    for (const chunk of chunks) {
      // 添加到文本索引
      index.textIndex.insertNode(chunk.text);
      
      // 添加到向量索引
      if (chunk.vector && chunk.vector.length > 0) {
        index.vectorIndex.insertNode(chunk.vector);
      }
    }

    index.lastUpdated = new Date();
  }

  /**
   * 搜索
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { 
      query, 
      knowledgeBaseId, 
      type, 
      limit, 
      threshold = 0.5,
      enableFuzzySearch = false,
      sortBy = 'score',
      showAllResults = false,
      showLowQualityResults = true
    } = options;

    const results: SearchResult[] = [];

    if (knowledgeBaseId) {
      // 搜索特定知识库
      let index = this.indexes.get(knowledgeBaseId);
      if (!index) {
        console.warn(`知识库索引未初始化: ${knowledgeBaseId}，尝试初始化...`);
        try {
          await this.initializeIndex(knowledgeBaseId);
          index = this.indexes.get(knowledgeBaseId);
          if (!index) {
            console.error(`索引初始化失败: ${knowledgeBaseId}`);
            return [];
          }
        } catch (error) {
          console.error(`索引初始化失败: ${knowledgeBaseId}`, error);
          return [];
        }
      }

      const chunks = await this.storageService.getChunks(knowledgeBaseId);
      const documents = await this.storageService.getDocuments(knowledgeBaseId);

      console.log(`搜索知识库 ${knowledgeBaseId}:`, {
        chunksCount: chunks.length,
        documentsCount: documents.length,
        query,
        type
      });

      if (type === 'text' || type === 'both') {
        try {
          // 如果启用模糊搜索，调整搜索参数
          const searchLimit = enableFuzzySearch ? limit * 2 : limit;
          const searchThreshold = enableFuzzySearch ? threshold * 1.5 : threshold;
          
          const textResults = index.textIndex.search(query, searchLimit);
          console.log('文本搜索结果:', textResults.length);
          
          for (const result of textResults) {
            const chunk = chunks[result.idx];
            const effectiveThreshold = enableFuzzySearch ? searchThreshold : threshold;
            console.log(`文本搜索结果: distance=${result.distance}, threshold=${effectiveThreshold}, passed=${result.distance <= effectiveThreshold}`);
            
            // 简化显示逻辑：如果启用显示所有结果，或者结果距离小于阈值，就显示
            const shouldShow = showAllResults || result.distance <= effectiveThreshold;
            
            if (chunk && shouldShow) {
              const document = documents.find(d => d.id === chunk.documentId);
              if (document) {
                // 如果启用模糊搜索，调整分数
                let adjustedScore = 1 - result.distance;
                if (enableFuzzySearch && result.distance > threshold) {
                  adjustedScore *= 0.8; // 降低模糊匹配的分数
                }
                
                results.push({
                  chunk,
                  document,
                  distance: result.distance,
                  score: adjustedScore,
                  type: 'text'
                });
              }
            }
          }
        } catch (error) {
          console.error('文本搜索失败:', error);
        }
      }

      if (type === 'vector' || type === 'both') {
        if (this.embedder) {
          try {
            console.log('开始向量搜索...');
            const queryVector = await this.embedder.embedContent(query);
            console.log(`查询向量长度: ${queryVector.length}`);
            
            const vectorResults = index.vectorIndex.search(queryVector, limit);
            console.log('向量搜索结果:', vectorResults.length);
            
            for (const result of vectorResults) {
              const chunk = chunks[result.idx];
              console.log(`向量搜索结果: distance=${result.distance}, threshold=${threshold}, passed=${result.distance <= threshold}`);
              
              // 简化显示逻辑：如果启用显示所有结果，或者结果距离小于阈值，就显示
              const shouldShow = showAllResults || result.distance <= threshold;
              
              if (chunk && shouldShow) {
                const document = documents.find(d => d.id === chunk.documentId);
                if (document) {
                  console.log(`添加向量搜索结果: ${chunk.text.substring(0, 50)}...`);
                  results.push({
                    chunk,
                    document,
                    distance: result.distance,
                    score: 1 - result.distance, // 转换为相似度分数
                    type: 'vector'
                  });
                }
              }
            }
          } catch (error) {
            console.error('向量搜索失败:', error);
          }
        } else {
          console.warn('嵌入模型未初始化，跳过向量搜索');
        }
      }
    } else {
      // 搜索所有知识库
      const knowledgeBases = await this.storageService.getKnowledgeBases();
      console.log('搜索所有知识库:', knowledgeBases.length);
      
      for (const kb of knowledgeBases) {
        const kbResults = await this.search({
          ...options,
          knowledgeBaseId: kb.id
        });
        results.push(...kbResults);
      }
    }

    console.log('最终搜索结果:', results.length);
    
    // 按分数排序并去重
    const uniqueResults = this.deduplicateResults(results);
    
    // 根据排序方式排序
    const sortedResults = uniqueResults.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'relevance':
          // 相关性排序：结合分数和文本长度
          const relevanceA = a.score * (1 + Math.log(a.chunk.text.length));
          const relevanceB = b.score * (1 + Math.log(b.chunk.text.length));
          return relevanceB - relevanceA;
        case 'date':
          // 按创建日期排序
          return new Date(b.chunk.createdAt).getTime() - new Date(a.chunk.createdAt).getTime();
        default:
          return b.score - a.score;
      }
    });
    
    return sortedResults.slice(0, limit);
  }

  /**
   * 去重搜索结果
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.chunk.id}-${result.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const document = await this.storageService.getDocuments(documentId);
    if (!document || document.length === 0) return false;

    const doc = document[0]!;
    // const chunks = await this.storageService.getDocumentChunks(documentId);

    // 从索引中移除
    const index = this.indexes.get(doc.knowledgeBaseId);
    if (index) {
      // 注意：HNSW索引不支持删除，这里只是从存储中移除
      // 实际应用中可能需要重建索引
    }

    return await this.storageService.deleteDocument(documentId);
  }

  /**
   * 获取知识库的文档列表
   */
  async getDocuments(knowledgeBaseId: string): Promise<Document[]> {
    return await this.storageService.getDocuments(knowledgeBaseId);
  }

  /**
   * 导出数据
   */
  async exportData(): Promise<any> {
    return await this.storageService.exportData();
  }

  /**
   * 导入数据
   */
  async importData(data: any): Promise<void> {
    await this.storageService.importData(data);
    
    // 重新初始化所有知识库的索引
    const knowledgeBases = await this.storageService.getKnowledgeBases();
    for (const kb of knowledgeBases) {
      await this.initializeIndex(kb.id);
    }
  }

  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    this.indexes.clear();
    await this.storageService.clearAllData();
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * 创建知识库服务实例
 */
export const createKnowledgeBaseService = (): KnowledgeBaseService => {
  return new KnowledgeBaseService();
}; 