<template>
  <div class="multi-model-chat">
    <!-- 模型选择区域 -->
    <div v-if="!hasActiveChats" class="model-selection-area">
      <ModelSelector 
        :is-visible="true"
        @start-chat="startMultiModelChat"
      />
    </div>
    
    <!-- 多模型聊天区域 -->
    <div v-else class="chat-area">
      <!-- 聊天面板标题栏 -->
      <div class="chat-header">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-chat-dots me-1"></i>
            多模型并行对话 ({{ activeChats.length }}个模型)
          </h6>
          <div class="d-flex gap-2">
            <button 
              class="btn btn-outline-secondary btn-sm"
              @click="addMoreModels"
              :disabled="isProcessing"
              title="添加更多模型"
            >
              <i class="bi bi-plus-circle me-1"></i>
              添加模型
            </button>
            <button 
              class="btn btn-outline-danger btn-sm"
              @click="closeAllChats"
              title="关闭所有对话"
            >
              <i class="bi bi-x-circle me-1"></i>
              关闭所有
            </button>
          </div>
        </div>
      </div>
      
      <!-- 水平滚动的聊天面板容器 -->
      <div class="chat-panels-scroll-container">
        <div class="chat-panels-container">
          <div 
            v-for="(chat, index) in activeChats" 
            :key="chat.id"
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
                <button 
                  class="btn-close btn-sm"
                  @click="closeChat(index)"
                  title="关闭对话"
                ></button>
              </div>
            </div>
            
            <!-- 消息列表 -->
            <div class="messages-container" ref="messagesContainer">
              <div 
                v-for="(message, msgIndex) in chat.messages" 
                :key="msgIndex"
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
                        @click="resendMessage(chat, message.text)"
                        title="重新发送"
                      >
                        <i class="bi bi-arrow-clockwise"></i>
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-secondary"
                        @click="editMessage(chat, msgIndex, message.text)"
                        title="编辑消息"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-danger"
                        @click="deleteMessage(chat, msgIndex)"
                        title="删除消息"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div class="message-text" v-html="message.text"></div>
                </div>
              </div>
              
              <!-- 流式响应显示 -->
              <div 
                v-if="chat.status === 'streaming' && chat.currentResponse"
                class="message-item ai-message"
              >
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-time">正在响应...</span>
                  </div>
                  <div class="message-text streaming">
                    {{ chat.currentResponse }}
                    <span class="cursor">|</span>
                  </div>
                </div>
              </div>
              
              <!-- 错误显示 -->
              <div 
                v-if="chat.status === 'error' && chat.error"
                class="message-item error-message"
              >
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-time">错误</span>
                    <div class="message-actions">
                      <button 
                        class="btn btn-sm btn-outline-warning"
                        @click="retryChat(chat)"
                        title="重试"
                      >
                        <i class="bi bi-arrow-clockwise"></i>
                      </button>
                    </div>
                  </div>
                  <div class="message-text text-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    {{ chat.error }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 统一的输入区域 -->
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
                将发送给 {{ activeChats.length }} 个模型
              </span>
              <button 
                class="btn btn-primary btn-sm"
                @click="sendMessage"
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
    </div>

    <!-- 编辑消息弹窗 -->
    <div v-if="isEditModalVisible" class="modal-backdrop-custom">
      <div class="modal-dialog-custom">
        <div class="modal-content-custom">
          <div class="modal-header-custom">
            <h5 class="modal-title">编辑消息</h5>
            <button type="button" class="btn-close" @click="closeEditModal"></button>
          </div>
          <div class="modal-body-custom">
            <form @submit.prevent="saveEditMessage">
              <div class="mb-3">
                <label class="form-label">消息内容</label>
                <textarea 
                  v-model="editForm.text" 
                  class="form-control" 
                  rows="4" 
                  required
                  placeholder="输入消息内容..."
                ></textarea>
              </div>
              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary btn-sm" @click="closeEditModal">取消</button>
                <button type="submit" class="btn btn-primary btn-sm">保存</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { modelConfigService, type ChatModelSelection } from '../services/ModelConfigService';
