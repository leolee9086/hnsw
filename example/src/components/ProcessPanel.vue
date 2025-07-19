<template>
  <div class="process-panel">
    <div class="process-header">
      <h5 class="mb-0">
        <i class="bi bi-gear-wide-connected me-2"></i>
        AI 处理过程
      </h5>
      <button 
        v-if="processSteps.length > 0"
        class="btn btn-outline-secondary btn-sm" 
        @click="$emit('clearSteps')"
        title="清空处理记录"
      >
        <i class="bi bi-trash"></i>
      </button>
    </div>
    
    <div class="process-content" ref="processContainer">
      <!-- 模型状态显示 -->
      <div v-if="modelStatuses.length > 0" class="model-statuses">
        <h6 class="mb-2">
          <i class="bi bi-cpu me-1"></i>
          模型状态
        </h6>
        <div class="model-status-list">
          <div 
            v-for="status in modelStatuses" 
            :key="status.id"
            class="model-status-item"
            :class="status.status"
          >
            <div class="status-icon">
              <i v-if="status.status === 'streaming'" class="bi bi-arrow-repeat spin"></i>
              <i v-else-if="status.status === 'completed'" class="bi bi-check-circle"></i>
              <i v-else-if="status.status === 'error'" class="bi bi-exclamation-triangle"></i>
              <i v-else class="bi bi-clock"></i>
            </div>
            <div class="status-info">
              <div class="model-name">{{ status.name }}</div>
              <div class="status-text">
                <span v-if="status.status === 'streaming'" class="text-warning">响应中...</span>
                <span v-else-if="status.status === 'completed'" class="text-success">已完成</span>
                <span v-else-if="status.status === 'error'" class="text-danger">{{ status.error }}</span>
                <span v-else class="text-muted">等待中</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 处理步骤列表 -->
      <div v-if="processSteps.length === 0" class="empty-state">
        <i class="bi bi-robot display-1 text-muted"></i>
        <p class="text-muted mt-3">等待AI开始处理...</p>
      </div>
      
      <div v-else class="process-steps">
        <div 
          v-for="(step, index) in processSteps" 
          :key="step.id" 
          class="process-step"
          :class="step.status"
        >
          <div class="step-header">
            <div class="step-icon">
              <i v-if="step.status === 'pending'" class="bi bi-clock"></i>
              <i v-else-if="step.status === 'processing'" class="bi bi-arrow-clockwise spin"></i>
              <i v-else-if="step.status === 'success'" class="bi bi-check-circle"></i>
              <i v-else-if="step.status === 'error'" class="bi bi-x-circle"></i>
            </div>
            <div class="step-title">{{ step.title }}</div>
            <div class="step-time">{{ step.time }}</div>
          </div>
          
          <div v-if="step.details" class="step-details">
            <div v-if="step.type === 'search'" class="search-details">
              <div class="search-query">
                <strong>搜索查询:</strong> {{ step.details.query }}
              </div>
              <div v-if="step.details.results" class="search-results">
                <strong>找到 {{ step.details.results.length }} 个相关片段:</strong>
                <div v-for="(result, idx) in step.details.results.slice(0, 3)" :key="idx" class="search-result">
                  <div class="result-text">{{ result.text.substring(0, 100) }}...</div>
                  <div class="result-meta">
                    <span class="result-score">相似度: {{ (result.score * 100).toFixed(1) }}%</span>
                    <span class="result-source">来源: {{ result.file }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else-if="step.type === 'embedding'" class="embedding-details">
              <div class="embedding-info">
                <strong>向量化:</strong> {{ step.details.text.substring(0, 50) }}...
              </div>
              <div class="embedding-meta">
                <span>维度: {{ step.details.dimensions }}</span>
                <span>耗时: {{ step.details.duration }}ms</span>
              </div>
            </div>
            
            <div v-else-if="step.type === 'generation'" class="generation-details">
              <div class="generation-info">
                <strong>生成内容:</strong>
              </div>
              <div class="generation-text">{{ step.details.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface ProcessStep {
  id: string;
  title: string;
  type: 'search' | 'embedding' | 'generation';
  status: 'pending' | 'processing' | 'success' | 'error';
  time: string;
  details?: any;
}

interface ModelStatus {
  id: string;
  name: string;
  status: 'idle' | 'streaming' | 'completed' | 'error';
  error?: string;
}

interface Props {
  processSteps: ProcessStep[];
  modelStatuses: ModelStatus[];
}

const props = defineProps<Props>();
defineEmits<{
  clearSteps: [];
}>();

const processContainer = ref<HTMLElement | null>(null);

const scrollProcessToBottom = () => {
  nextTick(() => {
    processContainer.value?.scrollTo({ top: processContainer.value.scrollHeight, behavior: 'smooth' });
  });
};

// 监听步骤变化，自动滚动到底部
watch(() => props.processSteps.length, () => {
  scrollProcessToBottom();
});

// 暴露方法给父组件
defineExpose({
  scrollProcessToBottom
});
</script>

<style scoped>
/* 右侧处理面板 */
.process-panel {
  display: flex;
  flex-direction: column;
  width: 400px;
  min-width: 350px;
  background: var(--bs-secondary-bg);
  border-left: 1px solid var(--bs-border-color);
}

.process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  flex-shrink: 0;
}

.process-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

/* 模型状态显示 */
.model-statuses {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.model-status-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.model-status-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  transition: all 0.2s ease;
}

.model-status-item.streaming {
  border-color: #ffc107;
  background: rgba(255, 193, 7, 0.1);
}

.model-status-item.completed {
  border-color: #198754;
  background: rgba(25, 135, 84, 0.1);
}

.model-status-item.error {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

.status-icon {
  font-size: 1.1rem;
}

.status-icon .spin {
  animation: spin 1s linear infinite;
}

.status-info {
  flex: 1;
}

.model-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.status-text {
  font-size: 0.8rem;
  margin-top: 0.125rem;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--bs-secondary-color);
  text-align: center;
}

/* 处理步骤 */
.process-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.process-step {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
}

.process-step.pending {
  border-left: 4px solid var(--bs-secondary);
}

.process-step.processing {
  border-left: 4px solid var(--bs-primary);
}

.process-step.success {
  border-left: 4px solid var(--bs-success);
}

.process-step.error {
  border-left: 4px solid var(--bs-danger);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.step-icon {
  font-size: 1.1rem;
}

.step-icon .spin {
  animation: spin 1s linear infinite;
}

.step-title {
  flex: 1;
  font-weight: 500;
}

.step-time {
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
}

.step-details {
  font-size: 0.9rem;
  line-height: 1.4;
}

/* 搜索详情 */
.search-details {
  margin-top: 0.5rem;
}

.search-query {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--bs-light);
  border-radius: 0.25rem;
}

.search-results {
  margin-top: 0.5rem;
}

.search-result {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--bs-light);
  border-radius: 0.25rem;
}

.result-text {
  margin-bottom: 0.25rem;
  font-style: italic;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
}

/* 嵌入详情 */
.embedding-details {
  margin-top: 0.5rem;
}

.embedding-info {
  margin-bottom: 0.25rem;
}

.embedding-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
}

/* 生成详情 */
.generation-details {
  margin-top: 0.5rem;
}

.generation-info {
  margin-bottom: 0.5rem;
}

.generation-text {
  padding: 0.5rem;
  background: var(--bs-light);
  border-radius: 0.25rem;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 