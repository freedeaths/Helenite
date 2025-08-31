import React, { useEffect, useState } from 'react';
import { fetchVault } from '../../utils/fetchWithAuth';

interface VaultImageProps {
  src: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * 图片组件，使用 fetchWithAuth 加载 Vault 中的图片
 * 处理需要自定义头部认证的图片资源
 */
export const VaultImage: React.FC<VaultImageProps> = ({ 
  src, 
  alt = '', 
  className = '', 
  loading = 'lazy' 
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 如果是外部 URL，直接使用
        if (src.startsWith('http://') || src.startsWith('https://')) {
          setImageUrl(src);
          setIsLoading(false);
          return;
        }

        // 使用 fetchWithAuth 加载图片
        const response = await fetchVault(src);
        
        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }

        // 将响应转换为 Blob
        const blob = await response.blob();
        
        // 创建对象 URL
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load image:', src, err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // 清理函数
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-100 animate-pulse`} style={{ minHeight: '100px' }}>
        <div className="flex items-center justify-center h-full text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-gray-100 border border-gray-300 p-4`}>
        <div className="text-red-500 text-sm">
          ⚠️ {alt || 'Image failed to load'}
        </div>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={alt}
      className={className}
      loading={loading}
    />
  );
};