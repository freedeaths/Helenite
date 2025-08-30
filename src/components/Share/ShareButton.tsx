import React, { useState } from 'react';
import { ActionIcon, Menu, Tooltip, Button, Text } from '@mantine/core';
import { IconLink, IconBrandTwitter, IconBrandWechat, IconCopy, IconCheck, IconShare, IconBug } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { QRCodeModal } from './QRCodeModal';

export interface ShareButtonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'light' | 'filled';
}

export function ShareButton({ size = 'sm', variant = 'subtle' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [qrModalOpened, setQrModalOpened] = useState(false);
  
  const currentUrl = window.location.href;
  const pageTitle = document.title;
  
  // 检测移动端和原生分享支持
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const supportsNativeShare = 'share' in navigator;
  
  // URL处理策略：根据不同平台需求
  const getDecodedUrl = () => {
    try {
      return decodeURIComponent(currentUrl);
    } catch (error) {
      console.warn('Failed to decode URL:', error);
      return currentUrl;
    }
  };
  
  const decodedUrl = getDecodedUrl(); // 解码版本（用于原生分享、微信）
  const encodedUrl = currentUrl;      // 编码版本（用于Twitter、调试对比）

  // 复制链接功能 - 使用解码版本显示中文字符
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(decodedUrl);
      setCopied(true);
      notifications.show({
        title: '复制成功',
        message: '链接已复制到剪贴板',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      
      // 2秒后重置图标
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级到传统方法
      const textarea = document.createElement('textarea');
      textarea.value = decodedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      setCopied(true);
      notifications.show({
        title: '复制成功',
        message: '链接已复制到剪贴板',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 分享到Twitter/X - 使用编码版本确保URL完整性
  const handleShareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(pageTitle)}&url=${encodeURIComponent(encodedUrl)}`;
    console.log('Twitter分享URL:', twitterUrl);
    console.log('使用编码URL:', encodedUrl);
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  // 原生系统分享功能 - 使用解码版本显示中文字符
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        // 调试：显示分享数据
        notifications.show({
          title: '🔍 调试信息',
          message: `准备分享: ${decodedUrl}`,
          color: 'blue',
          autoClose: 3000,
        });
        
        await navigator.share({
          title: pageTitle,
          text: `查看这篇文章：${pageTitle}`,
          url: decodedUrl,
        });
        
        notifications.show({
          title: '分享成功',
          message: '内容已通过系统分享',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } catch (error) {
        // 用户取消分享或其他错误
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        notifications.show({
          title: '🐛 分享失败',
          message: `错误: ${errorMsg}`,
          color: 'red',
          autoClose: 5000,
        });
        
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Native share failed:', error);
          // 降级到复制链接
          handleCopyLink();
        }
      }
    } else {
      notifications.show({
        title: '🔍 调试信息',
        message: '不支持原生分享，降级到复制',
        color: 'yellow',
        autoClose: 3000,
      });
      // 不支持原生分享，降级到复制链接
      handleCopyLink();
    }
  };

  // 检测浏览器支持情况（调试用）
  const handleBrowserCheck = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    const hasNativeShare = 'share' in navigator;
    const isSecureContext = window.isSecureContext;
    
    notifications.show({
      title: '🔍 浏览器检测结果',
      message: `移动端:${isMobile} | 微信:${isWechat} | 原生分享:${hasNativeShare} | HTTPS:${isSecureContext}`,
      color: 'blue',
      autoClose: 8000,
    });

    // 显示URL对比
    setTimeout(() => {
      notifications.show({
        title: '🔗 URL对比',
        message: `编码前: ${encodedUrl.substring(encodedUrl.lastIndexOf('/') + 1)}`,
        color: 'orange',
        autoClose: 6000,
      });
    }, 1000);

    setTimeout(() => {
      notifications.show({
        title: '🔗 URL对比',
        message: `解码后: ${decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1)}`,
        color: 'green',
        autoClose: 6000,
      });
    }, 2000);
  };

  // 分享到微信（移动端检测）
  const handleShareToWechat = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    const hasNativeShare = 'share' in navigator;
    
    if (isWechat) {
      // 在微信内直接提示
      notifications.show({
        title: '分享提示',
        message: '点击右上角"..."按钮分享给朋友或朋友圈',
        color: 'blue',
        icon: <IconBrandWechat size={16} />,
        autoClose: 5000,
      });
    } else if (isMobile && hasNativeShare) {
      // 移动端支持原生分享：尝试原生分享
      handleNativeShare();
    } else {
      // 桌面端：显示二维码
      setQrModalOpened(true);
    }
  };

  return (
    <>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Tooltip label="分享" position="bottom">
            <ActionIcon
              variant={variant}
              color="gray"
              size={size}
            >
              <IconLink size={18} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>分享到</Menu.Label>
          
          {/* 原生分享（移动端优先显示） */}
          {/* {supportsNativeShare && (
            <Menu.Item
              leftSection={<IconShare size={16} />}
              onClick={handleNativeShare}
            >
              <Text size="sm">分享到其他应用</Text>
            </Menu.Item>
          )} */}
          
          <Menu.Item
            leftSection={<IconCopy size={16} />}
            onClick={handleCopyLink}
            rightSection={copied ? <IconCheck size={14} color="green" /> : null}
          >
            <Text size="sm">
              {copied ? '已复制' : '复制链接'}
            </Text>
          </Menu.Item>

          <Menu.Item
            leftSection={<IconBrandTwitter size={16} />}
            onClick={handleShareToTwitter}
          >
            <Text size="sm">分享到 X (Twitter)</Text>
          </Menu.Item>

          <Menu.Item
            leftSection={<IconBrandWechat size={16} />}
            onClick={handleShareToWechat}
            color="green"
          >
            <Text size="sm">分享到微信</Text>
          </Menu.Item>

          {/* <Menu.Divider /> */}
          
          {/* <Menu.Item
            leftSection={<IconBug size={16} />}
            onClick={handleBrowserCheck}
            color="gray"
          >
            <Text size="sm">检测浏览器支持</Text>
          </Menu.Item> */}

          {/* <Menu.Item
            leftSection={<IconBug size={16} />}
            onClick={() => {
              const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
              const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
              const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
              
              notifications.show({
                title: '📋 OG标签检测',
                message: `标题:${ogTitle} | 描述:${ogDesc?.substring(0, 30)}... | 图片:${ogImage}`,
                color: 'purple',
                autoClose: 8000,
              });
            }}
            color="purple"
          >
            <Text size="sm">检测OG标签</Text>
          </Menu.Item> */}
        </Menu.Dropdown>
      </Menu>

      {/* 二维码分享模态框 */}
      <QRCodeModal
        opened={qrModalOpened}
        onClose={() => setQrModalOpened(false)}
        url={decodedUrl}
        title={pageTitle}
      />
    </>
  );
}