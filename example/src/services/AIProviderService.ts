// AI Provider Abstraction

// 支持的API供应商类型
export type APIProvider = 'google' | 'openai' | 'anthropic' | 'azure' | 'custom';

// 聊天生成接口
export interface ChatProvider {
  provider: APIProvider;
  name: string;
  generateContentStream(prompt: string): AsyncGenerator<string, void, unknown>;
  testConnection(): Promise<boolean>;
}

// 嵌入生成接口
export interface EmbeddingProvider {
  provider: APIProvider;
  name: string;
  embedContent(text: string): Promise<number[]>;
  testConnection(): Promise<boolean>;
}

// 离线嵌入接口（预留）
export interface OfflineEmbeddingProvider extends EmbeddingProvider {
  modelName: string;
  isLoaded: boolean;
  loadModel(): Promise<void>;
}

// Google 聊天与嵌入分离
export class GoogleChatProvider implements ChatProvider {
  public readonly provider: APIProvider = 'google';
  public readonly name: string;
  private genAI: any;
  private chatModelName: string;

  constructor(apiKey: string, chatModel: string, name: string = 'Google Gemini') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatModelName = chatModel;
    this.name = name;
  }

  async *generateContentStream(prompt: string): AsyncGenerator<string, void, unknown> {
    const chatModel = this.genAI.getGenerativeModel({ model: this.chatModelName });
    const result = await chatModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const chatModel = this.genAI.getGenerativeModel({ model: this.chatModelName });
      await chatModel.generateContent('test');
      return true;
    } catch (error) {
      console.error('Google API连接测试失败:', error);
      return false;
    }
  }
}

export class GoogleEmbeddingProvider implements EmbeddingProvider {
  public readonly provider: APIProvider = 'google';
  public readonly name: string;
  private genAI: any;
  private embeddingModelName: string;

  constructor(apiKey: string, embeddingModel: string, name: string = 'Google Embedding') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.embeddingModelName = embeddingModel;
    this.name = name;
  }

  async embedContent(text: string): Promise<number[]> {
    const embeddingModel = this.genAI.getGenerativeModel({ model: this.embeddingModelName });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  async testConnection(): Promise<boolean> {
    try {
      const embeddingModel = this.genAI.getGenerativeModel({ model: this.embeddingModelName });
      await embeddingModel.embedContent('test');
      return true;
    } catch (error) {
      console.error('Google Embedding API连接测试失败:', error);
      return false;
    }
  }
}

export class OpenAIChatProvider implements ChatProvider {
  public readonly provider: APIProvider = 'openai';
  public readonly name: string;
  private apiKey: string;
  private apiEndpoint: string;
  private chatModelName: string;

  constructor(apiKey: string, apiEndpoint: string, chatModel: string, name: string = 'OpenAI') {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint || 'https://api.openai.com/v1';
    this.chatModelName = chatModel;
    this.name = name;
  }

  private async fetchAPI(path: string, body: object) {
    const response = await fetch(`${this.apiEndpoint}${path}`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`OpenAI API Error: ${errorBody.error.message}`);
    }
    return response;
  }

  async *generateContentStream(prompt: string): AsyncGenerator<string, void, unknown> {
    const response = await this.fetchAPI('/chat/completions', {
        model: this.chatModelName,
        messages: [{ role: 'user', content: prompt }],
        stream: true
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
            const jsonStr = line.substring(6);
            if (jsonStr === '[DONE]') return;
            const data = JSON.parse(jsonStr);
            if (data.choices[0].delta.content) {
                yield data.choices[0].delta.content;
            }
        }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchAPI('/models', {});
      return response.ok;
    } catch (error) {
      console.error('OpenAI API连接测试失败:', error);
      return false;
    }
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly provider: APIProvider = 'openai';
  public readonly name: string;
  private apiKey: string;
  private apiEndpoint: string;
  private embeddingModelName: string;

  constructor(apiKey: string, apiEndpoint: string, embeddingModel: string, name: string = 'OpenAI Embedding') {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint || 'https://api.openai.com/v1';
    this.embeddingModelName = embeddingModel;
    this.name = name;
  }

  private async fetchAPI(path: string, body: object) {
    const response = await fetch(`${this.apiEndpoint}${path}`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`OpenAI API Error: ${errorBody.error.message}`);
    }
    return response;
  }

  async embedContent(text: string): Promise<number[]> {
    const response = await this.fetchAPI('/embeddings', {
        input: text,
        model: this.embeddingModelName
    });
    const data = await response.json();
    return data.data[0].embedding;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchAPI('/models', {});
      return response.ok;
    } catch (error) {
      console.error('OpenAI Embedding API连接测试失败:', error);
      return false;
    }
  }
}

// 工厂函数
export function createChatProvider(
  provider: 'google' | 'openai',
  apiKey: string,
  apiEndpoint: string,
  chatModel: string,
  name?: string
): ChatProvider {
  if (provider === 'google') {
    return new GoogleChatProvider(apiKey, chatModel, name);
  } else {
    return new OpenAIChatProvider(apiKey, apiEndpoint, chatModel, name);
  }
}

export function createEmbeddingProvider(
  provider: 'google' | 'openai',
  apiKey: string,
  apiEndpoint: string,
  embeddingModel: string,
  name?: string
): EmbeddingProvider {
  if (provider === 'google') {
    return new GoogleEmbeddingProvider(apiKey, embeddingModel, name);
  } else {
    return new OpenAIEmbeddingProvider(apiKey, apiEndpoint, embeddingModel, name);
  }
}

// 离线嵌入服务工厂（预留）
export function createOfflineEmbeddingProvider(_modelName: string): OfflineEmbeddingProvider {
  // TODO: 实现离线嵌入服务
  throw new Error('离线嵌入服务尚未实现');
} 