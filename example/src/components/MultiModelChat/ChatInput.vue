<template>
  <div class="chat-input-area">
    <div class="input-container">
      <div class="input-row">
        <textarea 
          class="form-control"
          placeholder="输入消息... (Ctrl+Enter 发送给所有模型)"
          v-model="userInput"
          @keydown="handleKeydown"
          :disabled="isProcessing"
          rows="3"
        ></textarea>
        
        <button 
          class="btn btn-primary send-button"
          @click="$emit('send-message')"
          :disabled="isProcessing || !userInput.trim()"
          title="发送消息"
        >
          <span v-if="isProcessing" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-send me-1"></i>
          发送
        </button>
      </div>
      
      <div class="input-info">
        <span class="text-muted small">
          将发送给 {{ activeChatsCount }} 个模型
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

/**
 * 聊天输入组件
 * 提供统一的输入界面，支持键盘快捷键
 */
interface Props {
  /** 活跃聊天数量 */
  activeChatsCount: number;
  /** 是否正在处理中 */
  isProcessing: boolean;
  /** 当前输入内容 */
  modelValue: string;
}

interface Emits {
  /** 更新输入内容 */
  'update:modelValue': [value: string];
  /** 发送消息 */
  'send-message': [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const userInput = ref(props.modelValue);

// 监听外部输入值变化
watch(() => props.modelValue, (newValue) => {
  userInput.value = newValue;
});

// 监听内部输入值变化
watch(userInput, (newValue) => {
  emit('update:modelValue', newValue);
});

/**
 * 处理键盘事件
 * @param event 键盘事件对象
 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    emit('send-message');
  }
};
</script>

<style scoped>
.chat-input-area {
  border-top: 1px solid var(--bs-border-color);
  padding: 0.75rem;
  background: var(--bs-body-bg);
  flex-shrink: 0;
  min-height: 0;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.input-info {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.send-button {
  flex-shrink: 0;
  height: fit-content;
  padding: 0.5rem 1rem;
  white-space: nowrap;
}

/* 优化textarea高度 */
.form-control {
  resize: none;
  min-height: 60px;
  max-height: 120px;
  flex: 1;
}
</style> 