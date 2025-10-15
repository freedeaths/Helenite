import { useEffect, useRef } from 'react';

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }) as T;
}

/**
 * 滚动位置持久化 Hook
 * 保存和恢复滚动位置，支持页面刷新后恢复
 * 
 * 算法说明：
 * - 所有设备使用统一的算法逻辑：内容高度监测 → 稳定性检查 → 多条件触发恢复 → 单次精准定位
 * - 设备差异仅在参数调优，不是不同的实现方案
 * 
 * 参数配置：
 * - 桌面端：100ms间隔，15次最大检查，4次稳定要求，100ms释放延迟
 * - 移动端：200ms间隔，20次最大检查，4次稳定要求，200ms释放延迟  
 * - 慢设备：300ms间隔，25次最大检查，5次稳定要求，300ms释放延迟
 * 
 * 可调参数位置：
 * - 最大检查次数和间隔：第75-76行
 * - 稳定性要求：第98行
 * - 释放延迟：第122行
 * 
 * 完整流程说明：
 * 
 * 1. 刷新前（保存阶段）
 *    - 用户滚动时触发 saveScrollPosition()
 *    - 获取当前滚动位置 scrollContainer.scrollTop
 *    - 防抖100ms后保存到 sessionStorage，格式：scroll-position-文件名 = "2500"
 * 
 * 2. 点击刷新后（恢复阶段）
 *    第一步：读取保存的位置
 *    - 从 sessionStorage 读取：savedPosition = "2500"
 *    - 转换为数字：targetScrollTop = 2500
 * 
 *    第二步：等待内容加载完成
 *    - 刷新后页面高度不断变化：500px(文字) → 1200px(部分图片) → 3000px(完整)
 * 
 *    第三步：按间隔检测（桌面端100ms间隔，最多15次）
 *    - 第1次(100ms)：高度500px → 不稳定
 *    - 第2次(200ms)：高度1200px → 不稳定  
 *    - 第3次(300ms)：高度2800px → 不稳定
 *    - 第4次(400ms)：高度3000px → 不稳定
 *    - 第5次(500ms)：高度3000px → 稳定1次
 *    - 第6次(600ms)：高度3000px → 稳定2次
 *    - ...
 *    - 第9次(900ms)：高度3000px → 稳定4次 ✅ 触发恢复
 * 
 * 3. 多种触发条件（任一满足即恢复）
 *    - isStableEnough: 稳定4次 && 高度足够容纳目标位置
 *    - isBasicReady: 页面高度 > 5000px（长文档基本加载完）
 *    - isEarlyReady: 检测3次后 && 高度达到第一个有效高度的80%
 *    - hasTimeout: 达到最大检查次数（桌面15次，移动20次，慢设备25次）
 * 
 * 4. 释放延迟（100ms）
 *    - 恢复位置后设置 isRestoringRef.current = true（锁定状态）
 *    - 100ms内用户滚动不会保存新位置（避免冲突）
 *    - 100ms后解锁，用户滚动时正常保存新位置
 * 
 * 设备差异原因：
 * - 桌面端：反应快，100ms间隔检测，最多15次，稳定4次就恢复
 * - 移动端：稍慢，200ms间隔，最多20次，给更多时间加载
 * - 慢设备：很慢，300ms间隔，最多25次，需要稳定5次才恢复
 * 
 * @param fileId 当前文件标识符，用作 sessionStorage 的 key
 * @returns 滚动容器的 ref
 */
