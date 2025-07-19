<template>
  <div class="message-item error-message">
    <div class="message-content">
      <div class="message-header">
        <span class="message-time">错误</span>
        <div class="message-actions">
          <button 
            class="btn btn-sm btn-outline-warning"
            @click="$emit('retry-chat')"
            title="重试"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>
      <div class="message-text text-danger">
        <i class="bi bi-exclamation-triangle me-1"></i>
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 错误消息组件
 * 显示聊天错误信息和重试按钮
 */
interface Props {
  /** 错误信息 */
  error: string;
}

interface Emits {
  /** 重试聊天 */
  'retry-chat': [];
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
.message-item {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.error-message {
  align-items: flex-start;
}

.message-content {
  max-width: 90%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--bs-danger-bg-subtle);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--bs-danger-border-subtle);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.9;
}

.message-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.message-actions .btn {
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  line-height: 1;
}

.message-text {
  line-height: 1.6;
  font-size: 0.95rem;
  word-wrap: break-word;
  white-space: pre-wrap;
  color: var(--bs-danger);
  font-weight: 500;
}
</style> 