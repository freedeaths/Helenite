/**
 * Cache Configuration for Helenite Vault System
 *
 * This configuration drives the intelligent caching strategy:
 * - meta data (metadata.json, file tree) is always cached
 * - File content uses LRU strategy with memory limits
 * - Attachments rely on browser native caching
 */

export interface CacheConfig {
  // meta data caching (essential for functionality)
  meta: {
    metadata: {
      ttl: number;           // Time to live in milliseconds
      persistent: true;      // Keep in cache during session
      checkInterval: number; // How often to check for updates
      useMD5: boolean;       // Use MD5 hash to detect changes
    };
    tags: {
      ttl: number;           // Time to live in milliseconds
      persistent: true;      // Keep in cache during session
      checkInterval: number; // How often to check for updates
      useMD5: boolean;       // Use MD5 hash to detect changes
    };
    // All other computed data (fileTree, globalGraph, etc.)
    // follows metadata lifecycle - no separate config needed
  };

  // File content caching (follows metadata lifecycle)
  files: {
    maxCount: number;        // Maximum number of cached files
    maxMemoryMB: number;     // Memory limit for text content
    strategy: 'LRU';         // Eviction strategy when limits exceeded
  };

  // Attachment caching (follows metadata lifecycle)
  attachments: {
    enabled: boolean;        // Whether to actively cache attachments
    maxCount?: number;       // Maximum number of cached attachments (when enabled)
    maxMemoryMB?: number;    // Memory limit for attachments (when enabled)
    browserOnly: boolean;    // Rely on browser native caching
  };

  // Debug and monitoring (development aid)
  debug: {
    logCacheHits: boolean;   // Log cache hits/misses
    logMemoryUsage: boolean; // Log memory consumption
    maxLogEntries: number;   // Limit debug log size
  };

  // Force refresh mechanism
  forceRefresh: {
    enabled: boolean;        // Allow manual cache invalidation
    shortcut: string;        // Keyboard shortcut (e.g., 'Ctrl+Shift+R')
  };
}

/**
 * Default cache configuration
 *
 * Optimized for typical blog writing workflow:
 * - 5min TTL matches OneDrive sync frequency
 * - 10 files + 15MB limit handles medium-sized vaults
 * - Conservative approach to avoid memory issues
 */
export const defaultCacheConfig: CacheConfig = {
  meta: {
    metadata: {
      ttl: 5 * 60 * 1000,        // 5 minutes TTL
      persistent: true,
      checkInterval: 5 * 60 * 1000, // Check every 5 minutes
      useMD5: true,               // Enable MD5 change detection
    },
    tags: {
      ttl: 5 * 60 * 1000,        // 5 minutes TTL (same as metadata)
      persistent: true,
      checkInterval: 5 * 60 * 1000, // Check every 5 minutes
      useMD5: true,               // Enable MD5 change detection
    },
  },
  files: {
    maxCount: 10,             // At most 10 cached files
    maxMemoryMB: 15,          // 15MB text content limit
    strategy: 'LRU',
  },
  attachments: {
    enabled: false,           // No active attachment caching
    browserOnly: true,        // Browser handles images/videos
  },
  debug: {
    logCacheHits: import.meta.env.DEV,      // Only in development
    logMemoryUsage: import.meta.env.DEV,    // Only in development
    maxLogEntries: 100,       // Limit debug log size
  },
  forceRefresh: {
    enabled: true,            // Allow manual refresh
    shortcut: 'Ctrl+Shift+R', // Standard refresh shortcut
  },
};

/**
 * Cache categories for type safety
 */
export type CacheCategory = 'meta' | 'files' | 'attachments';

/**
 * Simple cache keys
 */
export const CacheKeys = {
  metadata: 'vault:metadata',
  metadataMD5: 'vault:metadata:md5',
  tags: 'vault:tags',
  tagsMD5: 'vault:tags:md5',
  fileTree: 'vault:file-tree',
  globalGraph: 'vault:global-graph',
  globalTags: 'vault:global-tags',
} as const;