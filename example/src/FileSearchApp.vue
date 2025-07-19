<template>
  <div id="app" class="container-fluid p-0" style="height: 100vh;">
    <!-- 主要内容 -->
    <main class="p-3" style="height: calc(100vh - 60px); overflow-y: auto;">
      <!-- 顶部工具栏 -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">
          <i class="bi bi-search me-2"></i>
          HNSW 向量索引搜索
        </h5>
        
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center gap-1">
            <label class="form-label mb-0 fs-6 text-muted">模型:</label>
            <select 
              v-model="selectedModel" 
              @change="changeModel"
              class="form-select form-select-sm"
              style="width: auto; min-width: 200px;"
            >
              <option value="Xenova/all-MiniLM-L6-v2">all-MiniLM-L6-v2 (轻量级)</option>
              <option value="Xenova/all-mpnet-base-v2">all-mpnet-base-v2 (高质量)</option>
              <option value="Xenova/paraphrase-multilingual-MiniLM-L12-v2">multilingual-MiniLM (多语言)</option>
              <option value="Xenova/sentence-transformers-v2">sentence-transformers (通用)</option>
              <option value="Xenova/all-distilroberta-v1">all-distilroberta-v1 (快速)</option>
              <option value="Xenova/all-MiniLM-L12-v2">all-MiniLM-L12-v2 (平衡)</option>
              <option value="Xenova/all-roberta-large-v1">all-roberta-large-v1 (高精度)</option>
              <option value="Xenova/paraphrase-MiniLM-L3-v2">paraphrase-MiniLM-L3-v2 (超轻量)</option>
              <option value="Xenova/paraphrase-multilingual-mpnet-base-v2">multilingual-mpnet (多语言高质量)</option>
              <option value="Xenova/text-embedding-ada-002">text-embedding-ada-002 (OpenAI兼容)</option>
              <option value="Xenova/BAAI/bge-small-en-v1.5">bge-small-en-v1.5 (中文友好)</option>
              <option value="Xenova/BAAI/bge-base-en-v1.5">bge-base-en-v1.5 (中文友好)</option>
              <option value="Xenova/BAAI/bge-large-en-v1.5">bge-large-en-v1.5 (中文友好)</option>
              <option value="Xenova/BAAI/bge-small-zh-v1.5">bge-small-zh-v1.5 (中文专用)</option>
              <option value="Xenova/BAAI/bge-base-zh-v1.5">bge-base-zh-v1.5 (中文专用)</option>
              <option value="Xenova/BAAI/bge-large-zh-v1.5">bge-large-zh-v1.5 (中文专用)</option>
            </select>
          </div>
          <button class="btn btn-outline-primary btn-sm" @click="showFileInput">
            <i class="bi bi-upload me-1"></i>
            上传文件
          </button>
        </div>
      </div>
      <!-- 文件上传区域 -->
      <div v-if="!hasFiles" class="text-center py-5">
        <i class="bi bi-file-earmark-text display-1 text-muted"></i>
        <p class="mt-3 text-muted">拖拽文件到此处或点击上传按钮</p>
        <p class="text-muted small">支持多种文本格式：TXT, MD, JSON, CSV, XML, HTML, 代码文件等</p>
      </div>

      <!-- 搜索区域 -->
      <div v-if="hasFiles" class="mb-4">
        <div class="input-group">
          <input 
            type="text" 
            class="form-control" 
            placeholder="输入搜索内容..." 
            v-model="searchQuery"
            @keyup.enter="performSearch"
          >
          <button 
            class="btn btn-outline-secondary" 
            type="button"
            @click="toggleSearchType"
          >
            {{ searchType === 'text' ? '文本搜索' : '向量搜索' }}
          </button>
          <button 
            class="btn btn-primary" 
            type="button"
            @click="performSearch"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
            搜索
          </button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="hasFiles" class="row g-2 mb-3">
        <div class="col-md-3">
          <div class="card border-0 bg-light">
            <div class="card-body text-center py-2">
              <h6 class="card-title mb-0 text-primary">{{ totalFiles }}</h6>
              <p class="card-text small text-muted mb-0">文件数量</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 bg-light">
            <div class="card-body text-center py-2">
              <h6 class="card-title mb-0 text-success">{{ totalChunks }}</h6>
              <p class="card-text small text-muted mb-0">文本块</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 bg-light">
            <div class="card-body text-center py-2">
              <h6 class="card-title mb-0 text-info">{{ indexSize }}</h6>
              <p class="card-text small text-muted mb-0">索引大小</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 bg-light">
            <div class="card-body text-center py-2">
              <h6 class="card-title mb-0 text-warning">{{ searchTime.toFixed(2) }}ms</h6>
              <p class="card-text small text-muted mb-0">搜索时间</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchResults.length > 0" class="mb-4">
        <h5>搜索结果 ({{ searchResults.length }})</h5>
        <div class="list-group">
          <div 
            v-for="(result, index) in searchResults" 
            :key="index"
            class="list-group-item"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h6 class="mb-1">{{ result.file }}</h6>
                <p class="mb-1">{{ result.content }}</p>
                <small class="text-muted">距离: {{ result.distance.toFixed(4) }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 处理状态 -->
      <div v-if="isProcessing" class="alert alert-info">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2"></div>
          <span>{{ processingStep }} - {{ processingFile }}</span>
        </div>
        <div class="progress mt-2" style="height: 4px;">
          <div 
            class="progress-bar" 
            :style="{ width: processingProgress + '%' }"
          ></div>
        </div>
      </div>
    </main>

    <!-- 隐藏的文件输入 -->
    <input 
      type="file" 
      ref="fileInput" 
      @change="handleFileSelect" 
      multiple 
      accept=".txt,.md,.json,.csv,.xml,.html,.htm,.log,.sql,.py,.js,.ts,.java,.cpp,.c,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.m,.pl,.sh,.bat,.ps1,.yml,.yaml,.toml,.ini,.cfg,.conf,.properties,.xml,.json,.csv,.tsv,.xlsx,.xls,.doc,.docx,.pdf"
      style="display: none;"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { pipeline } from '@xenova/transformers';
import { hnsw } from '@leolee9086/hnsw';
import { processFileContent, isSupportedFile, getFileTypeDescription } from './utils/fileProcessor';

// 定义事件发射器
const emit = defineEmits<{
  'file-processed': [data: {
    textChunks: Array<{ id: number; text: string; file: string }>;
    vectorChunks: Array<{ id: number; text: string; vector: number[]; file: string }>;
    selectedModel: string;
  }];
}>();

// 响应式数据
const searchQuery = ref('');
const searchType = ref<'text' | 'vector'>('text');
const isLoading = ref(false);
const searchTime = ref(0);
const searchResults = ref<Array<{
  idx: number;
  distance: number;
  file: string;
  content: string;
}>>([]);

// 处理状态
const isProcessing = ref(false);
const processingFile = ref('');
const processingStep = ref('');
const processingProgress = ref(0);

// 索引和模型
const textIndex = ref<any>(null);
const vectorIndex = ref<any>(null);
const embedder = ref<any>(null);
const embedderWorker = ref<any>(null);
const selectedModel = ref('Xenova/all-MiniLM-L6-v2');
const textChunks = ref<Array<{ id: number; text: string; file: string }>>([]);
const vectorChunks = ref<Array<{ id: number; text: string; vector: number[]; file: string }>>([]);

// 统计信息
const hasFiles = ref(false);
const totalFiles = ref(0);
const totalChunks = ref(0);
const indexSize = ref(0);

// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null);

// 生命周期
onMounted(async () => {
  await initializeIndexes();
  await initializeEmbedder();
  initializeWorker();
});

// 初始化索引
const initializeIndexes = () => {
  // 文本索引（使用编辑距离）
  const stringDistance = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // 删除
          matrix[j - 1][i] + 1, // 插入
          matrix[j - 1][i - 1] + indicator // 替换
        );
      }
    }
    
    // 归一化到 [0,1]
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 0 : matrix[b.length][a.length] / maxLength;
  };

  textIndex.value = hnsw.createIndexGeneric({
    M: 16,
    efConstruction: 200,
    distanceFunction: stringDistance
  });

  // 向量索引
  vectorIndex.value = hnsw.createIndex({
    M: 16,
    efConstruction: 200,
    metricType: 'cosine'
  });
};