export function useScrollPositionPersistence(fileId: string | null) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);
  const isRestoringRef = useRef(false);
  const hasRestoredRef = useRef(false); // 防止重复恢复

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !fileId) return;

    const storageKey = `scroll-position-${fileId}`;
    hasRestoredRef.current = false; // 重置恢复状态

    // 检测设备类型和性能
    const isMobile = window.innerWidth <= 768;
    const isSlowDevice = isMobile && navigator.hardwareConcurrency <= 4; // CPU核心数 <= 4为慢设备
    
    // 1. 单次精准恢复滚动位置 - 激进优化版本
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem(storageKey);
      if (savedPosition === null || hasRestoredRef.current) return;
      
      const targetScrollTop = parseInt(savedPosition, 10);
      if (targetScrollTop <= 0) return;
      
      isRestoringRef.current = true;
      hasRestoredRef.current = true;
      
      console.log(`🔍 开始恢复滚动位置: ${fileId} -> 目标位置 ${targetScrollTop}px (${isMobile ? '移动端' : '桌面端'}${isSlowDevice ? '慢速设备' : ''})`);
      
      // 激进等待策略：大幅缩短等待时间
      const waitForContentLoad = () => {
        let checkCount = 0;
        // 激进参数：减少最大检查次数，加快间隔
        const maxChecks = isSlowDevice ? 25 : (isMobile ? 20 : 15); 
        const checkInterval = isSlowDevice ? 300 : (isMobile ? 200 : 100); 
        let stableCount = 0;
        let lastHeight = 0;
        let firstValidHeight = 0; // 记录第一个有效高度
        
        const checkContentReady = () => {
          checkCount++;
          const currentHeight = scrollContainer.scrollHeight;
          const isHeightStable = currentHeight === lastHeight && currentHeight > 0;
          
          // 记录第一个有效高度
          if (firstValidHeight === 0 && currentHeight > 1000) {
            firstValidHeight = currentHeight;
          }
          
          if (isHeightStable) {
            stableCount++;
          } else {
            stableCount = 0;
          }
          
          // 激进条件：降低稳定性要求，增加提前恢复条件
          const minStableCount = isSlowDevice ? 5 : 4; // 大幅降低稳定性要求
          const isHeightSufficient = currentHeight >= targetScrollTop + scrollContainer.clientHeight;
          const isBasicReady = currentHeight > 5000; // 基础内容已加载
          const isEarlyReady = checkCount >= 3 && currentHeight > firstValidHeight * 0.8; // 3次检查后如果接近完整高度
          const isStableEnough = stableCount >= minStableCount && isHeightSufficient;
          const hasTimeout = checkCount >= maxChecks;
          
          console.log(`📏 检查内容高度: ${currentHeight}px (第${checkCount}次, 稳定${stableCount}次, 基础就绪:${isBasicReady})`);
          
          // 多种恢复条件：稳定达标 OR 基础就绪 OR 提前就绪 OR 超时
          if (isStableEnough || isBasicReady || isEarlyReady || hasTimeout) {
            const maxScroll = Math.max(0, currentHeight - scrollContainer.clientHeight);
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));
            
            if (finalScrollTop > 0) {
              // 直接设置位置，避免scrollTo的动画效果
              scrollContainer.scrollTop = finalScrollTop;
              
              console.log(`📍 恢复滚动位置: ${fileId} -> ${finalScrollTop}px (页面高度: ${currentHeight}px, 触发条件: ${isStableEnough ? '稳定' : isBasicReady ? '基础就绪' : isEarlyReady ? '提前就绪' : '超时'})`);
              
              // 大幅缩短释放锁定时间
              setTimeout(() => {
                isRestoringRef.current = false;
                console.log(`✅ 滚动位置恢复完成: ${fileId}`);
              }, isSlowDevice ? 300 : (isMobile ? 200 : 100));
            } else {
              console.log(`⚠️ 目标位置无效，跳过恢复: ${targetScrollTop}px`);
              isRestoringRef.current = false;
            }
          } else {
            // 继续等待内容加载
            lastHeight = currentHeight;
            setTimeout(checkContentReady, checkInterval);
          }
        };
        
        // 激进启动：立即开始检查，不等待
        checkContentReady();
      };
      
      // 立即开始等待
      waitForContentLoad();
    };

    // 2. 保存滚动位置（防抖处理）
    const saveScrollPosition = () => {
      // 如果正在恢复位置，不保存
      if (isRestoringRef.current) return;
      
      const scrollTop = scrollContainer.scrollTop;
      sessionStorage.setItem(storageKey, scrollTop.toString());
      // console.log(`💾 保存滚动位置: ${fileId} -> ${scrollTop}px`);
    };

    const debouncedSavePosition = debounce(saveScrollPosition, 100);
    scrollHandlerRef.current = debouncedSavePosition;

    // 3. 添加滚动事件监听器
    scrollContainer.addEventListener('scroll', debouncedSavePosition);

    // 4. 恢复滚动位置
    restoreScrollPosition();

    // 5. 清理函数
    return () => {
      if (scrollHandlerRef.current) {
        scrollContainer.removeEventListener('scroll', scrollHandlerRef.current);
      }
    };
  }, [fileId]); // 依赖 fileId，当文件切换时重新设置

  // 当组件卸载时，清理事件监听器
  useEffect(() => {
    return () => {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer && scrollHandlerRef.current) {
        scrollContainer.removeEventListener('scroll', scrollHandlerRef.current);
      }
    };
  }, []);

  return scrollContainerRef;
}