/**
 * 安全数据存储服务
 * 支持加密存储敏感数据，如API密钥
 */

// 支持的API供应商类型
export type APIProvider = 'google' | 'openai' | 'anthropic' | 'azure' | 'custom';

// API配置接口
export interface APIConfig {
  provider: APIProvider;
  name: string;
  apiKey: string;
  apiEndpoint?: string;
  chatModel?: string;
  embeddingModel?: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

// 应用设置接口
export interface AppSettings {
  defaultProvider: string;
  embeddingModel: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  autoSave: boolean;
  maxHistory: number;
}

// 聊天历史记录接口
export interface ChatHistory {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  provider: string;
  createdAt: number;
  updatedAt: number;
}

// 文件处理历史接口
export interface FileHistory {
  id: string;
  fileName: string;
  fileSize: number;
  chunks: number;
  model: string;
  processingTime: number;
  createdAt: number;
}

class SecureStorageService {
  private readonly STORAGE_PREFIX = 'hnsw_secure_';
  private readonly ENCRYPTION_KEY = 'hnsw_encryption_key_2024';
  
  /**
   * 生成简单的加密密钥（生产环境应使用更安全的方法）
   */
  private generateKey(password: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.ENCRYPTION_KEY);
    return btoa(String.fromCharCode(...new Uint8Array(data)));
  }

  /**
   * 简单加密（生产环境应使用更安全的加密方法）
   */
  private encrypt(text: string): string {
    const key = this.generateKey(this.ENCRYPTION_KEY);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    // 使用encodeURIComponent处理Unicode字符
    return btoa(encodeURIComponent(result));
  }

  /**
   * 简单解密（支持向后兼容）
   */
  private decrypt(encryptedText: string): string {
    const key = this.generateKey(this.ENCRYPTION_KEY);
    
    // 检查是否是有效的base64字符串
    const isValidBase64 = (str: string): boolean => {
      try {
        return btoa(atob(str)) === str;
      } catch {
        return false;
      }
    };
    
    // 如果不是有效的base64，可能是非加密数据
    if (!isValidBase64(encryptedText)) {
      console.warn('检测到非加密数据，直接返回');
      return encryptedText;
    }
    
    try {
      // 尝试新格式（使用encodeURIComponent）
      const text = decodeURIComponent(atob(encryptedText));
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      // 如果新格式失败，尝试旧格式（直接使用btoa/atob）
      try {
        const text = atob(encryptedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
          result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
      } catch (oldError) {
        // 如果两种格式都失败，返回原始数据
        console.warn('解密失败，返回原始数据');
        return encryptedText;
      }
    }
  }

  /**
   * 安全存储数据
   */
  private secureSet(key: string, value: any): void {
    try {
      const encryptedValue = this.encrypt(JSON.stringify(value));
      localStorage.setItem(this.STORAGE_PREFIX + key, encryptedValue);
    } catch (error) {
      console.error('存储数据失败:', error);
      // 降级到非加密存储
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(value));
    }
  }