// 初始化嵌入模型
const initializeEmbedder = async () => {
  try {
    console.log('正在加载嵌入模型...');
    embedder.value = await pipeline('feature-extraction', selectedModel.value);
    console.log('嵌入模型加载完成');
  } catch (error) {
    console.error('加载嵌入模型失败:', error);
  }
};

// 初始化WebWorker
const initializeWorker = () => {
  try {
    embedderWorker.value = new Worker(new URL('./embedder-worker.js', import.meta.url), { type: 'module' });
    
    embedderWorker.value.onmessage = (e: MessageEvent) => {
      const { type, data, id } = e.data;
      
      switch (type) {
        case 'init':
          if (data.success) {
            console.log(data.message);
          } else {
            console.error(data.message);
          }
          break;
          
        case 'embed':
          if (data.success) {
            // 处理向量化结果
            handleEmbeddingResult(id, data.vector);
          } else {
            console.error(data.message);
          }
          break;
          
        case 'error':
          console.error('Worker错误:', data.message);
          break;
      }
    };
    
    // 初始化Worker中的模型
    embedderWorker.value.postMessage({
      type: 'init',
      data: { modelName: selectedModel.value }
    });
    
  } catch (error) {
    console.error('初始化Worker失败:', error);
  }
};

// 处理嵌入结果
const handleEmbeddingResult = (chunkId: number, vector: number[]) => {
  const chunkIndex = vectorChunks.value.findIndex((chunk: any) => chunk.id === chunkId);
  if (chunkIndex !== -1) {
    vectorChunks.value[chunkIndex]!.vector = vector;
    vectorIndex.value!.insertNode(vector);
  }
};

