/**
 * 多模型聊天组件的共享类型定义
 */

/**
 * 聊天消息接口
 */
export interface Message {
  text: string;
  isUser: boolean;
  timestamp: number;
}

import type { ChatProvider } from '../../services/AIProviderService';

/**
 * 聊天流接口
 */
export interface ChatStream {
  id: string;
  modelName: string;
  provider: ChatProvider;
  messages: Message[];
  status: 'idle' | 'streaming' | 'completed' | 'error';
  currentResponse: string;
  error?: string;
  createdAt: number;
  retryCount?: number;
  errorCount?: number;
}

/**
 * 编辑表单接口
 */
export interface EditForm {
  chatId: string;
  messageIndex: number;
  text: string;
} 