/**
 * 开发者工具面板
 * 浮动的开发工具集合，无需修改路由系统
 */

import React, { useState } from 'react';
import { MarkdownProcessorTest } from './MarkdownProcessorTest';

interface DevTool {
  key: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
  description?: string;
}

const DEV_TOOLS: DevTool[] = [
  {
    key: 'markdown-test',
    name: 'Markdown 处理器',
    icon: '📝',
    component: MarkdownProcessorTest,
    description: '测试新版 Markdown 处理器功能'
  },
  // 未来可以轻松添加更多工具
  // {
  //   key: 'graph-debug',
  //   name: '图谱调试',
  //   icon: '🕸️',
  //   component: GraphDebugTool,
  // }
];

export function DevToolsPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // 只在开发环境显示
  if (import.meta.env.PROD) {
    return null;
  }

  const ActiveToolComponent = activeTool
    ? DEV_TOOLS.find(tool => tool.key === activeTool)?.component
    : null;

  return (
    <>
      {/* 触发按钮 */}
      {!isVisible && (
        <div
          className="fixed bottom-4 right-4 z-[9999]"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontSize: '20px'
          }}
          onClick={() => setIsVisible(true)}
          title="开发者工具"
        >
          🛠️
        </div>
      )}

      {/* 开发工具面板 */}
      {isVisible && (
        <div
          className="fixed z-[9999]"
          style={{
            top: isMinimized ? 'auto' : '10%',
            bottom: isMinimized ? '20px' : 'auto',
            right: '20px',
            width: isMinimized ? '300px' : '80%',
            height: isMinimized ? '60px' : '80%',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease'
          }}
        >
          {/* 工具栏 */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--background-modifier-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--background-secondary)',
              borderRadius: '8px 8px 0 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                🛠️ 开发者工具
              </span>
              {activeTool && (
                <span style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  marginLeft: '8px'
                }}>
                  - {DEV_TOOLS.find(t => t.key === activeTool)?.name}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                title={isMinimized ? '展开' : '最小化'}
              >
                {isMinimized ? '📈' : '📉'}
              </button>
              <button
                onClick={() => {
                  setIsVisible(false);
                  setActiveTool(null);
                  setIsMinimized(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                title="关闭"
              >
                ❌
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* 工具列表 */}
              {!activeTool && (
                <div style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    {DEV_TOOLS.map(tool => (
                      <div
                        key={tool.key}
                        onClick={() => setActiveTool(tool.key)}
                        style={{
                          padding: '16px',
                          border: '1px solid var(--background-modifier-border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'var(--background-secondary)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--interactive-accent)';
                          e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--background-modifier-border)';
                          e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                        }}
                      >
                        <div style={{
                          fontSize: '24px',
                          marginBottom: '8px',
                          textAlign: 'center'
                        }}>
                          {tool.icon}
                        </div>
                        <div style={{
                          fontWeight: 'bold',
                          marginBottom: '4px',
                          textAlign: 'center'
                        }}>
                          {tool.name}
                        </div>
                        {tool.description && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            textAlign: 'center'
                          }}>
                            {tool.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 工具内容 */}
              {activeTool && ActiveToolComponent && (
                <div style={{
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--background-modifier-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => setActiveTool(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}
                      title="返回工具列表"
                    >
                      ← 返回
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <ActiveToolComponent />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}