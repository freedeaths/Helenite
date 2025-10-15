import { useCallback, useMemo } from 'react';
import type { ITagAPI } from '../interfaces/ITagAPI';
import { LocalTagAPI } from '../implementations/local/LocalTagAPI';
import { VAULT_PATH } from '../../config/vaultConfig';

/**
 * 标签 API Hook
 * 提供统一的标签接口访问
 */
export function useTagAPI(baseUrl: string = VAULT_PATH): ITagAPI {
  const api = useMemo(() => {
    return new LocalTagAPI(baseUrl);
  }, [baseUrl]);

  return api;
}

/**
 * 标签功能 Hook
 * 基于简化的标签接口，从 metadata.json 管理标签
 */
export function useTags(baseUrl?: string) {
  const tagAPI = useTagAPI(baseUrl);

  // 获取所有标签
  const getAllTags = useCallback(async () => {
    try {
      return await tagAPI.getAllTags();
    } catch (error) {
      console.error('Get all tags failed:', error);
      return [];
    }
  }, [tagAPI]);

  // 获取文件的所有标签
  const getFileTags = useCallback(async (filePath: string) => {
    try {
      return await tagAPI.getFileTags(filePath);
    } catch (error) {
      console.error('Get file tags failed:', error);
      return [];
    }
  }, [tagAPI]);

  // 根据标签获取文件列表
  const getFilesByTag = useCallback(async (tag: string) => {
    try {
      return await tagAPI.getFilesByTag(tag);
    } catch (error) {
      console.error('Get files by tag failed:', error);
      return [];
    }
  }, [tagAPI]);

  return {
    getAllTags,
    getFileTags,
    getFilesByTag
  };
}