// 切换模型
const changeModel = async () => {
  try {
    // 清空向量索引和向量块
    vectorIndex.value = hnsw.createIndex({
      M: 16,
      efConstruction: 200,
      metricType: 'cosine'
    });
    vectorChunks.value = [];
    
    // 重新初始化嵌入模型
    await initializeEmbedder();
    
    // 重新初始化Worker
    if (embedderWorker.value) {
      embedderWorker.value.terminate();
    }
    initializeWorker();
    
    console.log(`模型已切换到: ${selectedModel.value}`);
  } catch (error) {
    console.error('切换模型失败:', error);
  }
};

// 文本分块
const chunkText = (text: string, chunkSize: number = 200): string[] => {
  const chunks: string[] = [];
  const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // 如果单个句子就超过chunkSize，强制分割
      if (sentence.length > chunkSize) {
        for (let i = 0; i < sentence.length; i += chunkSize) {
          chunks.push(sentence.slice(i, i + chunkSize));
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence + '。';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

// 处理文件
const processFile = async (file: File): Promise<void> => {
  // 检查文件是否支持
  if (!isSupportedFile(file.name)) {
    alert(`不支持的文件格式: ${file.name}`);
    return;
  }

  isProcessing.value = true;
  processingFile.value = file.name;
  processingProgress.value = 0;

  try {
    // 读取和处理文件
    processingStep.value = 'reading';
    const processedFile = await processFileContent(file);
    processingProgress.value = 20;

    console.log(`处理文件: ${file.name} (${getFileTypeDescription(file.name)})`);

    // 文本分块
    processingStep.value = 'chunking';
    const chunks = chunkText(processedFile.content);
    processingProgress.value = 40;
    
    console.log(`文件 ${file.name} 被分割为 ${chunks.length} 个块`);

    // 添加到文本索引
    processingStep.value = 'indexing';
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = textChunks.value.length;
      const chunkText = chunks[i]!;
      
      textChunks.value.push({
        id: chunkId,
        text: chunkText,
        file: file.name
      });
      
      textIndex.value!.insertNode(chunkText);
      
      // 更新进度
      processingProgress.value = 40 + Math.floor((i / chunks.length) * 30);
    }
    processingProgress.value = 70;

    // 添加到向量索引（如果嵌入模型已加载）
    if (embedderWorker.value) {
      processingStep.value = 'vectorizing';
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkId = vectorChunks.value.length;
          vectorChunks.value.push({
            id: chunkId,
            text: chunks[i]!,
            vector: [] as number[], // 临时空向量
            file: file.name
          });
          
          // 使用Worker异步生成向量
          embedderWorker.value.postMessage({
            type: 'embed',
            data: { text: chunks[i]!, id: chunkId }
          });
          
          // 更新进度
          processingProgress.value = 70 + Math.floor((i / chunks.length) * 30);
        } catch (error) {
          console.error('生成向量失败:', error);
        }
      }
    }

    processingProgress.value = 100;
    updateStats();
    hasFiles.value = true;

    // 发射文件处理完成事件
    emit('file-processed', {
      textChunks: textChunks.value,
      vectorChunks: vectorChunks.value,
      selectedModel: selectedModel.value
    });

    // 延迟隐藏处理状态
    setTimeout(() => {
      isProcessing.value = false;
      processingFile.value = '';
      processingStep.value = '';
      processingProgress.value = 0;
    }, 1000);

  } catch (error) {
    console.error('处理文件失败:', error);
    isProcessing.value = false;
    processingFile.value = '';
    processingStep.value = '';
    processingProgress.value = 0;
  }
};

