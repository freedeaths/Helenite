/**
 * Markdown 插件统一入口
 * 
 * 导出所有 remark 和 rehype 插件
 */

// Remark 插件（MDAST 处理）
export { obsidianTagsPlugin } from './remark/obsidianTagsPlugin.js';
export { obsidianHighlightsPlugin } from './remark/obsidianHighlightsPlugin.js';
export { obsidianCalloutsPlugin } from './remark/obsidianCalloutsPlugin.js';
export { trackMapsPlugin } from './remark/trackMapsPlugin.js';
export { footprintsPlugin } from './remark/footprintsPlugin.js';
export { mermaidPlugin } from './remark/mermaidPlugin.js';
export { obsidianLinksPlugin } from './remark/obsidianLinksPlugin.js';

// Rehype 插件（HAST 处理）
export { tableWrapperPlugin } from './rehype/tableWrapperPlugin.js';
export { trackMapRenderer } from './rehype/trackMapRenderer.js';
export { mermaidRenderer } from './rehype/mermaidRenderer.js';
export { externalLinksPlugin } from './rehype/externalLinksPlugin.js';

// 类型导出
export type { ObsidianTagsOptions } from './remark/obsidianTagsPlugin.js';
export type { ObsidianHighlightsOptions } from './remark/obsidianHighlightsPlugin.js';
export type { ObsidianCalloutsOptions } from './remark/obsidianCalloutsPlugin.js';
export type { TableWrapperOptions } from './rehype/tableWrapperPlugin.js';
export type { TrackMapsPluginOptions, FootprintsConfig, TrackData, SingleTrack, LeafletConfig } from './remark/trackMapsPlugin.js';
export type { FootprintsPluginOptions, FootprintsData } from './remark/footprintsPlugin.js';
export type { TrackMapRendererOptions } from './rehype/trackMapRenderer.js';
export type { MermaidRendererOptions } from './rehype/mermaidRenderer.js';
export type { MermaidPluginOptions, MermaidData } from './remark/mermaidPlugin.js';
export type { ObsidianLinksPluginOptions } from './remark/obsidianLinksPlugin.js';
export type { ExternalLinksOptions } from './rehype/externalLinksPlugin.js';