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
      <!-- 聊天面板容器 -->
      <ChatPanelsContainer 
        :active-chats="activeChats"
        :is-processing="isProcessing"
        :active-chats-count="activeChats.length"
        :process-steps="props.processSteps"
        :model-statuses="props.modelStatuses"
        @close-chat="closeChat"
        @resend-message="resendMessage"
        @edit-message="editMessage"
        @delete-message="deleteMessage"
        @retry-chat="retryChat"
        @retry-chat-with-strategy="retryChatWithStrategy"
        @action="handleAction"
        @add-more-models="addMoreModels"
        @close-all-chats="closeAllChats"
        @clear-steps="$emit('clear-steps')"
      />
      
      <!-- 统一的输入区域 -->
      <ChatInput 
        v-model="userInput"
        :active-chats-count="activeChats.length"
        :is-processing="isProcessing"
        @send-message="sendMessage"
      />
    </div>

    <!-- 编辑消息弹窗 -->
    <EditMessageModal 
      :is-visible="isEditModalVisible"
      :message-text="editForm.text"
      @close="closeEditModal"
      @save="saveEditMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { modelConfigService, type ChatModelSelection } from '../services/ModelConfigService';
import { createChatProvider, type ChatProvider } from '../services/AIProviderService';
import ModelSelector from './ModelSelector.vue';
import ChatPanelsContainer from './MultiModelChat/ChatPanelsContainer.vue';
import ChatInput from './MultiModelChat/ChatInput.vue';
import EditMessageModal from './MultiModelChat/EditMessageModal.vue';
import type { ChatStream, EditForm, Message } from './MultiModelChat/types';

/**
 * 多模型聊天主组件
 * 管理多个AI模型的并行对话功能
 */

// Props
interface Props {
  processSteps?: Array<{
    id: string;
    title: string;
    type?: 'search' | 'embedding' | 'generation';
    status: 'pending' | 'processing' | 'success' | 'error';
    time?: string;
    details?: any;
  }>;
  modelStatuses?: Array<{
    name: string;
    status: string;
    progress?: number;
  }>;
}

const props = withDefaults(defineProps<Props>(), {
  processSteps: () => [],
  modelStatuses: () => []
});

// Emits
interface Emits {
  'clear-steps': [];
}

defineEmits<Emits>();

// 响应式数据
const activeChats = ref<ChatStream[]>([]);
const userInput = ref('');
const isProcessing = ref(false);

// 编辑消息相关
const isEditModalVisible = ref(false);
const editForm = ref<EditForm>({
  chatId: '',
  messageIndex: -1,
  text: ''
});

// 计算属性
const hasActiveChats = computed(() => activeChats.value.length > 0);

/**
 * 构建对话历史prompt
 * @param messages 消息列表
 * @param currentMessage 当前要发送的消息
 * @returns 格式化的对话历史prompt
 */
const buildConversationPrompt = (messages: Message[], currentMessage?: string): string => {
  // 构建完整的对话历史
  const conversationHistory = messages.map(msg => {
    return msg.isUser ? `用户: ${msg.text}` : `助手: ${msg.text}`;
  }).join('\n\n');
  
  // 如果有当前消息，添加到历史后面
  if (currentMessage) {
    return conversationHistory 
      ? `${conversationHistory}\n\n用户: ${currentMessage}\n\n助手: `
      : `用户: ${currentMessage}\n\n助手: `;
  }
  
  // 如果没有当前消息，返回历史对话
  return conversationHistory ? `${conversationHistory}\n\n助手: ` : '';
};

/**
 * 开始多模型聊天
 * @param models 选中的模型列表
 */
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
        modelName: model.name,
        provider: chatProvider,
        messages: [],
        status: 'idle',
        currentResponse: '',
        createdAt: Date.now(),
        retryCount: 0,
        errorCount: 0
      };
      
      activeChats.value.push(chatStream);
    } catch (error) {
      console.error('创建聊天流失败:', error);
    }
  }
};

/**
 * 关闭单个聊天
 * @param index 聊天索引
 */
const closeChat = (index: number) => {
  activeChats.value.splice(index, 1);
  if (activeChats.value.length === 0) {
    // 所有聊天都关闭了，回到模型选择界面
    return;
  }
};

/**
 * 关闭所有聊天
 */
const closeAllChats = () => {
  activeChats.value = [];
};

/**
 * 添加更多模型
 */
const addMoreModels = () => {
  // TODO: 实现添加更多模型的功能
  console.log('添加更多模型');
};

/**
 * 发送消息
 */
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
      const prompt = buildConversationPrompt(chat.messages, message);
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

/**
 * 重新发送消息
 * @param chat 聊天流对象
 * @param messageText 消息文本
 */
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
  
  // 构建对话历史（不包括要重新发送的消息）
  const messagesBeforeResend = chat.messages.slice(0, index);
  const prompt = buildConversationPrompt(messagesBeforeResend, newMessage);
  
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

/**
 * 编辑消息
 * @param chat 聊天流对象
 * @param msgIndex 消息索引
 * @param messageText 消息文本
 */
