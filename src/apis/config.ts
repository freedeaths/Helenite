import type { IFileTreeAPI, IGraphAPI, IFileAPI, ISearchAPI, ITagAPI } from './interfaces';

// 本地实现
import { LocalFileTreeAPI } from './implementations/local/LocalFileTreeAPI';
import { LocalGraphAPI } from './implementations/local/LocalGraphAPI';
import { LocalFileAPI } from './implementations/local/LocalFileAPI';
// import { LocalSearchAPI } from './implementations/local/LocalSearchAPI';
// import { LocalTagAPI } from './implementations/local/LocalTagAPI';

// Mock 实现
import { MockFileTreeAPI } from './implementations/mock/MockFileTreeAPI';
// import { MockGraphAPI } from './implementations/mock/MockGraphAPI';
import { MockFileAPI } from './implementations/mock/MockFileAPI';
// import { MockSearchAPI } from './implementations/mock/MockSearchAPI';
// import { MockTagAPI } from './implementations/mock/MockTagAPI';

/**
 * API 模式配置
 */
export type APIMode = 'local' | 'mock';

/**
 * 各个 API 的模式配置
 * 不存在实现时会自动回退到 mock
 */
export const API_CONFIG = {
  FILETREE_MODE: 'local' as APIMode,  // 已实现：local + mock
  GRAPH_MODE: 'local' as APIMode,     // 已实现：local only
  FILE_MODE: 'local' as APIMode,      // ✅ 已实现：local
  SEARCH_MODE: 'mock' as APIMode,     // 未实现：回退到 mock  
  TAG_MODE: 'mock' as APIMode,        // 未实现：回退到 mock
};

import { VAULT_ROOT } from '../config/env';

/**
 * Vault 基础 URL
 */
export const VAULT_BASE_URL = VAULT_ROOT;

/**
 * 创建文件树 API 实例
 */
export const createFileTreeAPI = (): IFileTreeAPI => {
  try {
    if (API_CONFIG.FILETREE_MODE === 'local') {
      console.log('📁 Using Local FileTree API');
      return new LocalFileTreeAPI(VAULT_BASE_URL);
    } else {
      console.log('🎭 Using Mock FileTree API');
      return new MockFileTreeAPI();
    }
  } catch (error) {
    console.warn('⚠️ FileTree local implementation failed, falling back to mock:', error);
    return new MockFileTreeAPI();
  }
};

/**
 * 创建图谱 API 实例  
 */
export const createGraphAPI = (): IGraphAPI => {
  try {
    if (API_CONFIG.GRAPH_MODE === 'local') {
      console.log('📊 Using Local Graph API');
      return new LocalGraphAPI(VAULT_BASE_URL);
    } else {
      // MockGraphAPI 还没实现，先用 Local 代替
      console.log('📊 Mock Graph API not implemented, using Local Graph API');
      return new LocalGraphAPI(VAULT_BASE_URL);
    }
  } catch (error) {
    console.error('❌ Graph API failed to initialize:', error);
    throw error; // Graph API 是核心功能，失败就抛异常
  }
};

/**
 * 创建文件 API 实例
 */
export const createFileAPI = (): IFileAPI => {
  try {
    if (API_CONFIG.FILE_MODE === 'local') {
      console.log('📄 Using Local File API');
      return new LocalFileAPI(VAULT_BASE_URL);
    } else {
      console.log('🎭 Using Mock File API');
      return new MockFileAPI(VAULT_BASE_URL);
    }
  } catch (error) {
    console.warn('⚠️ File local implementation failed, falling back to mock:', error);
    return new MockFileAPI(VAULT_BASE_URL);
  }
};

/**
 * 创建搜索 API 实例
 * 目前还未实现，直接抛异常
 */
export const createSearchAPI = (): ISearchAPI => {
  console.log('🔍 SearchAPI not yet implemented');
  throw new Error('SearchAPI not yet implemented');
};

/**
 * 创建标签 API 实例
 * 目前还未实现，直接抛异常
 */
export const createTagAPI = (): ITagAPI => {
  console.log('🏷️ TagAPI not yet implemented');
  throw new Error('TagAPI not yet implemented');
};

/**
 * 调试信息：显示当前 API 配置
 */
export const logAPIConfig = () => {
  console.group('🔧 API Configuration');
  console.log('FileTree Mode:', API_CONFIG.FILETREE_MODE);
  console.log('Graph Mode:', API_CONFIG.GRAPH_MODE);
  console.log('File Mode:', API_CONFIG.FILE_MODE);
  console.log('Search Mode:', API_CONFIG.SEARCH_MODE);
  console.log('Tag Mode:', API_CONFIG.TAG_MODE);
  console.log('Base URL:', VAULT_BASE_URL);
  console.groupEnd();
};