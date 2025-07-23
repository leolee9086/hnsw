/**
 * 基于LokiJS的存储服务
 * 负责知识库数据的持久化存储和管理
 */
import Loki from 'lokijs';
import type { 
  KnowledgeBase, 
  Document, 
  Chunk, 
  KnowledgeBaseSettings,
  KnowledgeBaseStats 
} from '../types/knowledge-base';

/**
 * 存储服务类
 */
export class StorageService {
  private db: Loki;
  private knowledgeBases!: Collection<KnowledgeBase>;
  private documents!: Collection<Document>;
  private chunks!: Collection<Chunk>;
  private isInitialized: boolean = false;

  constructor() {
    this.db = new Loki('knowledge-bases.db', {
      autoload: true,
      autoloadCallback: this.initializeCollections.bind(this),
      autosave: true,
      autosaveInterval: 5000
    });
  }

  /**
   * 初始化数据库集合
   */
  private initializeCollections(): void {
    // 创建知识库集合
    this.knowledgeBases = this.db.getCollection('knowledgeBases');
    if (!this.knowledgeBases) {
      this.knowledgeBases = this.db.addCollection('knowledgeBases', {
        indices: ['id', 'name']
      });
    }

    // 创建文档集合
    this.documents = this.db.getCollection('documents');
    if (!this.documents) {
      this.documents = this.db.addCollection('documents', {
        indices: ['id', 'knowledgeBaseId', 'fileName']
      });
    }

    // 创建分块集合
    this.chunks = this.db.getCollection('chunks');
    if (!this.chunks) {
      this.chunks = this.db.addCollection('chunks', {
        indices: ['id', 'documentId', 'knowledgeBaseId']
      });
    }

    this.isInitialized = true;
    console.log('存储服务初始化完成');
  }

