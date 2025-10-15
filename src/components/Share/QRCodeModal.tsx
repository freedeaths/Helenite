import { useEffect, useState } from 'react';
import { Modal, Text, Stack, Button, Center } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  opened: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export function QRCodeModal({ opened, onClose, url, title }: QRCodeModalProps) {
  const [qrCodeDataURL, setQRCodeDataURL] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened && url) {
      setLoading(true);
      QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((dataURL) => {
          setQRCodeDataURL(dataURL);
          setLoading(false);
        })
        .catch(() => {
          // console.error('生成二维码失败:', error);
          setLoading(false);
        });
    }
  }, [opened, url]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notifications.show({
        title: '复制成功',
        message: 'URL已复制到剪贴板',
        color: 'green',
      });
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      notifications.show({
        title: '复制成功',
        message: 'URL已复制到剪贴板',
        color: 'green',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="微信分享二维码" centered size="sm">
      <Stack gap="md">
        <Text size="sm" c="dimmed" ta="center">
          使用微信扫描下方二维码访问并分享
        </Text>

        <Center>
          {loading ? (
            <div
              style={{
                width: 256,
                height: 256,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #ccc',
              }}
            >
              <Text size="sm" c="dimmed">
                生成中...
              </Text>
            </div>
          ) : qrCodeDataURL ? (
            <img
              src={qrCodeDataURL}
              alt="分享二维码"
              style={{
                width: 256,
                height: 256,
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            />
          ) : (
            <div
              style={{
                width: 256,
                height: 256,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #ccc',
              }}
            >
              <Text size="sm" c="dimmed">
                生成失败
              </Text>
            </div>
          )}
        </Center>

        <Text size="xs" c="dimmed" ta="center" style={{ wordBreak: 'break-all' }}>
          {title}
        </Text>

        <Stack gap="xs">
          <Button
            leftSection={<IconCopy size={16} />}
            variant="light"
            onClick={handleCopyUrl}
            fullWidth
          >
            复制链接
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
