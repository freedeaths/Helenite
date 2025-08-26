export interface FileTree {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTree[];
  metadata?: FileMetadata;
}

export interface FileMetadata {
  title?: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  modified?: string;
  links?: string[];
  backlinks?: string[];
}

export interface SearchResult {
  file: string;
  matches: Array<{
    line: number;
    content: string;
    highlighted: string;
  }>;
}

export interface GraphNode {
  id: string;
  label: string;
  title: string;
  type: 'file' | 'tag';
  size?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'link' | 'tag';
}