const editMessage = (chat: ChatStream, msgIndex: number, messageText: string) => {
  editForm.value.chatId = chat.id;
  editForm.value.messageIndex = msgIndex;
  editForm.value.text = messageText;
  isEditModalVisible.value = true;
};

/**
 * 保存编辑的消息
 * @param newText 新的消息文本
 */
const saveEditMessage = (newText: string) => {
  const chat = activeChats.value.find(c => c.id === editForm.value.chatId);
  if (!chat) return;

  const message = chat.messages[editForm.value.messageIndex];
  message.text = newText;
  message.timestamp = Date.now(); // 更新时间戳

  isEditModalVisible.value = false;
  editForm.value.text = ''; // 清空表单
};

/**
 * 关闭编辑消息弹窗
 */
const closeEditModal = () => {
  isEditModalVisible.value = false;
  editForm.value.text = ''; // 清空表单
};

/**
 * 删除消息
 * @param chat 聊天流对象
 * @param msgIndex 消息索引
 */
const deleteMessage = (chat: ChatStream, msgIndex: number) => {
  chat.messages.splice(msgIndex, 1);
};

/**
 * 重试整个聊天
 * @param chat 聊天流对象
 */
const retryChat = async (chat: ChatStream) => {
  if (isProcessing.value) return;
  
  // 构建完整的对话历史
  const prompt = buildConversationPrompt(chat.messages);
  
  chat.status = 'streaming';
  chat.currentResponse = '';
  
  try {
    const stream = chat.provider.generateContentStream(prompt);
    
    for await (const chunk of stream) {
      chat.currentResponse += chunk;
      await nextTick();
    }
    
    // 添加AI响应到消息列表
    if (chat.currentResponse.trim()) {
      chat.messages.push({
        text: chat.currentResponse,
        isUser: false,
        timestamp: Date.now()
      });
    }
    
    chat.status = 'completed';
    chat.currentResponse = '';
  } catch (error) {
    console.error(`重试聊天失败:`, error);
    chat.status = 'error';
    chat.error = error instanceof Error ? error.message : '重试失败';
    chat.errorCount = (chat.errorCount || 0) + 1;
  }
};

/**
 * 带策略的重试聊天
 * @param chat 聊天流对象
 * @param strategy 重试策略
 */
const retryChatWithStrategy = async (chat: ChatStream, strategy: string) => {
  if (isProcessing.value) return;
  
  // 增加重试次数
  chat.retryCount = (chat.retryCount || 0) + 1;
  
  // 根据策略计算延迟时间
  let delay = 0;
  switch (strategy) {
    case 'immediate':
      delay = 0;
      break;
    case 'exponential':
      delay = Math.min(1000 * Math.pow(2, chat.retryCount - 1), 30000); // 指数退减，最大30秒
      break;
    case 'linear':
      delay = Math.min(1000 * chat.retryCount, 10000); // 线性增长，最大10秒
      break;
    case 'custom':
      delay = 5000; // 自定义延迟5秒
      break;
    default:
      delay = 1000;
  }
  
  // 如果有延迟，显示等待状态
  if (delay > 0) {
    chat.status = 'idle';
    chat.currentResponse = `等待 ${delay / 1000} 秒后重试...`;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // 执行重试
  await retryChat(chat);
};

/**
 * 处理高级操作
 * @param action 操作类型
 * @param chat 聊天流对象
 */
const handleAction = async (action: string, chat: ChatStream) => {
  switch (action) {
    case 'clear-messages':
      chat.messages = [];
      break;
    case 'export-chat':
      exportChat(chat);
      break;
    case 'duplicate-chat':
      duplicateChat(chat);
      break;
    case 'settings':
      openChatSettings(chat);
      break;
    default:
      console.warn('未知操作:', action);
  }
};

/**
 * 导出聊天记录
 * @param chat 聊天流对象
 */
const exportChat = (chat: ChatStream) => {
  const chatData = {
    modelName: chat.modelName,
    createdAt: new Date(chat.createdAt).toLocaleString(),
    messages: chat.messages,
    retryCount: chat.retryCount,
    errorCount: chat.errorCount
  };
  
  const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-${chat.modelName}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 复制聊天
 * @param chat 聊天流对象
 */
const duplicateChat = (chat: ChatStream) => {
  const newChat: ChatStream = {
    ...chat,
    id: `chat-${Date.now()}-${Math.random()}`,
    createdAt: Date.now(),
    retryCount: 0,
    errorCount: 0
  };
  activeChats.value.push(newChat);
};

/**
 * 打开聊天设置
 * @param chat 聊天流对象
 */
const openChatSettings = (chat: ChatStream) => {
  // TODO: 实现聊天设置弹窗
  console.log('打开聊天设置:', chat.modelName);
};
</script>

<style scoped>
.multi-model-chat {
  display: flex;
  flex-direction: column;
  height: var(--available-height, 100%);
  width: 100%;
  overflow: hidden;
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
  width: 100%;
  min-height: 0;
  overflow: hidden;
}
</style> 