<template>
  <div 
    class="modal fade" 
    id="embeddingSettingsModal" 
    tabindex="-1" 
    aria-labelledby="embeddingSettingsModalLabel" 
    data-bs-backdrop="static" 
    data-bs-keyboard="false"
    :inert="!isVisible"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="embeddingSettingsModalLabel">嵌入模型设置（离线）</h5>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="embeddingModel" class="form-label">选择嵌入模型</label>
            <select id="embeddingModel" class="form-select" v-model="selectedModel" @change="loadModel">
              <option v-for="model in supportedModels" :key="model" :value="model">{{ model }}</option>
            </select>
          </div>
          <div class="mb-3">
            <div v-if="loading" class="alert alert-info">
              <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                模型加载中...（首次加载可能需要几分钟）
              </div>
            </div>
            <div v-else-if="error" class="alert alert-danger">
              <strong>加载失败：</strong>{{ error }}
              <div class="mt-2">
                <small>提示：请检查网络连接，或尝试其他模型</small>
              </div>
            </div>
            <div v-else-if="loaded" class="alert alert-success">
              <i class="bi bi-check-circle me-2"></i>
              模型已就绪
            </div>
            <div v-else class="alert alert-secondary">
              <i class="bi bi-info-circle me-2"></i>
              请选择模型并加载
            </div>
          </div>
          <div class="mb-3">
            <div class="form-text">
              <strong>注意：</strong>首次加载模型需要从网络下载，可能需要几分钟时间。模型会被缓存到浏览器中，后续加载会更快。
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="save" :disabled="!loaded">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  isVisible: boolean;
  currentModel: string;
}>();
const emit = defineEmits<{
  save: [model: string];
}>();

// 支持的模型列表（与embedder-worker.js保持一致）
const supportedModels = [
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

const selectedModel = ref(props.currentModel || supportedModels[0]);
const loading = ref(false);
const loaded = ref(false);
const error = ref('');
let worker: Worker | null = null;

// 初始化worker
const initWorker = () => {
  if (!worker) {
    worker = new Worker(new URL('../embedder-worker.js', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      const { type, data } = e.data;
      
      switch (type) {
        case 'init':
          if (data.success) {
            loaded.value = true;
            error.value = '';
          } else {
            loaded.value = false;
            error.value = data.message;
          }
          loading.value = false;
          break;
          
        case 'error':
          loaded.value = false;
          error.value = data.message;
          loading.value = false;
          break;
      }
    };
    
    worker.onerror = (e) => {
      console.error('Worker error:', e);
      loaded.value = false;
      error.value = 'Worker通信错误';
      loading.value = false;
    };
  }
};

const loadModel = async () => {
  if (!worker) {
    initWorker();
  }
  
  loading.value = true;
  loaded.value = false;
  error.value = '';
  
  try {
    worker!.postMessage({
      type: 'init',
      data: { modelName: selectedModel.value }
    });
  } catch (e: any) {
    error.value = e.message || '未知错误';
    loading.value = false;
  }
};

const save = () => {
  if (loaded.value) {
    emit('save', selectedModel.value);
  }
};

// 生命周期
onMounted(() => {
  initWorker();
});

onUnmounted(() => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
});
</script>

<style scoped>
/* 模态框样式继承Bootstrap主题 */
</style> 