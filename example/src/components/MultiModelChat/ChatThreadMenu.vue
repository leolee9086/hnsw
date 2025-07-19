<template>
  <div class="chat-thread-menu">
    <!-- 菜单按钮 -->
    <div class="menu-trigger">
      <button 
        class="btn btn-sm btn-outline-secondary dropdown-toggle"
        @click="toggleMenu"
        :disabled="isProcessing"
        title="聊天线程菜单"
      >
        <i class="bi bi-three-dots-vertical"></i>
      </button>
    </div>
    
    <!-- 下拉菜单 -->
    <div 
      v-if="isMenuVisible" 
      class="dropdown-menu show"
      :class="{ 'menu-expanded': isMenuExpanded }"
    >
      <!-- 重试策略 -->
      <div class="menu-section">
        <h6 class="menu-section-title">
          <i class="bi bi-arrow-clockwise me-1"></i>
          重试策略
        </h6>
        <div class="menu-items">
          <button 
            class="dropdown-item"
            @click="handleRetry('immediate')"
            :disabled="isProcessing"
          >
            <i class="bi bi-lightning me-2"></i>
            立即重试
          </button>
          <button 
            class="dropdown-item"
            @click="handleRetry('exponential')"
            :disabled="isProcessing"
          >
            <i class="bi bi-graph-up me-2"></i>
            指数退减重试
          </button>
          <button 
            class="dropdown-item"
            @click="handleRetry('linear')"
            :disabled="isProcessing"
          >
            <i class="bi bi-arrow-up me-2"></i>
            线性重试
          </button>
          <button 
            class="dropdown-item"
            @click="handleRetry('custom')"
            :disabled="isProcessing"
          >
            <i class="bi bi-gear me-2"></i>
            自定义重试
          </button>
        </div>
      </div>
      
      <!-- 高级操作 -->
      <div class="menu-section">
        <h6 class="menu-section-title">
          <i class="bi bi-tools me-1"></i>
          高级操作
        </h6>
        <div class="menu-items">
          <button 
            class="dropdown-item"
            @click="handleAction('clear-messages')"
            :disabled="isProcessing"
          >
            <i class="bi bi-trash me-2"></i>
            清空消息
          </button>
          <button 
            class="dropdown-item"
            @click="handleAction('export-chat')"
            :disabled="isProcessing"
          >
            <i class="bi bi-download me-2"></i>
            导出对话
          </button>
          <button 
            class="dropdown-item"
            @click="handleAction('duplicate-chat')"
            :disabled="isProcessing"
          >
            <i class="bi bi-files me-2"></i>
            复制对话
          </button>
          <button 
            class="dropdown-item"
            @click="handleAction('settings')"
            :disabled="isProcessing"
          >
            <i class="bi bi-gear me-2"></i>
            线程设置
          </button>
        </div>
      </div>
      
      <!-- 状态信息 -->
      <div class="menu-section">
        <h6 class="menu-section-title">
          <i class="bi bi-info-circle me-1"></i>
          状态信息
        </h6>
        <div class="menu-items">
          <div class="dropdown-item disabled">
            <i class="bi bi-clock me-2"></i>
            创建时间: {{ formatTime(chat.createdAt) }}
          </div>
          <div class="dropdown-item disabled">
            <i class="bi bi-chat me-2"></i>
            消息数量: {{ chat.messages.length }}
          </div>
          <div class="dropdown-item disabled">
            <i class="bi bi-arrow-repeat me-2"></i>
            重试次数: {{ chat.retryCount || 0 }}
          </div>
          <div class="dropdown-item disabled">
            <i class="bi bi-exclamation-triangle me-2"></i>
            错误次数: {{ chat.errorCount || 0 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ChatStream } from './types';

/**
 * 聊天线程菜单组件
 * 提供重试策略和高级操作功能
 */

interface Props {
  /** 聊天流对象 */
  chat: ChatStream;
  /** 是否正在处理中 */
  isProcessing: boolean;
}

interface Emits {
  /** 重试聊天 */
  'retry-chat': [chat: ChatStream, strategy: string];
  /** 执行操作 */
  'action': [action: string, chat: ChatStream];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 菜单状态
const isMenuVisible = ref(false);
const isMenuExpanded = ref(false);

/**
 * 切换菜单显示状态
 */
const toggleMenu = () => {
  isMenuVisible.value = !isMenuVisible.value;
  if (isMenuVisible.value) {
    // 点击外部关闭菜单
    setTimeout(() => {
      document.addEventListener('click', closeMenu, { once: true });
    }, 0);
  }
};

/**
 * 关闭菜单
 */
const closeMenu = () => {
  isMenuVisible.value = false;
  isMenuExpanded.value = false;
};

/**
 * 处理重试操作
 * @param strategy 重试策略
 */
const handleRetry = (strategy: string) => {
  emit('retry-chat', props.chat, strategy);
  closeMenu();
};

/**
 * 处理高级操作
 * @param action 操作类型
 */
const handleAction = (action: string) => {
  emit('action', action, props.chat);
  closeMenu();
};

/**
 * 格式化时间
 * @param timestamp 时间戳
 * @returns 格式化的时间字符串
 */
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.chat-thread-menu {
  position: relative;
}

.menu-trigger {
  display: flex;
  align-items: center;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  min-width: 280px;
  background: white;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  margin-top: 0.25rem;
}

.menu-section {
  border-bottom: 1px solid var(--bs-border-color);
  padding: 0.5rem 0;
}

.menu-section:last-child {
  border-bottom: none;
}

.menu-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--bs-secondary);
  margin: 0 1rem 0.5rem 1rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--bs-light);
}

.menu-items {
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--bs-body-color);
  text-decoration: none;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: var(--bs-light);
  color: var(--bs-body-color);
}

.dropdown-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dropdown-item.disabled {
  opacity: 0.7;
  cursor: default;
}

.dropdown-item.disabled:hover {
  background-color: transparent;
}

/* 重试策略图标颜色 */
.dropdown-item i.bi-lightning {
  color: #ffc107;
}

.dropdown-item i.bi-graph-up {
  color: #28a745;
}

.dropdown-item i.bi-arrow-up {
  color: #17a2b8;
}

.dropdown-item i.bi-gear {
  color: #6c757d;
}

/* 高级操作图标颜色 */
.dropdown-item i.bi-trash {
  color: #dc3545;
}

.dropdown-item i.bi-download {
  color: #007bff;
}

.dropdown-item i.bi-files {
  color: #6f42c1;
}

/* 状态信息图标颜色 */
.dropdown-item i.bi-clock,
.dropdown-item i.bi-chat,
.dropdown-item i.bi-arrow-repeat,
.dropdown-item i.bi-exclamation-triangle {
  color: #6c757d;
}
</style> 