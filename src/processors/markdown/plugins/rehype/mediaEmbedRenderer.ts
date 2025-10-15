/**
 * Rehype 插件 - 渲染媒体嵌入（PDF、视频、音频）
 *
 * 将带有 data 属性的 div 占位符转换为实际的媒体元素
 */

import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element as HastElement } from 'hast';

export interface MediaEmbedRendererOptions {
  pdfHeight?: string;
  videoMaxWidth?: string;
  audioMaxWidth?: string;
}

const DEFAULT_OPTIONS: MediaEmbedRendererOptions = {
  pdfHeight: '600px',
  videoMaxWidth: '100%',
  audioMaxWidth: '100%',
};

/**
 * 媒体嵌入渲染器插件
 */
export function mediaEmbedRenderer(options: MediaEmbedRendererOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (tree: HastRoot) => {
    visit(tree, 'element', (node: HastElement, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      // 处理来自 remark 阶段的 HTML 占位符
      if (node.tagName === 'div' && node.properties?.className) {
        const classNameProp = node.properties.className;
        const className = Array.isArray(classNameProp)
          ? classNameProp.join(' ')
          : typeof classNameProp === 'string'
            ? classNameProp
            : '';

        // 处理 PDF 嵌入占位符
        if (className.includes('pdf-embed-placeholder')) {
          const pdfUrl = node.properties['data-pdf-url'] as string;
          if (pdfUrl) {
            // 创建 PDFViewer 组件而不是 iframe
            // 这样会使用 React 组件，它会自动检测移动端并使用 react-pdf
            const pdfViewer: HastElement = {
              type: 'element',
              tagName: 'PDFViewer',
              properties: {
                url: pdfUrl,
              },
              children: [],
            };

            // 更新节点为容器
            node.properties.className = ['pdf-embed-container'];
            node.children = [pdfViewer];
          }
        }

        // 处理视频嵌入占位符
        else if (className.includes('video-embed-placeholder')) {
          const videoUrl = node.properties['data-video-url'] as string;
          const videoType = node.properties['data-video-type'] as string;

          if (videoUrl) {
            const mimeType =
              videoType === 'mp4'
                ? 'video/mp4'
                : videoType === 'webm'
                  ? 'video/webm'
                  : videoType === 'ogg'
                    ? 'video/ogg'
                    : 'video/mp4';

            // 创建 source 元素
            const source: HastElement = {
              type: 'element',
              tagName: 'source',
              properties: {
                src: videoUrl,
                type: mimeType,
              },
              children: [],
            };

            // 创建 video 元素
            const video: HastElement = {
              type: 'element',
              tagName: 'video',
              properties: {
                controls: true,
                style: `width: 100%; max-width: ${opts.videoMaxWidth}; height: auto; border: 1px solid var(--background-modifier-border); border-radius: 4px;`,
                preload: 'metadata',
              },
              children: [
                source,
                {
                  type: 'text',
                  value: '您的浏览器不支持视频播放。',
                },
              ],
            };

            // 更新节点为容器
            node.properties.className = ['video-embed-container'];
            node.children = [video];
          }
        }

        // 处理音频嵌入占位符
        else if (className.includes('audio-embed-placeholder')) {
          const audioUrl = node.properties['data-audio-url'] as string;
          const audioType = node.properties['data-audio-type'] as string;

          if (audioUrl) {
            const mimeType =
              audioType === 'mp3'
                ? 'audio/mpeg'
                : audioType === 'ogg'
                  ? 'audio/ogg'
                  : audioType === 'wav'
                    ? 'audio/wav'
                    : 'audio/mpeg';

            // 创建 source 元素
            const source: HastElement = {
              type: 'element',
              tagName: 'source',
              properties: {
                src: audioUrl,
                type: mimeType,
              },
              children: [],
            };

            // 创建 audio 元素
            const audio: HastElement = {
              type: 'element',
              tagName: 'audio',
              properties: {
                controls: true,
                style: `width: 100%; max-width: ${opts.audioMaxWidth}; border: 1px solid var(--background-modifier-border); border-radius: 4px;`,
                preload: 'metadata',
              },
              children: [
                source,
                {
                  type: 'text',
                  value: '您的浏览器不支持音频播放。',
                },
              ],
            };

            // 更新节点为容器，添加样式
            node.properties.className = ['audio-embed-container'];
            node.properties.style = 'margin: 1rem 0;';
            node.children = [audio];
          }
        }
      }
    });
  };
}
