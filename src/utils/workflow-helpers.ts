import { VectorStoreManager } from '../storage/vector-store';

/**
 * 尝试从缓存加载或执行工作流步骤
 * @param documentId 文档ID
 * @param stepName 步骤名称
 * @param executeFunc 执行函数
 * @returns 执行结果和来源标识
 */
export async function executeWithCache<T>(
  documentId: string,
  stepName: string,
  executeFunc: () => Promise<T>
): Promise<{data: T, fromCache: boolean}> {
  const vectorStore = VectorStoreManager.getInstance();
  
  console.log(`检查步骤 ${stepName} 是否有缓存...`);
  
  // 尝试从向量存储获取缓存
  const cachedData = await vectorStore.getWorkflowState(documentId, stepName);
  
  if (cachedData) {
    console.log(`使用缓存的步骤结果: ${stepName}`);
    return { data: cachedData, fromCache: true };
  }
  
  // 执行实际处理
  console.log(`执行步骤: ${stepName}`);
  const result = await executeFunc();
  
  // 保存结果
  await vectorStore.saveWorkflowState(documentId, stepName, result);
  
  return { data: result, fromCache: false };
}

/**
 * 检查文档是否已经完成指定步骤
 * @param documentId 文档ID
 * @param stepName 步骤名称
 * @returns 是否完成
 */
export async function isStepCompleted(
  documentId: string,
  stepName: string
): Promise<boolean> {
  const vectorStore = VectorStoreManager.getInstance();
  return await vectorStore.hasCompletedStep(documentId, stepName);
} 