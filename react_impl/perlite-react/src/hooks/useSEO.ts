import { useEffect } from 'react';
import { useVaultStore } from '../stores/vaultStore';

/**
 * SEO 优化 Hook
 * 根据当前文件动态更新页面 meta 信息
 */
export function useSEO() {
  const { activeFile, currentDocumentMetadata } = useVaultStore();
  
  useEffect(() => {
    if (activeFile) {
      // 从文件路径提取文件名，先解码中文
      const decodedPath = decodeURIComponent(activeFile);
      const fileName = decodedPath.split('/').pop()?.replace('.md', '') || 'Document';
      
      // 生成页面标题
      const pageTitle = `${fileName} - Perlite`;
      document.title = pageTitle;
      
      // 生成描述
      let description = `View ${fileName} in Perlite vault viewer`;
      
      // 如果有标题，使用第一个标题作为描述
      if (currentDocumentMetadata?.headings?.length) {
        const firstHeading = currentDocumentMetadata.headings[0];
        description = `${firstHeading.text} - ${fileName}`;
      }
      
      // 如果有标签，添加到描述中
      if (currentDocumentMetadata?.tags?.length) {
        const tags = currentDocumentMetadata.tags.join(', ');
        description += ` | Tags: ${tags}`;
      }
      
      // 更新 meta 描述
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
      
      // 更新 Open Graph 标签
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', pageTitle);
      
      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute('content', description);
      
      // 更新 canonical URL
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      const canonicalUrl = `${window.location.origin}${window.location.pathname}#${activeFile}`;
      canonical.setAttribute('href', canonicalUrl);
      
    } else {
      // 默认首页 SEO
      document.title = 'Perlite - Modern Obsidian Vault Viewer';
      
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', 'A modern, web-based viewer for Obsidian vaults. Browse your notes with beautiful typography and interactive features.');
      
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', 'Perlite - Modern Obsidian Vault Viewer');
      }
      
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', `${window.location.origin}${window.location.pathname}#/welcome`);
      }
    }
  }, [activeFile, currentDocumentMetadata]);
}