// 更新统计信息
const updateStats = () => {
  totalFiles.value = new Set(textChunks.value.map((chunk: any) => chunk.file)).size;
  totalChunks.value = textChunks.value.length;
  indexSize.value = textChunks.value.length + vectorChunks.value.length;
};

// 执行搜索
const performSearch = async () => {
  if (!searchQuery.value.trim()) return;

  isLoading.value = true;
  const startTime = performance.now();

  try {
    if (searchType.value === 'text') {
      performTextSearch();
    } else {
      await performVectorSearch();
    }
  } catch (error) {
    console.error('搜索失败:', error);
  } finally {
    isLoading.value = false;
    searchTime.value = performance.now() - startTime;
  }
};

// 文本搜索
const performTextSearch = () => {
  if (!textIndex.value) return;

  const results = textIndex.value.search(searchQuery.value, 5);
  displayResults(results, 'text');
};

// 向量搜索
const performVectorSearch = async () => {
  if (!vectorIndex.value || !embedderWorker.value) {
    alert('向量模型尚未加载完成，请稍后再试');
    return;
  }

  try {
    // 使用Worker生成查询向量
    embedderWorker.value.postMessage({
      type: 'embed',
      data: { text: searchQuery.value, id: 'query' }
    });
    
    // 监听查询向量生成完成
    const originalOnMessage = embedderWorker.value.onmessage;
    embedderWorker.value.onmessage = (e: MessageEvent) => {
      const { type, data, id } = e.data;
      
      if (type === 'embed' && id === 'query' && data.success) {
        const queryVector = data.vector;
        const results = vectorIndex.value!.search(queryVector, 5);
        displayResults(results, 'vector');
        
        // 恢复原始消息处理器
        embedderWorker.value!.onmessage = originalOnMessage;
      } else {
        // 处理其他消息
        originalOnMessage(e);
      }
    };
  } catch (error) {
    console.error('向量搜索失败:', error);
    alert('向量搜索失败，请重试');
  }
};

// 显示搜索结果
const displayResults = (results: Array<{ idx: number; distance: number }>, type: 'text' | 'vector') => {
  const chunks = type === 'text' ? textChunks.value : vectorChunks.value;
  
  searchResults.value = results.map(result => {
    const chunk = chunks[result.idx];
    return {
      idx: result.idx,
      distance: result.distance,
      file: chunk?.file || '未知文件',
      content: chunk?.text.substring(0, 200) + (chunk?.text.length > 200 ? '...' : '') || ''
    };
  });
};

// 切换搜索类型
const toggleSearchType = () => {
  searchType.value = searchType.value === 'text' ? 'vector' : 'text';
};

// 显示文件选择器
const showFileInput = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    await processFile(file);
    
    // 如果不是最后一个文件，等待一下再处理下一个
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

// 处理文件拖拽
const handleFileDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    await processFile(file);
    
    // 如果不是最后一个文件，等待一下再处理下一个
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

// 拖拽事件处理
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chat-input-group {
  flex-shrink: 0;
}

/* 拖拽区域样式 */
#app {
  min-height: 100vh;
}

#app.drag-over {
  background-color: rgba(0, 123, 255, 0.1);
  border: 2px dashed #007bff;
}
</style> 