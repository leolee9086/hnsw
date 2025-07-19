<template>
  <div class="chat-panels-scroll-container">
    <div class="chat-panels-container">
      <!-- 汇总卡片 -->
      <div class="summary-card">
        <div class="card-content">
          <h6 class="mb-2">
            <i class="bi bi-chat-dots me-1"></i>
            多模型并行对话 ({{ activeChatsCount }}个模型)
          </h6>
          
          <!-- AI处理状态 -->
          <div v-if="processSteps && processSteps.length > 0" class="process-status mb-3">
            <h6 class="text-muted mb-2">
              <i class="bi bi-gear me-1"></i>
              AI处理状态
            </h6>
            <div class="process-steps">
              <div 
                v-for="step in processSteps.slice(0, 3)" 
                :key="step.id"
                class="process-step"
                :class="step.status"
              >
                <i 
                  :class="{
                    'bi bi-clock': step.status === 'pending',
                    'bi bi-arrow-repeat': step.status === 'processing',
                    'bi bi-check-circle': step.status === 'success',
                    'bi bi-exclamation-triangle': step.status === 'error'
                  }"
                  class="me-1"
                ></i>
                <span class="step-title">{{ step.title }}</span>
                <span 
                  v-if="step.status === 'processing'" 
                  class="spinner-border spinner-border-sm ms-1"
                ></span>
              </div>
              <button 
                v-if="processSteps.length > 3"
                class="btn btn-link btn-sm p-0"
                @click="$emit('clear-steps')"
                title="清除处理步骤"
              >
                查看更多...
              </button>
            </div>
          </div>
          
          <!-- 模型状态 -->
          <div v-if="modelStatuses && modelStatuses.length > 0" class="model-status mb-3">
            <h6 class="text-muted mb-2">
              <i class="bi bi-cpu me-1"></i>
              模型状态
            </h6>
            <div class="model-list">
              <div 
                v-for="model in modelStatuses.slice(0, 3)" 
                :key="model.name"
                class="model-item"
              >
                <span class="model-name">{{ model.name }}</span>
                <span class="model-status-badge" :class="model.status">
                  {{ model.status }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="d-flex gap-2">
            <button 
              class="btn btn-outline-secondary btn-sm"
              @click="$emit('add-more-models')"
              :disabled="isProcessing"
              title="添加更多模型"
            >
              <i class="bi bi-plus-circle me-1"></i>
              添加模型
            </button>
            <button 
              class="btn btn-outline-danger btn-sm"
              @click="$emit('close-all-chats')"
              title="关闭所有对话"
            >
              <i class="bi bi-x-circle me-1"></i>
              关闭所有
            </button>
          </div>
        </div>
      </div>
      
      <!-- 聊天面板 -->
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
  /** 活跃聊天数量 */
  activeChatsCount: number;
  /** 处理步骤 */
  processSteps?: Array<{
    id: string;
    title: string;
    type?: 'search' | 'embedding' | 'generation';
    status: 'pending' | 'processing' | 'success' | 'error';
    time?: string;
    details?: any;
  }>;
  /** 模型状态 */
  modelStatuses?: Array<{
    name: string;
    status: string;
    progress?: number;
  }>;
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
  /** 添加更多模型 */
  'add-more-models': [];
  /** 关闭所有聊天 */
  'close-all-chats': [];
  /** 清除处理步骤 */
  'clear-steps': [];
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
  height: 100%;
  max-height: 100%;
  /* 确保滚动条不会影响布局 */
  scrollbar-width: thin;
  scrollbar-color: var(--bs-secondary) transparent;
}

/* 自定义滚动条样式 */
.chat-panels-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.chat-panels-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.chat-panels-scroll-container::-webkit-scrollbar-thumb {
  background: var(--bs-secondary);
  border-radius: 4px;
}

.chat-panels-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--bs-secondary-dark);
}

/* 水平排列的聊天面板容器 */
.chat-panels-container {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  min-width: max-content;
  height: 100%;
  align-items: stretch;
}

/* 汇总卡片样式 */
.summary-card {
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
  flex-shrink: 0;
  overflow: hidden;
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
  overflow-y: auto;
  max-height: 100%;
}

.summary-card h6 {
  margin-bottom: 1rem;
  color: var(--bs-body-color);
  font-weight: 600;
}

.summary-card .btn {
  font-size: 0.875rem;
}

/* 处理状态样式 */
.process-status, .model-status {
  border-top: 1px solid var(--bs-border-color);
  padding-top: 0.75rem;
}

.process-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.process-step {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.process-step.pending {
  color: var(--bs-secondary);
}

.process-step.processing {
  color: var(--bs-warning);
}

.process-step.success {
  color: var(--bs-success);
}

.process-step.error {
  color: var(--bs-danger);
}

.step-title {
  flex: 1;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.model-name {
  font-weight: 500;
}

.model-status-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--bs-light);
  color: var(--bs-body-color);
}

.model-status-badge.online {
  background: var(--bs-success-bg-subtle);
  color: var(--bs-success);
}

.model-status-badge.offline {
  background: var(--bs-danger-bg-subtle);
  color: var(--bs-danger);
}

.model-status-badge.processing {
  background: var(--bs-warning-bg-subtle);
  color: var(--bs-warning);
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