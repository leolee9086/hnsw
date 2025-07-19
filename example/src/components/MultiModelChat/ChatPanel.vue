<template>
  <div 
    class="chat-panel"
    :class="{
      'streaming': chat.status === 'streaming',
      'error': chat.status === 'error',
      'completed': chat.status === 'completed'
    }"
  >
    <!-- 面板标题 -->
    <div class="panel-header">
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <i class="bi bi-chat me-1"></i>
          <strong>{{ chat.modelName }}</strong>
          <div class="status-indicator ms-2">
            <span 
              v-if="chat.status === 'streaming'" 
              class="badge bg-warning streaming-badge"
            >
              <i class="bi bi-arrow-repeat me-1"></i>
              响应中
            </span>
            <span 
              v-else-if="chat.status === 'completed'" 
              class="badge bg-success"
            >
              <i class="bi bi-check-circle me-1"></i>
              完成
            </span>
            <span 
              v-else-if="chat.status === 'error'" 
              class="badge bg-danger error-badge"
            >
              <i class="bi bi-exclamation-triangle me-1"></i>
              错误
            </span>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <ChatThreadMenu 
            :chat="chat"
            :is-processing="isProcessing"
            @retry-chat="(chat, strategy) => $emit('retry-chat-with-strategy', chat, strategy)"
            @action="(action, chat) => $emit('action', action, chat)"
          />
          <button 
            class="btn-close btn-sm"
            @click="$emit('close-chat', chatIndex)"
            title="关闭对话"
          ></button>
        </div>
      </div>
    </div>
    
    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesContainer">
      <ChatMessage 
        v-for="(message, msgIndex) in chat.messages" 
        :key="msgIndex"
        :message="message"
        :message-index="msgIndex"
        @resend-message="$emit('resend-message', chat, $event)"
        @edit-message="(messageIndex, messageText) => $emit('edit-message', chat, messageIndex, messageText)"
        @delete-message="$emit('delete-message', chat, $event)"
      />
      
      <!-- 流式响应显示 -->
      <StreamingMessage 
        v-if="chat.status === 'streaming' && chat.currentResponse"
        :current-response="chat.currentResponse"
      />
      
      <!-- 错误显示 -->
      <ErrorMessage 
        v-if="chat.status === 'error' && chat.error"
        :error="chat.error"
        @retry-chat="$emit('retry-chat', chat)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import type { Message, ChatStream } from './types';
import ChatMessage from './ChatMessage.vue';
import StreamingMessage from './StreamingMessage.vue';
import ErrorMessage from './ErrorMessage.vue';
import ChatThreadMenu from './ChatThreadMenu.vue';

/**
 * 聊天面板组件
 * 显示单个模型的聊天界面，包含消息列表和状态指示器
 */

interface Props {
  /** 聊天流对象 */
  chat: ChatStream;
  /** 聊天索引 */
  chatIndex: number;
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

const props = defineProps<Props>();
defineEmits<Emits>();

const messagesContainer = ref<HTMLElement | null>(null);

// 监听消息变化，自动滚动
watch(() => props.chat.messages.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-body-bg);
  min-width: 350px;
  max-width: 450px;
  width: 400px;
  height: 100%;
  transition: all 0.3s ease;
}

/* 响应中发光效果 */
.chat-panel.streaming {
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.3);
  border-color: #ffc107;
}

/* 错误状态红光 */
.chat-panel.error {
  box-shadow: 0 0 20px rgba(220, 53, 69, 0.3);
  border-color: #dc3545;
}

/* 完成状态 */
.chat-panel.completed {
  border-color: #198754;
}

.panel-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-light);
  border-radius: 0.5rem 0.5rem 0 0;
  flex-shrink: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.streaming-badge {
  animation: pulse 1.5s infinite;
}

.error-badge {
  animation: shake 0.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

/* 自定义滚动条 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--bs-secondary);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--bs-secondary-dark);
}
</style> 