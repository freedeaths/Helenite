import { useCallback, useMemo } from 'react';
import type { ISearchAPI } from '../interfaces/ISearchAPI';
import { LocalSearchAPI } from '../implementations/local/LocalSearchAPI';
import { VAULT_PATH } from '../../config/env';

/**
 * 搜索 API Hook
 * 提供统一的搜索接口访问
 */
export function useSearchAPI(baseUrl: string = VAULT_PATH): ISearchAPI {
  const api = useMemo(() => {
    return new LocalSearchAPI(baseUrl);
  }, [baseUrl]);

  return api;
}

/**
 * 搜索功能 Hook
 * 基于简化的搜索接口，复刻 PHP 搜索功能
 */
export function useSearch(baseUrl?: string) {
  const searchAPI = useSearchAPI(baseUrl);

  // 统一搜索入口（复刻 PHP doSearch 功能）
  const search = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      return await searchAPI.search(query);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }, [searchAPI]);

  // 全文搜索
  const searchContent = useCallback(async (query: string) => {
    try {
      return await searchAPI.searchContent(query);
    } catch (error) {
      console.error('Content search failed:', error);
      return [];
    }
  }, [searchAPI]);

  // 标签搜索
  const searchByTag = useCallback(async (tag: string) => {
    try {
      return await searchAPI.searchByTag(tag);
    } catch (error) {
      console.error('Tag search failed:', error);
      return [];
    }
  }, [searchAPI]);

  return {
    search,        // 统一搜索入口
    searchContent, // 全文搜索
    searchByTag    // 标签搜索
  };
}