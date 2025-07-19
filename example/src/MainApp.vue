<template>
  <div class="main-app">
    <!-- 应用切换导航 -->
    <nav class="navbar navbar-dark bg-dark py-2">
      <div class="container-fluid">
        <a class="navbar-brand fs-6" href="#">
          <i class="bi bi-search me-1"></i>
          HNSW 演示应用
        </a>
        <ul class="navbar-nav ms-auto flex-row">
          <li class="nav-item">
            <a 
              class="nav-link" 
              :class="{ active: currentApp === 'search' }"
              href="#"
              @click.prevent="switchApp('search')"
            >
              <i class="bi bi-search me-1"></i>
              文件搜索
            </a>
          </li>
          <li class="nav-item">
            <a 
              class="nav-link" 
              :class="{ active: currentApp === 'rag' }"
              href="#"
              @click.prevent="switchApp('rag')"
            >
              <i class="bi bi-robot me-1"></i>
              RAG 聊天
            </a>
          </li>
          <li class="nav-item">
            <a 
              class="nav-link" 
              href="#"
              @click.prevent="showModelConfigModal"
            >
              <i class="bi bi-gear me-1"></i>
              模型配置
            </a>
          </li>
        </ul>
      </div>
    </nav>

    <!-- 应用内容区域 -->
    <div class="app-container">
      <!-- 文件搜索应用 -->
      <FileSearchApp 
        v-if="currentApp === 'search'"
        ref="fileSearchApp"
        @file-processed="handleFileProcessed"
        :offline-embedder="offlineEmbedder"
        :embedding-model="embeddingModel"
      />
      
      <!-- RAG 聊天应用 -->
      <App 
        v-if="currentApp === 'rag'"
        ref="ragApp"
        :shared-data="sharedData"
        :offline-embedder="offlineEmbedder"
        :embedding-model="embeddingModel"
      />
    </div>

    <!-- 嵌入模型设置弹窗 -->
    <EmbeddingSettingsModal
      :is-visible="showEmbeddingSettings"
      :current-model="embeddingModel"
      @save="onEmbeddingModelSave"
    />

    <!-- 模型配置弹窗 -->
    <ModelConfigModal
      :is-visible="showModelConfig"
      @close="closeModelConfigModal"
      @model-selected="onModelSelected"
    />

    <!-- 应用间数据共享提示 -->
    <div v-if="showDataShareTip" class="alert alert-info alert-dismissible fade show position-fixed" style="top: 80px; right: 20px; z-index: 1050;">
      <i class="bi bi-info-circle me-2"></i>
      <strong>数据共享提示:</strong> 在文件搜索应用中上传的文件数据可以在RAG聊天应用中使用
      <button type="button" class="btn-close" @click="showDataShareTip = false"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FileSearchApp from './FileSearchApp.vue';
import App from './App.vue';
import EmbeddingSettingsModal from './components/EmbeddingSettingsModal.vue';
import ModelConfigModal from './components/ModelConfigModal.vue';
import { createOfflineEmbeddingProvider, OfflineEmbeddingService } from './services/OfflineEmbeddingService';

// 当前应用状态
const currentApp = ref<'search' | 'rag'>('search');

// 应用引用
const fileSearchApp = ref<InstanceType<typeof FileSearchApp> | null>(null);
const ragApp = ref<InstanceType<typeof App> | null>(null);

// 共享数据
const sharedData = ref({
  textChunks: [] as Array<{ id: number; text: string; file: string }>,
  vectorChunks: [] as Array<{ id: number; text: string; vector: number[]; file: string }>,
  selectedModel: 'Xenova/all-MiniLM-L6-v2'
});

// 嵌入模型全局状态
const embeddingModel = ref('Xenova/all-MiniLM-L6-v2');
const offlineEmbedder = ref<OfflineEmbeddingService | null>(null);
const showEmbeddingSettings = ref(false);
const showModelConfig = ref(false);
let embeddingModalInstance: any = null;
let modelConfigModalInstance: any = null;

// 显示数据共享提示
const showDataShareTip = ref(false);

// 切换应用
const switchApp = (app: 'search' | 'rag') => {
  currentApp.value = app;
  if (app === 'rag' && (sharedData.value.textChunks.length > 0 || sharedData.value.vectorChunks.length > 0)) {
    showDataShareTip.value = true;
    setTimeout(() => {
      showDataShareTip.value = false;
    }, 5000);
  }
};