  /**
   * 安全读取数据
   */
  private secureGet<T>(key: string, defaultValue: T): T {
    try {
      const encryptedValue = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!encryptedValue) return defaultValue;
      
      const decryptedValue = this.decrypt(encryptedValue);
      
      // 尝试解析JSON
      try {
        return JSON.parse(decryptedValue);
      } catch (jsonError) {
        // 如果不是JSON格式，返回原始值
        console.warn('数据不是JSON格式，返回原始值');
        return decryptedValue as T;
      }
    } catch (error) {
      console.error('读取数据失败:', error);
      // 尝试读取非加密数据
      try {
        const value = localStorage.getItem(this.STORAGE_PREFIX + key);
        if (!value) return defaultValue;
        
        try {
          return JSON.parse(value);
        } catch (jsonError) {
          return value as T;
        }
      } catch {
        return defaultValue;
      }
    }
  }

  /**
   * 删除安全存储的数据
   */
  private secureRemove(key: string): void {
    localStorage.removeItem(this.STORAGE_PREFIX + key);
  }

  // 通用存储方法（供其他服务使用）
  /**
   * 存储任意数据
   */
  setData(key: string, value: any): void {
    this.secureSet(key, value);
  }

  /**
   * 读取任意数据
   */
  getData<T>(key: string, defaultValue: T): T {
    return this.secureGet<T>(key, defaultValue);
  }

  /**
   * 删除任意数据
   */
  removeData(key: string): void {
    this.secureRemove(key);
  }

  // API配置管理
  /**
   * 保存API配置
   */
  saveAPIConfig(config: APIConfig): void {
    const configs = this.getAPIConfigs();
    const existingIndex = configs.findIndex(c => c.name === config.name);
    
    if (existingIndex >= 0) {
      configs[existingIndex] = { ...config, updatedAt: Date.now() };
    } else {
      configs.push({ ...config, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    this.secureSet('api_configs', configs);
  }

  /**
   * 获取所有API配置
   */
  getAPIConfigs(): APIConfig[] {
    return this.secureGet<APIConfig[]>('api_configs', []);
  }

  /**
   * 获取默认API配置
   */
  getDefaultAPIConfig(): APIConfig | null {
    const configs = this.getAPIConfigs();
    return configs.find(c => c.isDefault) || configs[0] || null;
  }

  /**
   * 删除API配置
   */
  deleteAPIConfig(name: string): void {
    const configs = this.getAPIConfigs();
    const filtered = configs.filter(c => c.name !== name);
    this.secureSet('api_configs', filtered);
  }

  /**
   * 设置默认API配置
   */
  setDefaultAPIConfig(name: string): void {
    const configs = this.getAPIConfigs();
    configs.forEach(config => {
      config.isDefault = config.name === name;
    });
    this.secureSet('api_configs', configs);
  }

  // 应用设置管理
  /**
   * 保存应用设置
   */
  saveAppSettings(settings: Partial<AppSettings>): void {
    const currentSettings = this.getAppSettings();
    const newSettings = { ...currentSettings, ...settings };
    this.secureSet('app_settings', newSettings);
  }

  /**
   * 获取应用设置
   */
  getAppSettings(): AppSettings {
    return this.secureGet<AppSettings>('app_settings', {
      defaultProvider: '',
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      theme: 'auto',
      language: 'zh',
      autoSave: true,
      maxHistory: 50
    });
  }

  // 聊天历史管理
  /**
   * 保存聊天历史
   */
  saveChatHistory(history: ChatHistory): void {
    const histories = this.getChatHistories();
    const existingIndex = histories.findIndex(h => h.id === history.id);
    
    if (existingIndex >= 0) {
      histories[existingIndex] = { ...history, updatedAt: Date.now() };
    } else {
      histories.push({ ...history, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    // 限制历史记录数量
    const settings = this.getAppSettings();
    if (histories.length > settings.maxHistory) {
      histories.sort((a, b) => b.updatedAt - a.updatedAt);
      histories.splice(settings.maxHistory);
    }
    
    this.secureSet('chat_histories', histories);
  }

  /**
   * 获取聊天历史列表
   */
  getChatHistories(): ChatHistory[] {
    return this.secureGet<ChatHistory[]>('chat_histories', []);
  }

  /**
   * 删除聊天历史
   */
  deleteChatHistory(id: string): void {
    const histories = this.getChatHistories();
    const filtered = histories.filter(h => h.id !== id);
    this.secureSet('chat_histories', filtered);
  }

  /**
   * 清空所有聊天历史
   */
  clearAllChatHistories(): void {
    this.secureRemove('chat_histories');
  }

  // 文件处理历史管理
  /**
   * 保存文件处理历史
   */
  saveFileHistory(history: FileHistory): void {
    const histories = this.getFileHistories();
    histories.push({ ...history, createdAt: Date.now() });
    
    // 限制历史记录数量
    const settings = this.getAppSettings();
    if (histories.length > settings.maxHistory) {
      histories.sort((a, b) => b.createdAt - a.createdAt);
      histories.splice(settings.maxHistory);
    }
    
    this.secureSet('file_histories', histories);
  }

  /**
   * 获取文件处理历史列表
   */
  getFileHistories(): FileHistory[] {
    return this.secureGet<FileHistory[]>('file_histories', []);
  }

  /**
   * 删除文件处理历史
   */
  deleteFileHistory(id: string): void {
    const histories = this.getFileHistories();
    const filtered = histories.filter(h => h.id !== id);
    this.secureSet('file_histories', filtered);
  }

  /**
   * 清空所有文件处理历史
   */
  clearAllFileHistories(): void {
    this.secureRemove('file_histories');
  }

  // 数据导出导入
  /**
   * 导出所有数据（不包含敏感信息）
   */
  exportData(): string {
    const data = {
      appSettings: this.getAppSettings(),
      chatHistories: this.getChatHistories().map(h => ({
        ...h,
        messages: h.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }))
      })),
      fileHistories: this.getFileHistories(),
      exportTime: Date.now()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入数据
   */
  importData(jsonData: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.appSettings) {
        this.saveAppSettings(data.appSettings);
      }
      
      if (data.chatHistories) {
        this.secureSet('chat_histories', data.chatHistories);
      }
      
      if (data.fileHistories) {
        this.secureSet('file_histories', data.fileHistories);
      }
      
      return { success: true, message: '数据导入成功' };
    } catch (error) {
      return { success: false, message: `数据导入失败: ${error}` };
    }
  }

  /**
   * 清空所有数据
   */
  clearAllData(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 获取存储使用情况
   */
  getStorageInfo(): { used: number; total: number; percentage: number } {
    let used = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        used += localStorage.getItem(key)?.length || 0;
      }
    });
    
    // 估算总存储空间（通常为5-10MB）
    const total = 5 * 1024 * 1024; // 5MB
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  }
}

// 导出单例实例
export const secureStorage = new SecureStorageService(); 