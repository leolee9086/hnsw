/**
 * 文件处理器 - 支持多种文本格式
 */

export interface ProcessedText {
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedAt: Date;
  };
}

/**
 * 检测文件类型
 */
export const detectFileType = (fileName: string): string => {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  
  const typeMap: Record<string, string> = {
    // 纯文本格式
    'txt': 'text/plain',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    
    // 数据格式
    'json': 'application/json',
    'csv': 'text/csv',
    'tsv': 'text/tab-separated-values',
    'xml': 'application/xml',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'toml': 'text/toml',
    'ini': 'text/ini',
    'cfg': 'text/config',
    'conf': 'text/config',
    'properties': 'text/properties',
    
    // 标记语言
    'html': 'text/html',
    'htm': 'text/html',
    
    // 代码文件
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'py': 'text/python',
    'java': 'text/java',
    'cpp': 'text/cpp',
    'c': 'text/c',
    'h': 'text/c-header',
    'hpp': 'text/cpp-header',
    'cs': 'text/csharp',
    'php': 'text/php',
    'rb': 'text/ruby',
    'go': 'text/go',
    'rs': 'text/rust',
    'swift': 'text/swift',
    'kt': 'text/kotlin',
    'scala': 'text/scala',
    'r': 'text/r',
    'm': 'text/matlab',
    'pl': 'text/perl',
    'sh': 'text/shell',
    'bat': 'text/batch',
    'ps1': 'text/powershell',
    
    // 日志文件
    'log': 'text/log',
    
    // 数据库
    'sql': 'text/sql'
  };
  
  return typeMap[extension] || 'text/plain';
};

/**
 * 处理JSON文件
 */
const processJsonFile = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
};

/**
 * 处理CSV文件
 */
const processCsvFile = (content: string): string => {
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      // 简单的CSV处理，保留原始格式
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
};

/**
 * 处理HTML文件
 */
