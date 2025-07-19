<template>
  <div class="chat-panel">
    <!-- Chat Messages -->
    <div class="chat-messages" ref="chatMessagesContainer">
      <div v-for="(message, index) in messages" :key="index" class="mb-3 d-flex" :class="message.isUser ? 'justify-content-end' : 'justify-content-start'">
        <div class="card" style="max-width: 80%;">
          <div class="card-body">
            <p class="card-text" v-html="message.text"></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Input -->
    <div class="chat-input-container">
      <!-- Status Bar -->
      <div class="status-bar">
        <div v-if="!aiProvider" class="status-item status-warning">
          <i class="bi bi-exclamation-triangle me-1"></i>
          请先配置AI提供者
        </div>
        <div v-else-if="aiProvider && !isReady" class="status-item status-info">
          <i class="bi bi-info-circle me-1"></i>
          已配置AI提供者，可以开始聊天
        </div>
        <div v-else-if="aiProvider && isReady" class="status-item status-success">
          <i class="bi bi-check-circle me-1"></i>
          RAG模式已启用
        </div>
        <div v-if="isProcessing" class="status-item status-processing">
          <div class="spinner-border spinner-border-sm me-1" role="status"></div>
          正在处理...
        </div>
      </div>
      
      <!-- Input Area -->
      <div class="input-area">
        <div class="input-wrapper">
          <textarea 
            class="chat-input" 
            placeholder="输入消息... (Ctrl+Enter 发送)" 
            :value="userInput"
            @input="(event) => emit('update:userInput', (event.target as HTMLTextAreaElement).value)"
            @keydown="handleKeydown"
            :disabled="!aiProvider || isProcessing"
            ref="chatInput"
          ></textarea>
          
          <div class="input-actions">
            <button 
              class="action-btn attachment-btn" 
              type="button" 
              @click="$emit('triggerFileInput')" 
              :disabled="isProcessing"
              title="上传文档"
            >
              <i class="bi bi-paperclip"></i>
            </button>
            
            <button 
              class="action-btn send-btn" 
              type="button" 
              @click="$emit('sendMessage')" 
              :disabled="!aiProvider || isProcessing || !props.userInput.trim()"
              title="发送消息"
            >
              <span v-if="isProcessing" class="spinner-border spinner-border-sm" role="status"></span>
              <i v-else class="bi bi-send"></i>
            </button>
          </div>
        </div>
        
        <input type="file" ref="fileInput" @change="$emit('fileUpload', $event)" style="display: none" accept=".txt,.md,.json,.csv,.xml,.html,.htm,.log,.sql,.py,.js,.ts,.java,.cpp,.c,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.m,.pl,.sh,.bat,.ps1,.yml,.yaml,.toml,.ini,.cfg,.conf,.properties">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface Message {
  text: string;
  isUser: boolean;
}

interface Props {
  messages: Message[];
  userInput: string;
  aiProvider: any;
  isReady: boolean;
  isProcessing: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:userInput': [value: string];
  sendMessage: [];
  triggerFileInput: [];
  fileUpload: [event: Event];
}>();

const chatMessagesContainer = ref<HTMLElement | null>(null);
const chatInput = ref<HTMLTextAreaElement | null>(null);

const adjustTextareaHeight = () => {
  if (chatInput.value) {
    chatInput.value.style.height = 'auto';
    chatInput.value.style.height = Math.min(chatInput.value.scrollHeight, 120) + 'px';
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+Enter 发送消息
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    emit('sendMessage');
  }
  // 普通回车换行
  else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    // 在光标位置插入换行符
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = props.userInput;
    const newValue = value.substring(0, start) + '\n' + value.substring(end);
    emit('update:userInput', newValue);
    // 调整高度
    nextTick(() => {
      adjustTextareaHeight();
    });
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    chatMessagesContainer.value?.scrollTo({ top: chatMessagesContainer.value.scrollHeight, behavior: 'smooth' });
  });
};

// 监听输入变化，调整textarea高度
watch(() => props.userInput, () => {
  nextTick(() => {
    adjustTextareaHeight();
  });
});

// 监听消息变化，自动滚动到底部
watch(() => props.messages.length, () => {
  scrollToBottom();
});

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  adjustTextareaHeight
});
</script>

<style scoped>
/* 左侧聊天面板 */
.chat-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--bs-border-color);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
  background: var(--bs-body-bg);
}

/* 现代化聊天输入区域样式 - 深色主题 */
.chat-input-container {
  background: var(--bs-body-bg);
  border-top: 1px solid var(--bs-border-color);
  padding: 16px 20px;
  position: relative;
  z-index: 10;
}

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.status-warning {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.status-info {
  background: rgba(13, 202, 240, 0.2);
  color: #0dcaf0;
  border: 1px solid rgba(13, 202, 240, 0.3);
}

.status-success {
  background: rgba(25, 135, 84, 0.2);
  color: #198754;
  border: 1px solid rgba(25, 135, 84, 0.3);
}

.status-processing {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.3);
}

/* 输入区域 */
.input-area {
  position: relative;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  background: var(--bs-secondary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 20px;
  padding: 8px 12px;
  transition: all 0.2s ease;
  min-height: 48px;
}

.input-wrapper:focus-within {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.1);
  background: var(--bs-body-bg);
}

/* 聊天输入框 */
.chat-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  padding: 8px 0;
  min-height: 32px;
  max-height: 120px;
  transition: height 0.2s ease;
  color: var(--bs-body-color) !important;
  font-family: inherit;
  caret-color: var(--bs-primary);
}

.chat-input::placeholder {
  color: var(--bs-secondary-color);
  font-style: italic;
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: var(--bs-secondary-color);
}

/* 操作按钮 */
.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--bs-secondary-color);
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 16px;
}

.action-btn:hover:not(:disabled) {
  background: var(--bs-tertiary-bg);
  color: var(--bs-body-color);
  transform: scale(1.05);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.attachment-btn:hover:not(:disabled) {
  background: rgba(13, 202, 240, 0.2);
  color: #0dcaf0;
}

.send-btn {
  background: var(--bs-primary);
  color: var(--bs-primary-bg-subtle);
}

.send-btn:hover:not(:disabled) {
  background: var(--bs-primary-border-subtle);
  color: var(--bs-primary-bg-subtle);
  transform: scale(1.05);
}

.send-btn:disabled {
  background: var(--bs-secondary);
  opacity: 0.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-input-container {
    padding: 12px 16px;
  }
  
  .input-wrapper {
    padding: 6px 10px;
    min-height: 44px;
  }
  
  .action-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style> 