/**
 * 环境变量配置
 * 所有 vault 路径相关的配置都在这里集中管理
 */

// Vault 路径配置
export const VAULT_PATH = import.meta.env.VITE_VAULT_PATH || '/vault/Publish';
export const VAULT_ROOT = import.meta.env.VITE_VAULT_ROOT || '/vault';

// 派生路径
export const OBSIDIAN_PATH = `${VAULT_ROOT}/.obsidian`;

// 辅助函数
export function getVaultFilePath(relativePath: string): string {
  // 移除开头的斜杠
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${VAULT_PATH}/${cleanPath}`;
}

export function getObsidianPath(relativePath: string): string {
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${OBSIDIAN_PATH}/${cleanPath}`;
}

// 导出所有配置
export const vaultConfig = {
  path: VAULT_PATH,
  root: VAULT_ROOT,
  obsidian: OBSIDIAN_PATH,
  getFilePath: getVaultFilePath,
  getObsidianPath: getObsidianPath,
} as const;

export default vaultConfig;