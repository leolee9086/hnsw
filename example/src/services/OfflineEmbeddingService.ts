// 离线嵌入服务，基于embedder-worker.js
import type { OfflineEmbeddingProvider, APIProvider, EmbeddingProvider } from './AIProviderService';

export class OfflineEmbeddingService implements OfflineEmbeddingProvider, EmbeddingProvider {
  public readonly provider: APIProvider = 'custom';
  public readonly name: string;
  public modelName: string;
  public isLoaded: boolean = false;
  private worker: Worker;
  private pending: Map<string | number, (vector: number[]) => void> = new Map();

  constructor(modelName: string) {
    this.modelName = modelName;
    this.name = `离线嵌入 - ${modelName}`;
    this.worker = new Worker(new URL('../src/embedder-worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  async loadModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ type: 'init', data: { modelName: this.modelName } });
      const onInit = (e: MessageEvent) => {
        const { type, data } = e.data;
        if (type === 'init') {
          if (data.success) {
            this.isLoaded = true;
            resolve();
          } else {
            this.isLoaded = false;
            reject(new Error(data.message));
          }
          this.worker.removeEventListener('message', onInit);
        }
      };
      this.worker.addEventListener('message', onInit);
    });
  }

  async embedContent(text: string): Promise<number[]> {
    if (!this.isLoaded) throw new Error('模型未加载');
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      this.pending.set(id, resolve);
      this.worker.postMessage({ type: 'embed', data: { text, id } });
      // 超时处理
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('嵌入超时'));
        }
      }, 15000);
    });
  }

  async testConnection(): Promise<boolean> {
    return this.isLoaded;
  }

  private handleMessage(e: MessageEvent) {
    const { type, data, id } = e.data;
    if (type === 'embed' && data.success && this.pending.has(id)) {
      this.pending.get(id)?.(data.vector);
      this.pending.delete(id);
    }
    // 错误处理
    if (type === 'embed' && !data.success && this.pending.has(id)) {
      this.pending.get(id)?.([]);
      this.pending.delete(id);
    }
  }
}

// 工厂方法
export function createOfflineEmbeddingProvider(modelName: string): OfflineEmbeddingService {
  return new OfflineEmbeddingService(modelName);
} 