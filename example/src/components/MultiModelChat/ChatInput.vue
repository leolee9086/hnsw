<template>
  <div class="chat-input-area">
    <div class="input-container">
      <textarea 
        class="form-control"
        placeholder="输入消息... (Ctrl+Enter 发送给所有模型)"
        v-model="userInput"
        @keydown="handleKeydown"
        :disabled="isProcessing"
        rows="3"
      ></textarea>
      
      <div class="input-actions">
        <div class="d-flex align-items-center gap-2">
          <span class="text-muted small">
            将发送给 {{ activeChatsCount }} 个模型
          </span>
          <button 
            class="btn btn-primary btn-sm"
            @click="$emit('send-message')"
            :disabled="isProcessing || !userInput.trim()"
            title="发送消息"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-send me-1"></i>
            发送
          </button>
        </div>
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
  padding: 1rem;
  background: var(--bs-body-bg);
  flex-shrink: 0;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 