<template>
  <div class="message-item ai-message">
    <div class="message-content">
      <div class="message-header">
        <span class="message-time">正在响应...</span>
      </div>
      <div class="message-text streaming">
        {{ currentResponse }}
        <span class="cursor">|</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 流式响应消息组件
 * 显示正在生成中的AI响应内容
 */
interface Props {
  /** 当前响应内容 */
  currentResponse: string;
}

defineProps<Props>();
</script>

<style scoped>
.message-item {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-content {
  max-width: 90%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--bs-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--bs-border-color);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.9;
}

.message-text {
  line-height: 1.6;
  font-size: 0.95rem;
  word-wrap: break-word;
  white-space: pre-wrap;
  color: var(--bs-body-color);
}

.message-text.streaming {
  position: relative;
}

.cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style> 