import { createChatProvider, type ChatProvider } from '../services/AIProviderService';
import ModelSelector from './ModelSelector.vue';

// 聊天流接口
interface ChatStream {
  id: string;
  modelSelection: ChatModelSelection;
  modelName: string;
  provider: ChatProvider;
  messages: Array<{
    text: string;
    isUser: boolean;
    timestamp: number;
  }>;
  status: 'idle' | 'streaming' | 'completed' | 'error';
  currentResponse: string;
  error?: string;
}

// 响应式数据
const activeChats = ref<ChatStream[]>([]);
const userInput = ref('');
const isProcessing = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// 编辑消息相关
const isEditModalVisible = ref(false);
const editForm = ref({
  chatId: '',
  messageIndex: -1,
  text: ''
});

// 计算属性
const hasActiveChats = computed(() => activeChats.value.length > 0);

// 开始多模型聊天
const startMultiModelChat = async (models: ChatModelSelection[]) => {
  activeChats.value = [];
  
  for (const model of models) {
    try {
      // 从模型配置中获取实际的Token信息
      const modelConfig = modelConfigService.getModels().find(m => m.name === model.name);
      if (!modelConfig) {
        console.error('找不到模型配置:', model.name);
        continue;
      }
      
      const token = modelConfigService.getToken(modelConfig.tokenId);
      if (!token) {
        console.error('找不到Token配置:', modelConfig.tokenId);
        continue;
      }
      
      const provider = modelConfigService.getProvider(token.providerId);
      if (!provider) {
        console.error('找不到供应商配置:', token.providerId);
        continue;
      }
      
      // 创建聊天提供者（目前只支持Google和OpenAI）
      let chatProvider: ChatProvider;
      if (provider.type === 'google' || provider.type === 'openai') {
        chatProvider = createChatProvider(
          provider.type as 'google' | 'openai',
          token.apiKey,
          provider.apiEndpoint || '',
          modelConfig.modelName
        );
      } else {
        // 对于不支持的供应商类型，跳过
        console.warn(`不支持的供应商类型: ${provider.type}`);
        continue;
      }
      
      const chatStream: ChatStream = {
        id: `chat-${Date.now()}-${Math.random()}`,
        modelSelection: model,
        modelName: model.name,
        provider: chatProvider,
        messages: [],
        status: 'idle',
        currentResponse: ''
      };
      
      activeChats.value.push(chatStream);
    } catch (error) {
      console.error('创建聊天流失败:', error);
    }
  }
};

// 关闭单个聊天
const closeChat = (index: number) => {
  activeChats.value.splice(index, 1);
  if (activeChats.value.length === 0) {
    // 所有聊天都关闭了，回到模型选择界面
    return;
  }
};

// 关闭所有聊天
const closeAllChats = () => {
  activeChats.value = [];
};

// 添加更多模型
const addMoreModels = () => {
  // TODO: 实现添加更多模型的功能
  console.log('添加更多模型');
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isProcessing.value) return;
  
  const message = userInput.value.trim();
  userInput.value = '';
  isProcessing.value = true;
  
  // 向所有活跃的聊天流发送消息（不等待同步）
  activeChats.value.forEach(async (chat, index) => {
    try {
      // 添加用户消息
      chat.messages.push({
        text: message,
        isUser: true,
        timestamp: Date.now()
      });
      
      // 开始流式响应
      chat.status = 'streaming';
      chat.currentResponse = '';
      
      // 生成AI响应
      const prompt = `用户: ${message}\n\n助手: `;
      const stream = chat.provider.generateContentStream(prompt);
      
      for await (const chunk of stream) {
        chat.currentResponse += chunk;
        // 触发响应式更新
        await nextTick();
      }
      
      // 完成响应
      chat.messages.push({
        text: chat.currentResponse,
        isUser: false,
        timestamp: Date.now()
      });
      
      chat.status = 'completed';
      chat.currentResponse = '';
      
    } catch (error) {
      console.error(`聊天流 ${chat.modelName} 错误:`, error);
      chat.status = 'error';
      chat.error = error instanceof Error ? error.message : '未知错误';
    }
  });
  
  // 不等待所有模型完成，立即结束处理状态
  setTimeout(() => {
    isProcessing.value = false;
  }, 100);
};

