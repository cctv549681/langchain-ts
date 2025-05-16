import { 
  DEFAULT_MODEL, 
  DEFAULT_OUTPUT_DIR, 
  DEFAULT_VECTOR_STORE_DIR,
  DEFAULT_CHROMADB_URL,
  DEFAULT_CHROMADB_COLLECTION
} from './constants';

export interface SystemSettings {
  modelName: string;
  outputDirectory: string;
  vectorStore: {
    type: 'chroma' | 'faiss';
    directory: string;
    chroma?: {
      url: string;
      collectionName: string;
    };
  };
  debugMode: boolean;
  outputFormats: {
    subtitle: 'srt' | 'vtt';
    script: 'standard' | 'detailed';
  };
}

export const defaultSettings: SystemSettings = {
  modelName: DEFAULT_MODEL,
  outputDirectory: DEFAULT_OUTPUT_DIR,
  vectorStore: {
    type: 'chroma',
    directory: DEFAULT_VECTOR_STORE_DIR,
    chroma: {
      url: DEFAULT_CHROMADB_URL,
      collectionName: DEFAULT_CHROMADB_COLLECTION
    }
  },
  debugMode: false,
  outputFormats: {
    subtitle: 'srt',
    script: 'standard'
  }
};

let currentSettings: SystemSettings = { ...defaultSettings };

export function updateSettings(newSettings: Partial<SystemSettings>): void {
  // 如果提供了深层次的设置对象，需要深度合并
  if (newSettings.vectorStore) {
    currentSettings.vectorStore = {
      ...currentSettings.vectorStore,
      ...newSettings.vectorStore,
      // 处理可选的chroma子对象
      chroma: newSettings.vectorStore.chroma
        ? { ...currentSettings.vectorStore.chroma, ...newSettings.vectorStore.chroma }
        : currentSettings.vectorStore.chroma
    };
    
    // 移除vectorStore以避免下面重复合并
    const { vectorStore, ...restSettings } = newSettings;
    currentSettings = { ...currentSettings, ...restSettings };
  } else {
    currentSettings = { ...currentSettings, ...newSettings };
  }
}

export function getSettings(): SystemSettings {
  return { ...currentSettings };
}

export function resetSettings(): void {
  currentSettings = { ...defaultSettings };
}

/**
 * 获取ChromaDB配置
 */
export function getChromaConfig(): { url: string; collectionName: string } {
  const settings = getSettings();
  if (settings.vectorStore.type !== 'chroma' || !settings.vectorStore.chroma) {
    throw new Error('ChromaDB未配置');
  }
  
  return settings.vectorStore.chroma;
} 