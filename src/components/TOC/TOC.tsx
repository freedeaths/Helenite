import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import type { TOCHeading } from '../../types/vaultTypes.js';

/**
 * 新架构目录组件 - 完全复制老版本 TOC 功能
 * 基于 VaultService 的数据访问，但保持和老版本一致的 UI 和交互
 */
export function TOC() {
  const { currentDocument } = useVaultStore();
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // 复制老版本的完整跳转逻辑
  const handleHeadingClick = (id: string) => {
    const { isMobile, setMobileDropdownOpen } = useUIStore.getState();

    // 完全复制老版本的查找滚动容器逻辑 - 适配新 DOM 结构
    const findScrollContainer = (targetElement: HTMLElement): HTMLElement | null => {
      // Method 1: Look for the main content div with flex-1 overflow-auto (新架构的滚动容器)
      const mainContentContainers = document.querySelectorAll('div.flex-1.overflow-auto');

      for (const container of mainContentContainers) {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.contains(targetElement)) {
          // console.log('🎯 找到新架构滚动容器:', htmlContainer.className);
          return htmlContainer;
        }
      }

      // Method 2: Look for any scrollable parent by walking up the DOM tree
      let currentElement = targetElement.parentElement;
      while (currentElement && currentElement !== document.body) {
        const computedStyle = window.getComputedStyle(currentElement);
        const hasScroll = computedStyle.overflowY === 'auto' ||
                         computedStyle.overflowY === 'scroll' ||
                         computedStyle.overflow === 'auto' ||
                         computedStyle.overflow === 'scroll';

        if (hasScroll && currentElement.scrollHeight > currentElement.clientHeight) {
          // console.log('🎯 找到滚动父容器:', currentElement.className, { scrollHeight: currentElement.scrollHeight, clientHeight: currentElement.clientHeight });
          return currentElement;
        }
        currentElement = currentElement.parentElement;
      }

      // Method 3: Fallback to any scrollable container that contains our element
      const allScrollableContainers = document.querySelectorAll('*[style*="overflow"], .overflow-auto, .overflow-y-auto');

      for (const container of allScrollableContainers) {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.contains(targetElement) && htmlContainer.scrollHeight > htmlContainer.clientHeight) {
          // console.log('🎯 找到备用滚动容器:', htmlContainer.className);
          return htmlContainer;
        }
      }
      return null;
    };

    // 复制老版本的完整滚动逻辑
    const executeScroll = (retryCount = 0, isRetry = false) => {
      const element = document.getElementById(id);
      if (!element) {
        if (retryCount < 3) {
          // console.log(`🎯 NewTOC: Element "${id}" not found, retrying... (attempt ${retryCount + 1})`);
          setTimeout(() => executeScroll(retryCount + 1, true), 100);
          return;
        }
        // console.warn(`🎯 NewTOC: Element with id "${id}" not found after ${retryCount} retries`);
        return;
      }

      const scrollContainer = findScrollContainer(element);
      if (!scrollContainer) {
        // console.warn(`🎯 NewTOC: No scroll container found for element "${id}"`);
        return;
      }

      requestAnimationFrame(() => {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        const elementRelativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        const scrollOffset = 10;
        const targetScrollTop = Math.max(0, elementRelativeTop - scrollOffset);

        // console.log(`🎯 [${isMobile ? 'MOBILE' : 'DESKTOP'}] NewTOC Navigation ${isRetry ? '(RETRY)' : '(INITIAL)'}:
        //   Target: ${id}
        //   Container: ${scrollContainer.className}
        //   Container scroll: ${scrollContainer.scrollTop}px → ${targetScrollTop}px`);

        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'instant'
        });

        requestAnimationFrame(() => {
          const afterInstantScroll = scrollContainer.scrollTop;
          const scrollDiff = Math.abs(afterInstantScroll - targetScrollTop);

          if (scrollDiff > 5) {
            // console.warn(`🎯 NewTOC: Scroll position mismatch! Expected: ${targetScrollTop}px, Got: ${afterInstantScroll}px`);

            if (!isRetry && retryCount === 0) {
              // console.log('🎯 NewTOC: Retrying scroll due to position mismatch...');
              setTimeout(() => executeScroll(1, true), 150);
              return;
            }
          }

          scrollContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        });
      });
    };

    // 复制老版本的移动端处理逻辑
    if (isMobile) {
      setMobileDropdownOpen(false);

      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            executeScroll();
          });
        });
      }, 350);
    } else {
      executeScroll();
    }
  };

  // 复制老版本的滚动跟踪逻辑 - 适配新 DOM 结构
  useEffect(() => {
    if (!currentDocument?.metadata?.headings) return;

    const findMainContentScrollContainer = () => {
      // 优先查找新架构的滚动容器
      const mainContentContainers = document.querySelectorAll('div.flex-1.overflow-auto');

      for (const container of mainContentContainers) {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.scrollHeight > htmlContainer.clientHeight) {
          // console.log('🎯 滚动跟踪找到新架构容器:', htmlContainer.className);
          return htmlContainer;
        }
      }

      // 备用方案：通过 markdown-viewer 向上查找滚动容器
      const markdownViewers = document.querySelectorAll('.markdown-viewer, .markdown-content');
      if (markdownViewers.length > 0) {
        let element = markdownViewers[0].parentElement;
        while (element && element !== document.body) {
          const computedStyle = window.getComputedStyle(element);
          const hasScroll = computedStyle.overflowY === 'auto' ||
                           computedStyle.overflowY === 'scroll' ||
                           computedStyle.overflow === 'auto' ||
                           computedStyle.overflow === 'scroll';

          if (hasScroll && element.scrollHeight > element.clientHeight) {
            // console.log('🎯 滚动跟踪找到备用容器:', element.className);
            return element as HTMLElement;
          }
          element = element.parentElement;
        }
      }

      return null;
    };

    const updateActiveHeading = () => {
      const scrollContainer = findMainContentScrollContainer();
      if (!scrollContainer) return;

      if (!currentDocument?.metadata?.headings) return;

      const headings = currentDocument.metadata.headings
        .map((heading: TOCHeading) => ({
          ...heading,
          element: document.getElementById(heading.id)
        }))
        .filter((heading) => heading.element);

      let currentHeading = '';
      const scrollOffset = 30;
      const scrollTop = scrollContainer.scrollTop + scrollOffset;

      for (const heading of headings) {
        const element = heading.element!;
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const elementRelativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;

        if (elementRelativeTop <= scrollTop) {
          currentHeading = heading.id;
        } else {
          break;
        }
      }

      setActiveHeadingId(currentHeading);
    };

    updateActiveHeading();

    const scrollContainer = findMainContentScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateActiveHeading, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', updateActiveHeading);
    }
  }, [currentDocument]);

  // 完全复制老版本的 UI 结构
  if (!currentDocument?.metadata?.headings?.length) {
    return (
      <div className="h-full flex flex-col">
        <div className="text-sm font-medium mb-4 text-[var(--text-normal)] px-4 pt-4">
          Table of Contents
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="text-sm text-[var(--text-muted)]">
            No headings found in this document
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)] px-4 pt-4">
        Table of Contents
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-1 text-sm">
          {currentDocument.metadata.headings.map((heading: TOCHeading, index: number) => {
          const indent = (heading.level - 1) * 12; // 12px per level for cleaner look
          const isActive = activeHeadingId === heading.id;

          // Font size based on heading level - 完全复制老版本样式
          const getFontSize = (level: number) => {
            switch (level) {
              case 1: return 'text-sm font-semibold';
              case 2: return 'text-sm font-medium';
              case 3: return 'text-xs font-medium';
              case 4: return 'text-xs';
              case 5: return 'text-xs';
              case 6: return 'text-xs';
              default: return 'text-xs';
            }
          };

          return (
            <div
              key={`${heading.id}-${index}`}
              className={`
                cursor-pointer py-1.5 px-2 rounded transition-all duration-200 border-l-2
                ${isActive
                  ? 'text-[var(--interactive-accent)] border-l-[var(--interactive-accent)] bg-[var(--background-modifier-hover)]'
                  : 'text-[var(--text-normal)] border-l-transparent hover:text-[var(--interactive-accent)] hover:border-l-[var(--interactive-accent)] hover:bg-[var(--background-modifier-hover)]'
                }
                ${getFontSize(heading.level)}
              `}
              style={{
                marginLeft: `${indent}px`,
                paddingLeft: `${8 + (heading.level - 1) * 4}px` // Progressive indentation
              }}
              onClick={() => handleHeadingClick(heading.id)}
              title={heading.text}
            >
              <span className="line-clamp-2">
                {heading.text}
              </span>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}