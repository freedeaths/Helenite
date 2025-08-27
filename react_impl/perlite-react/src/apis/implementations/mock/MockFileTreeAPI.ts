import type { IFileTreeAPI, FileTree, FileMetadata, FolderStats } from '../../interfaces';

/**
 * Mock 文件树 API 实现
 * 用于开发和测试，提供模拟数据
 */
export class MockFileTreeAPI implements IFileTreeAPI {
  private mockData: FileTree[] = [
    {
      name: 'Welcome',
      path: '/Welcome',
      type: 'file',
      metadata: {
        title: 'Welcome',
        tags: [],
        aliases: ['Welcome'],
        frontmatter: {},
        headings: [
          { heading: 'Welcome to Perlite', level: 1 },
          { heading: 'Getting Started', level: 2 }
        ],
        links: [
          { link: 'How-to-Implement-obsidian-sharing-space', relativePath: 'How-to-Implement-obsidian-sharing-space.md' }
        ],
        backlinks: []
      }
    },
    {
      name: 'How-to-Implement-obsidian-sharing-space',
      path: '/How-to-Implement-obsidian-sharing-space',
      type: 'file',
      metadata: {
        title: 'How-to-Implement-obsidian-sharing-space',
        tags: ['tech'],
        aliases: ['How-to-Implement-obsidian-sharing-space'],
        frontmatter: { test: 'TeSt' },
        headings: [
          { heading: 'TL; DR', level: 2 },
          { heading: 'About Sharing', level: 2 },
          { heading: 'Purpose', level: 3 },
          { heading: 'Implementation', level: 2 }
        ],
        links: [],
        backlinks: []
      }
    },
    {
      name: 'LLM',
      path: '/LLM',
      type: 'folder',
      children: [
        {
          name: 'Multi-agent-Voyager-Play-Minecraft',
          path: '/LLM/Multi-agent-Voyager-Play-Minecraft',
          type: 'file',
          metadata: {
            title: 'Multi-agent-Voyager-Play-Minecraft',
            tags: [],
            aliases: [],
            frontmatter: {},
            headings: [
              { heading: 'The Voyager Paradigm: Minecraft as a Testbed for Multi-Agent AI Collaboration', level: 1 },
              { heading: 'TL; DR', level: 2 },
              { heading: 'Overview', level: 2 },
              { heading: 'Prerequisites', level: 2 }
            ],
            links: [],
            backlinks: []
          }
        },
        {
          name: 'Contribute-Groupchat-to-Autogen',
          path: '/LLM/Contribute-Groupchat-to-Autogen',
          type: 'file',
          metadata: {
            title: 'Contribute-Groupchat-to-Autogen',
            tags: [],
            aliases: [],
            frontmatter: {},
            headings: [
              { heading: 'How I Contributed to a 20k+ Stars Open Source Project', level: 1 },
              { heading: 'Introduction', level: 2 },
              { heading: 'Background', level: 3 }
            ],
            links: [],
            backlinks: []
          }
        }
      ]
    },
    {
      name: 'Trips',
      path: '/Trips',
      type: 'folder',
      children: [
        {
          name: 'Visited-Places',
          path: '/Trips/Visited-Places',
          type: 'file',
          metadata: {
            title: 'Visited-Places',
            tags: [],
            aliases: [],
            frontmatter: {},
            headings: [
              { heading: 'China', level: 2 },
              { heading: 'Japan', level: 2 },
              { heading: '北海道 (ほっかいどう)', level: 3 }
            ],
            links: [
              { link: '夏之北海道', relativePath: 'Trips/Plans/夏之北海道.md' },
              { link: '進撃の近畿', relativePath: 'Trips/Plans/進撃の近畿.md' }
            ],
            backlinks: []
          }
        },
        {
          name: 'Plans',
          path: '/Trips/Plans',
          type: 'folder',
          children: [
            {
              name: '夏之北海道',
              path: '/Trips/Plans/夏之北海道',
              type: 'file',
              metadata: {
                title: '夏之北海道',
                tags: ['japan', 'travel'],
                aliases: [],
                frontmatter: {},
                headings: [
                  { heading: 'Preface', level: 2 },
                  { heading: 'Schedule', level: 2 },
                  { heading: 'Day 1 上海-->札幌-->TOMAMU', level: 3 }
                ],
                links: [
                  { link: '制作日本旅行攻略一般要点', relativePath: 'Trips/制作日本旅行攻略一般要点.md' }
                ],
                backlinks: [
                  { link: 'Visited-Places', relativePath: 'Trips/Visited-Places.md' }
                ]
              }
            }
          ]
        }
      ]
    },
    {
      name: 'FunFacts',
      path: '/FunFacts',
      type: 'folder',
      children: [
        {
          name: '阳台植物',
          path: '/FunFacts/阳台植物',
          type: 'file',
          metadata: {
            title: '阳台植物',
            tags: [],
            aliases: [],
            frontmatter: {},
            headings: [
              { heading: 'WIP', level: 2 }
            ],
            links: [],
            backlinks: []
          }
        }
      ]
    }
  ];
  
  /**
   * 获取 Mock 文件树数据
   */
  async getFileTree(): Promise<FileTree[]> {
    // 模拟网络延迟
    await this.delay(100);
    return JSON.parse(JSON.stringify(this.mockData)); // 深拷贝避免意外修改
  }
  
  /**
   * 选择文件
   */
  async selectFile(path: string): Promise<void> {
    await this.delay(50);
    console.log('[Mock] File selected:', path);
  }
  
  /**
   * 展开文件夹
   */
  async expandFolder(path: string): Promise<FileTree[]> {
    await this.delay(50);
    const folder = this.findNodeByPath(this.mockData, path);
    return folder?.children || [];
  }
  
  /**
   * 获取文件夹统计信息
   */
  async getFolderStats(path?: string): Promise<FolderStats> {
    await this.delay(100);
    
    const targetItems = path 
      ? this.findNodeByPath(this.mockData, path)?.children || []
      : this.mockData;
    
    const stats = this.calculateStats(targetItems);
    return {
      ...stats,
      lastModified: '2025-08-27T10:30:00Z'
    };
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 模拟延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 在树中查找指定路径的节点
   */
  private findNodeByPath(tree: FileTree[], path: string): FileTree | null {
    for (const node of tree) {
      if (node.path === path) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }
  
  /**
   * 计算统计信息
   */
  private calculateStats(items: FileTree[]): Pick<FolderStats, 'totalFiles' | 'totalFolders'> {
    let totalFiles = 0;
    let totalFolders = 0;
    
    const countItems = (nodes: FileTree[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          totalFiles++;
        } else if (node.type === 'folder') {
          totalFolders++;
          if (node.children) {
            countItems(node.children);
          }
        }
      });
    };
    
    countItems(items);
    
    return { totalFiles, totalFolders };
  }
}