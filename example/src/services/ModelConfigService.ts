/**
 * 模型配置服务
 * 支持供应商 -> Token -> 模型的层级配置
 */

import { secureStorage } from './SecureStorageService';

// 供应商类型
export type ProviderType = 'google' | 'openai' | 'anthropic' | 'azure' | 'custom';

// 模型类型
export type ModelType = 'chat' | 'embedding';

// 供应商配置
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  apiEndpoint?: string;
  createdAt: number;
  updatedAt: number;
}

// Token配置
export interface TokenConfig {
  id: string;
  providerId: string;
  name: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// 模型配置
export interface ModelConfig {
  id: string;
  tokenId: string;
  name: string;
  type: ModelType;
  modelName: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// 聊天模型选择
export interface ChatModelSelection {
  id: string;
  name: string;
  providerName: string;
  tokenName: string;
  modelName: string;
}

// 嵌入模型选择
export interface EmbeddingModelSelection {
  id: string;
  name: string;
  providerName: string;
  tokenName: string;
  modelName: string;
}

class ModelConfigService {
  private readonly PROVIDERS_KEY = 'model_providers';
  private readonly TOKENS_KEY = 'model_tokens';
  private readonly MODELS_KEY = 'model_configs';

  // 供应商管理
  saveProvider(provider: ProviderConfig): void {
    const providers = this.getProviders();
    const existingIndex = providers.findIndex(p => p.id === provider.id);
    
    if (existingIndex >= 0) {
      providers[existingIndex] = { ...provider, updatedAt: Date.now() };
    } else {
      providers.push({ ...provider, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    secureStorage.setData(this.PROVIDERS_KEY, providers);
  }

  getProviders(): ProviderConfig[] {
    return secureStorage.getData<ProviderConfig[]>(this.PROVIDERS_KEY, []);
  }

  getProvider(id: string): ProviderConfig | null {
    return this.getProviders().find(p => p.id === id) || null;
  }

  deleteProvider(id: string): void {
    const providers = this.getProviders().filter(p => p.id !== id);
    secureStorage.setData(this.PROVIDERS_KEY, providers);
    
    // 删除相关的tokens和models
    this.deleteTokensByProvider(id);
  }

  // Token管理
  saveToken(token: TokenConfig): void {
    const tokens = this.getTokens();
    const existingIndex = tokens.findIndex(t => t.id === token.id);
    
    if (existingIndex >= 0) {
      tokens[existingIndex] = { ...token, updatedAt: Date.now() };
    } else {
      tokens.push({ ...token, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    // 如果设置为默认，取消其他token的默认状态
    if (token.isDefault) {
      tokens.forEach(t => {
        if (t.id !== token.id && t.providerId === token.providerId) {
          t.isDefault = false;
        }
      });
    }
    
    secureStorage.setData(this.TOKENS_KEY, tokens);
  }

  getTokens(): TokenConfig[] {
    return secureStorage.getData<TokenConfig[]>(this.TOKENS_KEY, []);
  }

  getTokensByProvider(providerId: string): TokenConfig[] {
    return this.getTokens().filter(t => t.providerId === providerId);
  }

  getToken(id: string): TokenConfig | null {
    return this.getTokens().find(t => t.id === id) || null;
  }

  deleteToken(id: string): void {
    const tokens = this.getTokens().filter(t => t.id !== id);
    secureStorage.setData(this.TOKENS_KEY, tokens);
    
    // 删除相关的models
    this.deleteModelsByToken(id);
  }

  deleteTokensByProvider(providerId: string): void {
    const tokens = this.getTokens().filter(t => t.providerId !== providerId);
    secureStorage.setData(this.TOKENS_KEY, tokens);
    
    // 删除相关的models
    const models = this.getModels().filter(m => {
      const token = this.getToken(m.tokenId);
      return token && token.providerId !== providerId;
    });
    secureStorage.setData(this.MODELS_KEY, models);
  }

  // 模型管理
  saveModel(model: ModelConfig): void {
    const models = this.getModels();
    const existingIndex = models.findIndex(m => m.id === model.id);
    
    if (existingIndex >= 0) {
      models[existingIndex] = { ...model, updatedAt: Date.now() };
    } else {
      models.push({ ...model, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    // 如果设置为默认，取消同类型其他模型的默认状态
    if (model.isDefault) {
      models.forEach(m => {
        if (m.id !== model.id && m.type === model.type) {
          m.isDefault = false;
        }
      });
    }
    
    secureStorage.setData(this.MODELS_KEY, models);
  }

  getModels(): ModelConfig[] {
    return secureStorage.getData<ModelConfig[]>(this.MODELS_KEY, []);
  }

  getModelsByToken(tokenId: string): ModelConfig[] {
    return this.getModels().filter(m => m.tokenId === tokenId);
  }

  getModelsByType(type: ModelType): ModelConfig[] {
    return this.getModels().filter(m => m.type === type);
  }

  getDefaultModel(type: ModelType): ModelConfig | null {
    return this.getModels().find(m => m.type === type && m.isDefault) || null;
  }

  deleteModel(id: string): void {
    const models = this.getModels().filter(m => m.id !== id);
    secureStorage.setData(this.MODELS_KEY, models);
  }

  deleteModelsByToken(tokenId: string): void {
    const models = this.getModels().filter(m => m.tokenId !== tokenId);
    secureStorage.setData(this.MODELS_KEY, models);
  }

  // 模型选择器
  getChatModelSelections(): ChatModelSelection[] {
    const models = this.getModelsByType('chat');
    return models.map(model => {
      const token = this.getToken(model.tokenId);
      const provider = token ? this.getProvider(token.providerId) : null;
      
      return {
        id: model.id,
        name: model.name,
        providerName: provider?.name || '未知供应商',
        tokenName: token?.name || '未知Token',
        modelName: model.modelName
      };
    });
  }

  getEmbeddingModelSelections(): EmbeddingModelSelection[] {
    const models = this.getModelsByType('embedding');
    return models.map(model => {
      const token = this.getToken(model.tokenId);
      const provider = token ? this.getProvider(token.providerId) : null;
      
      return {
        id: model.id,
        name: model.name,
        providerName: provider?.name || '未知供应商',
        tokenName: token?.name || '未知Token',
        modelName: model.modelName
      };
    });
  }

  // 工具方法
  generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getProviderDisplayName(type: ProviderType): string {
    switch (type) {
      case 'google': return 'Google Gemini';
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic Claude';
      case 'azure': return 'Azure OpenAI';
      case 'custom': return '自定义';
      default: return '未知';
    }
  }

  getDefaultModelName(providerType: ProviderType, modelType: ModelType): string {
    switch (providerType) {
      case 'google':
        return modelType === 'chat' ? 'gemini-1.5-flash' : 'text-embedding-004';
      case 'openai':
        return modelType === 'chat' ? 'gpt-3.5-turbo' : 'text-embedding-ada-002';
      case 'anthropic':
        return modelType === 'chat' ? 'claude-3-sonnet-20240229' : '';
      case 'azure':
        return modelType === 'chat' ? 'gpt-35-turbo' : 'text-embedding-ada-002';
      default:
        return '';
    }
  }

  // 数据导出导入
  exportConfig(): string {
    const data = {
      providers: this.getProviders(),
      tokens: this.getTokens(),
      models: this.getModels(),
      exportTime: Date.now()
    };
    return JSON.stringify(data, null, 2);
  }

  importConfig(jsonData: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.providers) {
        secureStorage.setData(this.PROVIDERS_KEY, data.providers);
      }
      
      if (data.tokens) {
        secureStorage.setData(this.TOKENS_KEY, data.tokens);
      }
      
      if (data.models) {
        secureStorage.setData(this.MODELS_KEY, data.models);
      }
      
      return { success: true, message: '配置导入成功' };
    } catch (error) {
      return { success: false, message: `配置导入失败: ${error}` };
    }
  }

  // 清空所有配置
  clearAllConfig(): void {
    secureStorage.removeData(this.PROVIDERS_KEY);
    secureStorage.removeData(this.TOKENS_KEY);
    secureStorage.removeData(this.MODELS_KEY);
  }
}

// 导出单例实例
export const modelConfigService = new ModelConfigService(); 