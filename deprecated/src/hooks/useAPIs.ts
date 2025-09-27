import { useMemo } from 'react';
import type { IFileTreeAPI, IGraphAPI, IFileAPI, ISearchAPI, ITagAPI } from '../apis/interfaces';
import {
  createFileTreeAPI,
  createGraphAPI,
  createFileAPI,
  createSearchAPI,
  createTagAPI
} from '../apis/config';

/**
 * 文件树 API Hook
 * 提供文件系统结构相关操作
 */
export const useFileTreeAPI = (): IFileTreeAPI => {
  return useMemo(() => {
    try {
      return createFileTreeAPI();
    } catch (error) {
      console.error('Failed to create FileTree API:', error);
      throw error;
    }
  }, []);
};

/**
 * 图谱 API Hook
 * 提供知识图谱相关操作
 */
export const useGraphAPI = (): IGraphAPI => {
  return useMemo(() => {
    try {
      return createGraphAPI();
    } catch (error) {
      console.error('Failed to create Graph API:', error);
      throw error;
    }
  }, []);
};

/**
 * 文件 API Hook
 * 提供单文件操作
 */
export const useFileAPI = (): IFileAPI => {
  return useMemo(() => {
    try {
      return createFileAPI();
    } catch (error) {
      console.error('Failed to create File API:', error);
      throw error;
    }
  }, []);
};

/**
 * 搜索 API Hook
 * 提供全文搜索功能
 */
export const useSearchAPI = (): ISearchAPI => {
  return useMemo(() => {
    try {
      return createSearchAPI();
    } catch (error) {
      console.error('Failed to create Search API:', error);
      throw error;
    }
  }, []);
};

/**
 * 标签 API Hook
 * 提供标签管理功能
 */
export const useTagAPI = (): ITagAPI => {
  return useMemo(() => {
    try {
      return createTagAPI();
    } catch (error) {
      console.error('Failed to create Tag API:', error);
      throw error;
    }
  }, []);
};

/**
 * 获取所有 API 实例的 Hook
 * 用于需要多个 API 的组件
 */
export const useAllAPIs = () => {
  const fileTreeAPI = useFileTreeAPI();
  
  // Graph API 现在可用了
  const graphAPI = useGraphAPI();
  // File API 现在也可用了
  const fileAPI = useFileAPI();
  // const searchAPI = useSearchAPI();
  // const tagAPI = useTagAPI();
  
  return {
    fileTreeAPI,
    graphAPI,
    fileAPI,
    // searchAPI,
    // tagAPI
  };
};