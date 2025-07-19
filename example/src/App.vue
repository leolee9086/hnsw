

<template>
  <div class="app-layout">
    <!-- Header - 只在独立模式下显示 -->
    <AppHeader 
      v-if="!isEmbedded"
      :status="status"
      @show-settings="showSettings"
    />

    <!-- Multi Model Chat -->
    <MultiModelChat 
      :process-steps="processStepManager.getSteps().value"
      :model-statuses="modelStatuses"
      @clear-steps="clearProcessSteps"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { hnsw as HNSW } from '@leolee9086/hnsw';
import { processFileContent, isSupportedFile, getFileTypeDescription } from './utils/fileProcessor';

// 导入组件
import AppHeader from './components/AppHeader.vue';
import MultiModelChat from './components/MultiModelChat.vue';
import SettingsModal from './components/SettingsModal.vue';

// 导入服务
import { createChatProvider, createEmbeddingProvider, type ChatProvider, type EmbeddingProvider } from './services/AIProviderService';
import { ProcessStepManager } from './services/ProcessStepManager';

// 定义props
const props = defineProps<{
  sharedData?: {
    textChunks: Array<{ id: number; text: string; file: string }>;
    vectorChunks: Array<{ id: number; text: string; vector: number[]; file: string }>;
    selectedModel: string;
  };
  offlineEmbedder?: EmbeddingProvider | null;
  embeddingModel?: string;
}>();

// 判断是否嵌入模式（在MainApp中）
const isEmbedded = computed(() => !!props.sharedData);

const { t } = useI18n();

// 初始化处理步骤管理器
const processStepManager = new ProcessStepManager();

// 组件引用
const multiModelChatRef = ref<InstanceType<typeof MultiModelChat> | null>(null);

// --- Reactive State ---
const status = computed(() => {
    switch (statusKey.value) {
        case 'initial':
            return { text: t('status.initial'), badgeClass: 'bg-secondary' };
        case 'readyForUpload':
            return { text: t('status.readyForUpload'), badgeClass: 'bg-info' };
        case 'processing':
            return { text: t('status.processing'), badgeClass: 'bg-warning' };
        case 'embedding':
            return { text: t('status.embedding', { count: chunkCount.value }), badgeClass: 'bg-warning' };
        case 'indexing':
            return { text: t('status.indexing'), badgeClass: 'bg-warning' };
        case 'readyToChat':
            if (isReady.value) {
                return { text: `RAG模式 - ${chunkCount.value}个文档块`, badgeClass: 'bg-success' };
            } else {
                return { text: '多模型聊天模式', badgeClass: 'bg-success' };
            }
        case 'error':
            return { text: t('status.error'), badgeClass: 'bg-danger' };
        default:
            return { text: '', badgeClass: 'bg-secondary' };
    }
});

const statusKey = ref('initial');
const chunkCount = ref(0);
const isReady = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

let hnswIndex: any = null; // Using any to avoid complex type from hnsw library
let textChunks: string[] = [];

// 模型状态计算属性
const modelStatuses = computed(() => {
  // 这里可以从MultiModelChat组件获取模型状态
  // 暂时返回空数组，后续可以通过事件或全局状态管理
  return [];
});

// --- Lifecycle Hooks ---
onMounted(() => {
  // 动态计算滚动条高度
  const calculateScrollbarHeight = () => {
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    (outer.style as any).msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);
    
    const inner = document.createElement('div');
    outer.appendChild(inner);
    
    const scrollbarHeight = outer.offsetHeight - inner.offsetHeight;
    outer.parentNode?.removeChild(outer);
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--scrollbar-height', `${scrollbarHeight}px`);
    document.documentElement.style.setProperty('--available-height', `calc(100vh - ${scrollbarHeight}px)`);
    
    return scrollbarHeight;
  };
  
  // 计算滚动条高度
  const scrollbarHeight = calculateScrollbarHeight();
  console.log('检测到滚动条高度:', scrollbarHeight, 'px');
  
  // 现在使用MultiModelChat组件，不需要模态框初始化
  // 检查是否有共享数据
  if (props.sharedData && (props.sharedData.textChunks.length > 0 || props.sharedData.vectorChunks.length > 0)) {
    console.log('检测到共享数据，设置RAG模式');
    // 如果有共享数据，直接设置状态
    statusKey.value = 'readyToChat';
    isReady.value = true;
    textChunks = props.sharedData.textChunks.map(chunk => chunk.text);
    chunkCount.value = textChunks.length;
    // 如果有向量数据，构建HNSW索引
    if (props.sharedData.vectorChunks.length > 0) {
      const dimensions = props.sharedData.vectorChunks[0].vector.length;
      hnswIndex = HNSW.createIndex({ M: 16, efConstruction: 200, metricType: 'cosine' });
      for (const chunk of props.sharedData.vectorChunks) {
        hnswIndex.insertNode(chunk.vector);
      }
    }
  }
  // 注意：现在使用MultiModelChat组件，它会自己处理模型选择，不需要显示设置模态框
});

// --- Methods ---
const cleanupModalBackdrop = () => {
  // 强制移除所有模态框遮罩
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => {
    backdrop.remove();
  });
  // 移除body的modal-open类
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  // 确保所有模态框相关样式被清理
  const modalElements = document.querySelectorAll('.modal');
  modalElements.forEach(modal => {
    modal.classList.remove('show');
    (modal as HTMLElement).style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  });
  console.log('模态框遮罩清理完成，移除了', backdrops.length, '个遮罩元素');
};

const showSettings = () => {
  // 现在使用MultiModelChat组件，不需要显示设置模态框
  console.log('设置功能已移至模型配置界面');
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  // 检查文件是否支持
  if (!isSupportedFile(file.name)) {
    alert(`不支持的文件格式: ${file.name}`);
    return;
  }
  statusKey.value = 'processing';
  try {
    // 处理文件内容
    const processedFile = await processFileContent(file);
    console.log(`处理文件: ${file.name} (${getFileTypeDescription(file.name)})`);
    textChunks = chunkText(processedFile.content);
    statusKey.value = 'embedding';
    chunkCount.value = textChunks.length;
    // 这里不再处理embeddingProvider，交由多模型聊天或后续处理
    statusKey.value = 'indexing';
    // ...如有后续索引逻辑可补充...
    isReady.value = true;
    statusKey.value = 'readyToChat';
  } catch (error) {
    console.error('Error processing file:', error);
    statusKey.value = 'error';
    alert('Failed to process the document. See console for details.');
    isReady.value = false;
  }
};

const chunkText = (text: string, chunkSize = 500, overlap = 50): string[] => {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.substring(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
};

const clearProcessSteps = () => {
  processStepManager.clearSteps();
};

</script>

<style>
/* 全屏布局样式 */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  /* 计算可用高度，减去滚动条高度 */
  --scrollbar-height: 16px;
  --available-height: calc(100vh - var(--scrollbar-height));
}

.app-header {
  background: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color);
  padding: 1rem;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 确保模态框遮罩不会干扰输入 */
.modal-backdrop {
  z-index: 1040;
}

/* 强制隐藏残留的遮罩 */
.modal-backdrop:not(.show) {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .process-panel {
    width: 350px;
    min-width: 300px;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .chat-panel {
    border-right: none;
    border-bottom: 1px solid var(--bs-border-color);
  }
  
  .process-panel {
    width: 100%;
    min-width: auto;
    border-left: none;
  }
}
</style>