// 重新发送消息
const resendMessage = async (chat: ChatStream, messageText: string) => {
  if (isProcessing.value) return;
  
  const newMessage = messageText;
  const index = chat.messages.findIndex(msg => msg.text === messageText);
  
  if (index === -1) return;
  
  chat.messages[index].text = newMessage; // 更新消息文本
  chat.messages[index].timestamp = Date.now(); // 更新时间戳
  
  // 重新发送消息
  chat.status = 'streaming';
  chat.currentResponse = '';
  
  const prompt = `用户: ${newMessage}\n\n助手: `;
  const stream = chat.provider.generateContentStream(prompt);
  
  for await (const chunk of stream) {
    chat.currentResponse += chunk;
    await nextTick();
  }
  
  chat.messages.push({
    text: chat.currentResponse,
    isUser: false,
    timestamp: Date.now()
  });
  
  chat.status = 'completed';
  chat.currentResponse = '';
};

// 编辑消息
const editMessage = (chat: ChatStream, msgIndex: number, messageText: string) => {
  editForm.value.chatId = chat.id;
  editForm.value.messageIndex = msgIndex;
  editForm.value.text = messageText;
  isEditModalVisible.value = true;
};

// 保存编辑的消息
const saveEditMessage = () => {
  const chat = activeChats.value.find(c => c.id === editForm.value.chatId);
  if (!chat) return;

  const message = chat.messages[editForm.value.messageIndex];
  message.text = editForm.value.text;
  message.timestamp = Date.now(); // 更新时间戳

  isEditModalVisible.value = false;
  editForm.value.text = ''; // 清空表单
};

// 关闭编辑消息弹窗
const closeEditModal = () => {
  isEditModalVisible.value = false;
  editForm.value.text = ''; // 清空表单
};

// 删除消息
const deleteMessage = (chat: ChatStream, msgIndex: number) => {
  chat.messages.splice(msgIndex, 1);
};

// 重试整个聊天
const retryChat = async (chat: ChatStream) => {
  if (isProcessing.value) return;
  
  const messagesToSend = chat.messages.map(msg => msg.text);
  const prompt = `用户: ${messagesToSend.join('\n\n用户: ')}\n\n助手: `;
  
  chat.status = 'streaming';
  chat.currentResponse = '';
  
  const stream = chat.provider.generateContentStream(prompt);
  
  for await (const chunk of stream) {
    chat.currentResponse += chunk;
    await nextTick();
  }
  
  chat.messages.push({
    text: chat.currentResponse,
    isUser: false,
    timestamp: Date.now()
  });
  
  chat.status = 'completed';
  chat.currentResponse = '';
};

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
};

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

// 监听消息变化，自动滚动
watch(() => activeChats.value.flatMap(chat => chat.messages.length), () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.multi-model-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.model-selection-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  border-bottom: 1px solid var(--bs-border-color);
  padding: 1rem;
  background: var(--bs-body-bg);
  flex-shrink: 0;
}

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

.error-message {
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

.error-message .message-content {
  background: var(--bs-danger-bg-subtle);
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
}

.user-message .message-text {
  color: white;
  font-weight: 500;
}

.ai-message .message-text {
  color: var(--bs-body-color);
}

.error-message .message-text {
  color: var(--bs-danger);
  font-weight: 500;
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

/* 编辑消息弹窗样式 */
.modal-backdrop-custom {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.2);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-dialog-custom {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  min-width: 400px;
  max-width: 95vw;
}

.modal-content-custom {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
}

.modal-header-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  margin-bottom: 1rem;
}

.modal-body-custom {
  padding: 0;
}
</style> 