// 处理文件处理完成事件
const handleFileProcessed = (data: {
  textChunks: Array<{ id: number; text: string; file: string }>;
  vectorChunks: Array<{ id: number; text: string; vector: number[]; file: string }>;
  selectedModel: string;
}) => {
  sharedData.value = {
    textChunks: data.textChunks,
    vectorChunks: data.vectorChunks,
    selectedModel: data.selectedModel
  };
  console.log('文件数据已共享到RAG应用:', {
    textChunks: data.textChunks.length,
    vectorChunks: data.vectorChunks.length,
    model: data.selectedModel
  });
};

// 显示嵌入模型设置模态框
const showEmbeddingSettingsModal = () => {
  showEmbeddingSettings.value = true;
  if (embeddingModalInstance) {
    embeddingModalInstance.show();
  }
};

// 显示模型配置模态框
const showModelConfigModal = () => {
  showModelConfig.value = true;
  if (modelConfigModalInstance) {
    modelConfigModalInstance.show();
  }
};

// 嵌入模型保存回调
const onEmbeddingModelSave = async (model: string) => {
  embeddingModel.value = model;
  showEmbeddingSettings.value = false;
  if (embeddingModalInstance) {
    embeddingModalInstance.hide();
  }
  // 加载新模型
  offlineEmbedder.value = createOfflineEmbeddingProvider(model);
  try {
    await offlineEmbedder.value.loadModel();
    console.log('离线嵌入模型已加载:', model);
  } catch (e: any) {
    alert('嵌入模型加载失败: ' + (e.message || e));
    offlineEmbedder.value = null;
  }
};

// 关闭模型配置模态框
const closeModelConfigModal = () => {
  showModelConfig.value = false;
  if (modelConfigModalInstance) {
    modelConfigModalInstance.hide();
  }
};

// 模型选择回调
const onModelSelected = (type: 'chat' | 'embedding', model: any) => {
  console.log('选择了模型:', type, model);
  // 这里可以根据选择的模型进行相应的处理
  // 比如更新聊天或嵌入模型的配置
};

// 生命周期
onMounted(() => {
  // 初始化嵌入模型设置模态框
  // @ts-ignore
  embeddingModalInstance = new bootstrap.Modal(document.getElementById('embeddingSettingsModal'));
  
  // 初始化模型配置模态框
  // @ts-ignore
  modelConfigModalInstance = new bootstrap.Modal(document.getElementById('modelConfigModal'));
  
  // 监听嵌入模型设置模态框隐藏事件
  const embeddingModalElement = document.getElementById('embeddingSettingsModal');
  if (embeddingModalElement) {
    embeddingModalElement.addEventListener('hidden.bs.modal', () => {
      showEmbeddingSettings.value = false;
    });
  }
  
  // 监听模型配置模态框隐藏事件
  const modelConfigModalElement = document.getElementById('modelConfigModal');
  if (modelConfigModalElement) {
    modelConfigModalElement.addEventListener('hidden.bs.modal', () => {
      showModelConfig.value = false;
    });
  }
  
  // 默认加载一次嵌入模型
  offlineEmbedder.value = createOfflineEmbeddingProvider(embeddingModel.value);
  offlineEmbedder.value.loadModel().then(() => {
    console.log('默认离线嵌入模型已加载:', embeddingModel.value);
  }).catch(e => {
    console.warn('默认嵌入模型加载失败:', e);
    offlineEmbedder.value = null;
  });
  console.log('主应用已加载，支持文件搜索和RAG聊天功能');
});
</script>

<style scoped>
.main-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.navbar-nav .nav-link {
  color: rgba(255, 255, 255, 0.7) !important;
  padding: 0.5rem 1rem;
  transition: all 0.2s ease;
}

.navbar-nav .nav-link:hover {
  color: rgba(255, 255, 255, 0.9) !important;
  background-color: rgba(255, 255, 255, 0.1);
}

.navbar-nav .nav-link.active {
  color: white !important;
  background-color: rgba(255, 255, 255, 0.2);
}

.navbar-nav.flex-row .nav-item {
  margin-right: 0.5rem;
}

.navbar-nav.flex-row .nav-item:last-child {
  margin-right: 0;
}

.alert {
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style> 