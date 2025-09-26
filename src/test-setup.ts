/**
 * 测试环境设置文件
 *
 * 为测试环境提供必要的模拟和polyfill
 */

// IndexedDB 模拟
import 'fake-indexeddb/auto';

// 确保全局环境有 indexedDB
if (!globalThis.indexedDB) {
  // @ts-ignore
  globalThis.indexedDB = require('fake-indexeddb').default;
  // @ts-ignore
  globalThis.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange').default;
}

// 可选：添加其他测试环境需要的polyfill
// 比如 fetch、localStorage 等

// console.log('✅ Test environment setup completed');