const processHtmlFile = (content: string): string => {
  // 移除HTML标签，保留文本内容
  return content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除script标签
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除style标签
    .replace(/<[^>]+>/g, ' ') // 移除其他HTML标签
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理XML文件
 */
const processXmlFile = (content: string): string => {
  // 简单的XML处理，保留结构
  return content
    .replace(/<!--[\s\S]*?-->/g, '') // 移除注释
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理代码文件
 */
const processCodeFile = (content: string, fileType: string): string => {
  // 移除注释
  let processed = content;
  
  // 单行注释
  if (['js', 'ts', 'java', 'cpp', 'c', 'cs', 'php', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'pl', 'sh', 'bat', 'ps1'].includes(fileType)) {
    processed = processed.replace(/\/\/.*$/gm, '');
  }
  
  // 多行注释
  if (['js', 'ts', 'java', 'cpp', 'c', 'cs', 'php', 'go', 'rs', 'swift', 'kt', 'scala'].includes(fileType)) {
    processed = processed.replace(/\/\*[\s\S]*?\*\//g, '');
  }
  
  // Python风格注释
  if (['py'].includes(fileType)) {
    processed = processed.replace(/#.*$/gm, '');
  }
  
  // Ruby风格注释
  if (['rb'].includes(fileType)) {
    processed = processed.replace(/#.*$/gm, '');
  }
  
  return processed
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理Markdown文件
 */
const processMarkdownFile = (content: string): string => {
  return content
    .replace(/^#+\s+/gm, '') // 移除标题标记
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
    .replace(/`(.*?)`/g, '$1') // 移除代码标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 移除图片，保留alt文本
    .replace(/^\s*[-*+]\s+/gm, '') // 移除列表标记
    .replace(/^\s*\d+\.\s+/gm, '') // 移除数字列表标记
    .replace(/^\s*>\s+/gm, '') // 移除引用标记
    .replace(/^\s*```[\s\S]*?```\s*$/gm, '') // 移除代码块
    .replace(/^\s*`.*?`\s*$/gm, '') // 移除行内代码
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理日志文件
 */
const processLogFile = (content: string): string => {
  return content
    .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[^:]*:\s*/gm, '') // 移除时间戳
    .replace(/\[[^\]]+\]\s*/g, '') // 移除方括号内容
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理配置文件
 */
const processConfigFile = (content: string): string => {
  return content
    .replace(/^\s*#.*$/gm, '') // 移除注释行
    .replace(/^\s*\/\/.*$/gm, '') // 移除注释行
    .replace(/^\s*;.*$/gm, '') // 移除注释行
    .replace(/^\s*$/gm, '') // 移除空行
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理SQL文件
 */
const processSqlFile = (content: string): string => {
  return content
    .replace(/--.*$/gm, '') // 移除单行注释
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
};

/**
 * 处理文件内容
 */
export const processFileContent = async (file: File): Promise<ProcessedText> => {
  const content = await file.text();
  const fileType = detectFileType(file.name);
  const extension = file.name.toLowerCase().split('.').pop() || '';
  
  let processedContent = content;
  
  // 根据文件类型进行特殊处理
  switch (fileType) {
    case 'application/json':
      processedContent = processJsonFile(content);
      break;
    case 'text/csv':
    case 'text/tab-separated-values':
      processedContent = processCsvFile(content);
      break;
    case 'text/html':
      processedContent = processHtmlFile(content);
      break;
    case 'application/xml':
      processedContent = processXmlFile(content);
      break;
    case 'text/markdown':
      processedContent = processMarkdownFile(content);
      break;
    case 'text/log':
      processedContent = processLogFile(content);
      break;
    case 'text/config':
    case 'text/ini':
    case 'text/yaml':
    case 'text/toml':
    case 'text/properties':
      processedContent = processConfigFile(content);
      break;
    case 'text/sql':
      processedContent = processSqlFile(content);
      break;
    default:
      // 代码文件处理
      if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'pl', 'sh', 'bat', 'ps1'].includes(extension)) {
        processedContent = processCodeFile(content, extension);
      }
      break;
  }
  
  return {
    content: processedContent,
    metadata: {
      fileName: file.name,
      fileType: fileType,
      fileSize: file.size,
      extractedAt: new Date()
    }
  };
};

/**
 * 检查文件是否支持
 */
export const isSupportedFile = (fileName: string): boolean => {
  const supportedExtensions = [
    'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'html', 'htm',
    'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'properties',
    'js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb',
    'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'pl', 'sh', 'bat', 'ps1',
    'log', 'sql'
  ];
  
  const extension = fileName.toLowerCase().split('.').pop() || '';
  return supportedExtensions.includes(extension);
};

/**
 * 获取文件类型描述
 */
export const getFileTypeDescription = (fileName: string): string => {
  const fileType = detectFileType(fileName);
  const extension = fileName.toLowerCase().split('.').pop() || '';
  
  const descriptions: Record<string, string> = {
    'text/plain': '纯文本文件',
    'text/markdown': 'Markdown文档',
    'application/json': 'JSON数据文件',
    'text/csv': 'CSV数据文件',
    'text/tab-separated-values': 'TSV数据文件',
    'application/xml': 'XML文档',
    'text/html': 'HTML网页',
    'text/yaml': 'YAML配置文件',
    'text/toml': 'TOML配置文件',
    'text/ini': 'INI配置文件',
    'text/config': '配置文件',
    'text/properties': '属性文件',
    'text/javascript': 'JavaScript代码',
    'text/typescript': 'TypeScript代码',
    'text/python': 'Python代码',
    'text/java': 'Java代码',
    'text/cpp': 'C++代码',
    'text/c': 'C代码',
    'text/c-header': 'C头文件',
    'text/cpp-header': 'C++头文件',
    'text/csharp': 'C#代码',
    'text/php': 'PHP代码',
    'text/ruby': 'Ruby代码',
    'text/go': 'Go代码',
    'text/rust': 'Rust代码',
    'text/swift': 'Swift代码',
    'text/kotlin': 'Kotlin代码',
    'text/scala': 'Scala代码',
    'text/r': 'R代码',
    'text/matlab': 'MATLAB代码',
    'text/perl': 'Perl代码',
    'text/shell': 'Shell脚本',
    'text/batch': '批处理文件',
    'text/powershell': 'PowerShell脚本',
    'text/log': '日志文件',
    'text/sql': 'SQL脚本'
  };
  
  return descriptions[fileType] || '未知文件类型';
}; 