/**
 * 从文本中提取JSON对象
 * @param text 包含JSON的文本
 * @returns 解析后的JSON对象
 */
export function convertToJSON(text: string): any {
  try {
    // 尝试直接解析，处理文本就是有效JSON的情况
    return JSON.parse(text);
  } catch (e) {
    // 尝试从文本中提取JSON对象
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error('JSON解析失败:', innerError);
        throw new Error('无法从文本中提取有效的JSON');
      }
    } else {
      throw new Error('文本中不包含JSON对象');
    }
  }
}

/**
 * 格式化时间为可读形式
 * @param seconds 秒数
 * @returns 格式化的时间字符串 (MM:SS)
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 截断文本到指定长度
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param suffix 截断后的后缀，默认为"..."
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 格式化文件大小为可读形式
 * @param bytes 字节数
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * 从路径中提取文件名
 * @param filePath 文件路径
 * @returns 文件名（不含扩展名）
 */
export function extractFileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  const fileName = parts[parts.length - 1];
  
  // 移除扩展名
  const nameParts = fileName.split('.');
  if (nameParts.length > 1) {
    nameParts.pop(); // 移除最后一部分（扩展名）
  }
  
  return nameParts.join('.');
}

/**
 * 为文件名添加前缀和/或后缀
 * @param fileName 原始文件名
 * @param prefix 前缀（可选）
 * @param suffix 后缀（可选）
 * @returns 处理后的文件名
 */
export function modifyFileName(fileName: string, prefix?: string, suffix?: string): string {
  const nameParts = fileName.split('.');
  const extension = nameParts.length > 1 ? nameParts.pop() : '';
  
  let baseName = nameParts.join('.');
  if (prefix) {
    baseName = prefix + baseName;
  }
  
  if (suffix) {
    baseName = baseName + suffix;
  }
  
  return extension ? `${baseName}.${extension}` : baseName;
}

/**
 * 将对象转换为查询字符串
 * @param params 参数对象
 * @returns 格式化的查询字符串
 */
export function objectToQueryString(params: Record<string, any>): string {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
} 