/**
 * 带有应用标识的 fetch 包装器
 * 所有对 vault 的请求都应该使用这个函数
 */
export async function fetchVault(url: string, options: RequestInit = {}): Promise<Response> {
  // 添加自定义头部，标识这是来自应用的请求
  const headers = new Headers(options.headers);
  headers.set('X-Helenite-App', 'true');
  
  return fetch(url, {
    ...options,
    headers
  });
}

// 导出原始 fetch 的类型兼容版本
export default fetchVault;