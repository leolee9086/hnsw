<template>
  <div 
    class="message-item"
    :class="{ 'user-message': message.isUser, 'ai-message': !message.isUser }"
  >
    <div class="message-content">
      <div class="message-header">
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        <div class="message-actions">
          <button 
            v-if="!message.isUser"
            class="btn btn-sm btn-outline-secondary"
            @click="$emit('resend-message', message.text)"
            title="重新发送"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button 
            class="btn btn-sm btn-outline-secondary"
            @click="$emit('edit-message', messageIndex, message.text)"
            title="编辑消息"
          >
            <i class="bi bi-pencil"></i>
          </button>
          <button 
            class="btn btn-sm btn-outline-danger"
            @click="$emit('delete-message', messageIndex)"
            title="删除消息"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div class="message-text" v-html="message.text"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from './types';

/**
 * 聊天消息组件
 * 显示单条聊天消息，支持用户和AI消息的不同样式
 */

interface Props {
  /** 消息对象 */
  message: Message;
  /** 消息索引 */
  messageIndex: number;
}

interface Emits {
  /** 重新发送消息 */
  'resend-message': [messageText: string];
  /** 编辑消息 */
  'edit-message': [messageIndex: number, messageText: string];
  /** 删除消息 */
  'delete-message': [messageIndex: number];
}

defineProps<Props>();
defineEmits<Emits>();

/**
 * 格式化时间戳为可读时间
 * @param timestamp 时间戳
 * @returns 格式化的时间字符串
 */
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};
</script>

<style scoped>
.message-item {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

.user-message {
  align-items: flex-end;
}

.ai-message {
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

.user-message .message-content {
  background: var(--bs-primary);
  color: white;
  border-color: var(--bs-primary);
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
}

.user-message .message-text {
  color: white;
  font-weight: 500;
}

.ai-message .message-text {
  color: var(--bs-body-color);
}
</style> 