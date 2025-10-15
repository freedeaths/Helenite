import React, { useState, useEffect } from 'react';
import './ImageWithZoom.css';

interface ImageWithZoomProps {
  src: string;
  alt?: string;
  className?: string;
  [key: string]: unknown;
}

export const ImageWithZoom: React.FC<ImageWithZoomProps> = ({
  src,
  alt,
  className,
  ...restProps
}) => {
  const [imageZoom, setImageZoom] = useState<{ src: string; alt: string } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  // 处理图片点击
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setImageZoom({
      src: src,
      alt: alt || '',
    });
  };

  // Reset image zoom states when modal opens/closes
  useEffect(() => {
    if (imageZoom) {
      setImageScale(1);
      setImagePosition({ x: 0, y: 0 });
      setIsDragging(false);
      setLastTouchDistance(0);
    }
  }, [imageZoom]);

  // Handle zoom/pan gestures when modal is open
  useEffect(() => {
    if (!imageZoom) return;

    // 双指距离计算
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const touch1 = touches[0];
      const touch2 = touches[1];
      return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    };

    // 鼠标滚轮缩放（桌面端）
    const handleWheel = (event: WheelEvent) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
        const scaleChange = event.deltaY > 0 ? 0.9 : 1.1;
        setImageScale((prevScale) => {
          const newScale = Math.min(Math.max(prevScale * scaleChange, 0.5), 5);
          return newScale;
        });
      }
    };

    // 鼠标拖拽（桌面端）
    const handleMouseDown = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement && imageScale > 1) {
        setIsDragging(true);
        setDragStart({
          x: event.clientX - imagePosition.x,
          y: event.clientY - imagePosition.y,
        });
        event.preventDefault();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && imageScale > 1) {
        setImagePosition({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // 触摸手势（移动端）
    const handleTouchStart = (event: TouchEvent) => {
      if (event.target instanceof HTMLImageElement) {
        if (event.touches.length === 1 && imageScale > 1) {
          // 单指拖拽
          const touch = event.touches[0];
          setIsDragging(true);
          setDragStart({
            x: touch.clientX - imagePosition.x,
            y: touch.clientY - imagePosition.y,
          });
        } else if (event.touches.length === 2) {
          // 双指缩放
          const distance = getTouchDistance(event.touches);
          setLastTouchDistance(distance);
          setIsDragging(false);
        }
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.target instanceof HTMLImageElement) {
        if (event.touches.length === 1 && isDragging && imageScale > 1) {
          // 单指拖拽
          const touch = event.touches[0];
          setImagePosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
          });
        } else if (event.touches.length === 2) {
          // 双指缩放
          const distance = getTouchDistance(event.touches);
          if (lastTouchDistance > 0) {
            const scaleChange = distance / lastTouchDistance;
            setImageScale((prevScale) => {
              const newScale = Math.min(Math.max(prevScale * scaleChange, 0.5), 5);
              return newScale;
            });
          }
          setLastTouchDistance(distance);
        }
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        setIsDragging(false);
        setLastTouchDistance(0);
      } else if (event.touches.length === 1) {
        setLastTouchDistance(0);
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [imageZoom, imageScale, imagePosition, isDragging, dragStart, lastTouchDistance]);

  return (
    <>
      <img src={src} alt={alt} className={className} onClick={handleImageClick} {...restProps} />

      {/* Image Zoom Modal */}
      {imageZoom && (
        <div
          className={`image-zoom-modal ${imageZoom ? 'show' : ''}`}
          onClick={(e) => {
            // 只有点击背景（非图片）才关闭
            if (e.target === e.currentTarget) {
              setImageZoom(null);
            }
          }}
        >
          <div className="close-hint">点击空白处关闭 • 滚轮/双指缩放</div>
          <img
            src={imageZoom.src}
            alt={imageZoom.alt}
            style={{
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              userSelect: 'none',
              touchAction: 'none', // 防止浏览器默认的触摸行为
            }}
            onClick={(e) => {
              e.stopPropagation(); // 防止点击图片时关闭模态框
            }}
            onDragStart={(e) => e.preventDefault()} // 防止图片拖拽
          />

          {/* 缩放指示器 */}
          {imageScale !== 1 && (
            <div className="zoom-indicator">{Math.round(imageScale * 100)}%</div>
          )}
        </div>
      )}
    </>
  );
};
