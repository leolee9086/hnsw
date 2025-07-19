<template>
  <div class="chat-panels-scroll-container">
    <div class="chat-panels-container">
      <ChatPanel 
        v-for="(chat, index) in activeChats" 
        :key="chat.id"
        :chat="chat"
        :chat-index="index"
        :is-processing="isProcessing"
        @close-chat="$emit('close-chat', $event)"
        @resend-message="(chat, messageText) => $emit('resend-message', chat, messageText)"
        @edit-message="(chat, messageIndex, messageText) => $emit('edit-message', chat, messageIndex, messageText)"
        @delete-message="(chat, messageIndex) => $emit('delete-message', chat, messageIndex)"
        @retry-chat="$emit('retry-chat', $event)"
        @retry-chat-with-strategy="(chat, strategy) => $emit('retry-chat-with-strategy', chat, strategy)"
        @action="(action, chat) => $emit('action', action, chat)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatStream } from './types';
import ChatPanel from './ChatPanel.vue';

/**
 * 聊天面板容器组件
 * 管理水平滚动的聊天面板布局
 */

interface Props {
  /** 活跃聊天列表 */
  activeChats: ChatStream[];
  /** 是否正在处理中 */
  isProcessing: boolean;
}

interface Emits {
  /** 关闭聊天 */
  'close-chat': [chatIndex: number];
  /** 重新发送消息 */
  'resend-message': [chat: ChatStream, messageText: string];
  /** 编辑消息 */
  'edit-message': [chat: ChatStream, messageIndex: number, messageText: string];
  /** 删除消息 */
  'delete-message': [chat: ChatStream, messageIndex: number];
  /** 重试聊天 */
  'retry-chat': [chat: ChatStream];
  /** 带策略的重试聊天 */
  'retry-chat-with-strategy': [chat: ChatStream, strategy: string];
  /** 执行操作 */
  'action': [action: string, chat: ChatStream];
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
/* 水平滚动容器 */
.chat-panels-scroll-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  min-height: 0;
}

/* 水平排列的聊天面板容器 */
.chat-panels-container {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  min-width: max-content;
  height: 100%;
}

/* 自定义滚动条 */
.chat-panels-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.chat-panels-scroll-container::-webkit-scrollbar-track {
  background: var(--bs-light);
  border-radius: 4px;
}

.chat-panels-scroll-container::-webkit-scrollbar-thumb {
  background: var(--bs-secondary);
  border-radius: 4px;
}

.chat-panels-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--bs-secondary-dark);
}
</style> 