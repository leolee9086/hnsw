// 嵌入模型WebWorker - 支持所有transformer.js模型
import { pipeline, env } from '@xenova/transformers';

// 配置transformers环境
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.useCustomCache = false;

let embedder = null;
let currentModel = null;

// 添加调试信息
console.log('Worker initialized, transformers library loaded');

// 支持的模型列表
const SUPPORTED_MODELS = [
  'Xenova/all-MiniLM-L6-v2',
  'Xenova/all-mpnet-base-v2',
  'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  'Xenova/sentence-transformers-v2',
  'Xenova/all-distilroberta-v1',
  'Xenova/all-MiniLM-L12-v2',
  'Xenova/all-roberta-large-v1',
  'Xenova/paraphrase-MiniLM-L3-v2',
  'Xenova/paraphrase-multilingual-mpnet-base-v2',
  'Xenova/text-embedding-ada-002',
  'Xenova/BAAI/bge-small-en-v1.5',
  'Xenova/BAAI/bge-base-en-v1.5',
  'Xenova/BAAI/bge-large-en-v1.5',
  'Xenova/BAAI/bge-small-zh-v1.5',
  'Xenova/BAAI/bge-base-zh-v1.5',
  'Xenova/BAAI/bge-large-zh-v1.5'
];

// 初始化嵌入模型
async function initializeEmbedder(modelName) {
  try {
    if (embedder && currentModel === modelName) {
      return { success: true, message: '模型已加载' };
    }
    
    // 释放之前的模型
    if (embedder) {
      embedder = null;
    }
    
    // 验证模型是否支持
    if (!SUPPORTED_MODELS.includes(modelName)) {
      console.warn(`模型 ${modelName} 不在预定义列表中，但仍会尝试加载`);
    }
    
    console.log(`开始加载模型: ${modelName}`);
    
    // 加载新模型
    embedder = await pipeline('feature-extraction', modelName, {
      quantized: false,
      progress_callback: (progress) => {
        console.log(`模型加载进度: ${Math.round(progress * 100)}%`);
      }
    });
    
    currentModel = modelName;
    console.log(`模型 ${modelName} 加载成功`);
    
    return { success: true, message: `模型 ${modelName} 加载成功` };
  } catch (error) {
    console.error(`模型加载失败: ${error.message}`, error);
    return { success: false, message: `模型加载失败: ${error.message}` };
  }
}

// 生成嵌入向量
async function generateEmbedding(text) {
  try {
    if (!embedder) {
      throw new Error('嵌入模型未初始化');
    }
    
    const embedding = await embedder(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(embedding.data);
    
    return { success: true, vector };
  } catch (error) {
    return { success: false, message: `生成向量失败: ${error.message}` };
  }
}

// 获取支持的模型列表
function getSupportedModels() {
  return SUPPORTED_MODELS;
}

// 监听主线程消息
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'init':
        console.log('收到初始化请求:', data.modelName);
        const initResult = await initializeEmbedder(data.modelName);
        self.postMessage({ type: 'init', data: initResult });
        break;
        
      case 'embed':
        const embedResult = await generateEmbedding(data.text);
        self.postMessage({ type: 'embed', data: embedResult, id: data.id });
        break;
        
      case 'getModels':
        const models = getSupportedModels();
        self.postMessage({ type: 'getModels', data: { models } });
        break;
        
      default:
        self.postMessage({ type: 'error', data: { message: '未知消息类型' } });
    }
  } catch (error) {
    console.error('Worker处理消息时出错:', error);
    self.postMessage({ type: 'error', data: { message: error.message } });
  }
};