  /**
   * 等待初始化完成
   */
  private async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;
    
    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInit, 100);
        }
      };
      checkInit();
    });
  }

  /**
   * 创建知识库
   */
  async createKnowledgeBase(
    name: string, 
    description: string, 
    settings?: Partial<KnowledgeBaseSettings>
  ): Promise<KnowledgeBase> {
    await this.waitForInitialization();

    const defaultSettings: KnowledgeBaseSettings = {
      chunkSize: 200,
      overlapSize: 50,
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      searchType: 'both',
      maxSearchResults: 10
    };

    const knowledgeBase: KnowledgeBase = {
      id: this.generateId(),
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: { ...defaultSettings, ...settings },
      stats: {
        totalDocuments: 0,
        totalChunks: 0,
        totalSize: 0,
        lastUpdated: new Date()
      }
    };

    this.knowledgeBases.insert(knowledgeBase);
    return knowledgeBase;
  }

  /**
   * 更新知识库
   */
  async updateKnowledgeBase(
    id: string, 
    updates: Partial<KnowledgeBase>
  ): Promise<KnowledgeBase | null> {
    await this.waitForInitialization();

    const knowledgeBase = this.knowledgeBases.findOne({ id });
    if (!knowledgeBase) return null;

    const updated = { ...knowledgeBase, ...updates, updatedAt: new Date() };
    this.knowledgeBases.update(updated);
    return updated;
  }

  /**
   * 删除知识库
   */
  async deleteKnowledgeBase(id: string): Promise<boolean> {
    await this.waitForInitialization();

    // 删除知识库
    const knowledgeBase = this.knowledgeBases.findOne({ id });
    if (!knowledgeBase) return false;

    // 删除相关文档
    const documents = this.documents.find({ knowledgeBaseId: id });
    documents.forEach(doc => {
      this.documents.remove(doc);
    });

    // 删除相关分块
    const chunks = this.chunks.find({ knowledgeBaseId: id });
    chunks.forEach(chunk => {
      this.chunks.remove(chunk);
    });

    // 删除知识库
    this.knowledgeBases.remove(knowledgeBase);
    return true;
  }

  /**
   * 获取知识库列表
   */
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    await this.waitForInitialization();
    return this.knowledgeBases.find();
  }

  /**
   * 根据ID获取知识库
   */
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    await this.waitForInitialization();
    return this.knowledgeBases.findOne({ id });
  }

  /**
   * 添加文档到知识库
   */
  async addDocument(
    knowledgeBaseId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    content: string,
    metadata: any
  ): Promise<Document> {
    await this.waitForInitialization();

    const document: Document = {
      id: this.generateId(),
      knowledgeBaseId,
      fileName,
      fileType,
      fileSize,
      content,
      metadata: {
        originalName: fileName,
        mimeType: fileType,
        encoding: 'utf-8',
        extractedAt: new Date(),
        processedAt: new Date(),
        ...metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.documents.insert(document);
    await this.updateKnowledgeBaseStats(knowledgeBaseId);
    return document;
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    await this.waitForInitialization();

    const document = this.documents.findOne({ id: documentId });
    if (!document) return false;

    // 删除相关分块
    const chunks = this.chunks.find({ documentId });
    chunks.forEach(chunk => {
      this.chunks.remove(chunk);
    });

    // 删除文档
    this.documents.remove(document);
    await this.updateKnowledgeBaseStats(document.knowledgeBaseId);
    return true;
  }

  /**
   * 获取知识库的文档列表
   */
  async getDocuments(knowledgeBaseId: string): Promise<Document[]> {
    await this.waitForInitialization();
    return this.documents.find({ knowledgeBaseId });
  }

  /**
   * 添加分块
   */
  async addChunks(chunks: Chunk[]): Promise<void> {
    await this.waitForInitialization();
    
    chunks.forEach(chunk => {
      this.chunks.insert(chunk);
    });

    // 更新知识库统计信息
    if (chunks.length > 0) {
      await this.updateKnowledgeBaseStats(chunks[0]!.knowledgeBaseId);
    }
  }

  /**
   * 获取知识库的分块
   */
  async getChunks(knowledgeBaseId: string): Promise<Chunk[]> {
    await this.waitForInitialization();
    return this.chunks.find({ knowledgeBaseId });
  }

  /**
   * 获取文档的分块
   */
  async getDocumentChunks(documentId: string): Promise<Chunk[]> {
    await this.waitForInitialization();
    return this.chunks.find({ documentId });
  }

  /**
   * 更新知识库统计信息
   */
  private async updateKnowledgeBaseStats(knowledgeBaseId: string): Promise<void> {
    const documents = this.documents.find({ knowledgeBaseId });
    const chunks = this.chunks.find({ knowledgeBaseId });
    
    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
    
    const stats: KnowledgeBaseStats = {
      totalDocuments: documents.length,
      totalChunks: chunks.length,
      totalSize,
      lastUpdated: new Date()
    };

    await this.updateKnowledgeBase(knowledgeBaseId, { stats });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 导出数据
   */
  async exportData(): Promise<any> {
    await this.waitForInitialization();
    
    return {
      knowledgeBases: this.knowledgeBases.find(),
      documents: this.documents.find(),
      chunks: this.chunks.find(),
      exportedAt: new Date()
    };
  }

  /**
   * 导入数据
   */
  async importData(data: any): Promise<void> {
    await this.waitForInitialization();
    
    // 清空现有数据
    this.knowledgeBases.clear();
    this.documents.clear();
    this.chunks.clear();
    
    // 导入新数据
    if (data.knowledgeBases) {
      data.knowledgeBases.forEach((kb: any) => {
        this.knowledgeBases.insert(kb);
      });
    }
    
    if (data.documents) {
      data.documents.forEach((doc: any) => {
        this.documents.insert(doc);
      });
    }
    
    if (data.chunks) {
      data.chunks.forEach((chunk: any) => {
        this.chunks.insert(chunk);
      });
    }
  }

  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    await this.waitForInitialization();
    
    this.knowledgeBases.clear();
    this.documents.clear();
    this.chunks.clear();
  }
}

/**
 * 创建存储服务实例
 */
export const createStorageService = (): StorageService => {
  return new StorageService();
}; 