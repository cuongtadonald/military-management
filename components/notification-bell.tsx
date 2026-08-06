'use client';

import { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Avatar, Typography, Button, Space, Empty, Spin, Tag } from 'antd';
import { BellOutlined, CheckOutlined, MailOutlined, GlobalOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Paragraph } = Typography;

interface Notification {
  NotificationID: string;
  Title: string;
  Content: string;
  NotificationType: string;
  CreatedAt: string;
  IsRead: boolean;
  SenderName: string;
  SenderRank: string;
  IsGlobal?: boolean;
  TargetUnitID?: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      fetchNotifications();
      // Poll mỗi 30 giây
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.userId]);

  const fetchNotifications = async () => {
    if (!user?.userId) return;
    
    try {
      const res = await fetch(`/api/notifications?userId=${user.userId}&limit=10`);
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId: user?.userId }),
      });
      
      // Cập nhật UI
      setNotifications(prev =>
        prev.map(n =>
          n.NotificationID === notificationId ? { ...n, IsRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INFO':
        return <BellOutlined style={{ color: '#1890ff' }} />;
      case 'WARNING':
        return <BellOutlined style={{ color: '#faad14' }} />;
      case 'ERROR':
        return <BellOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <BellOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getScopeTag = (notification: Notification) => {
    if (notification.IsGlobal) {
      return <Tag icon={<GlobalOutlined />} color="blue">Toàn hệ thống</Tag>;
    } else if (notification.TargetUnitID) {
      return <Tag icon={<TeamOutlined />} color="green">Theo đơn vị</Tag>;
    }
    return null;
  };

  const notificationMenu = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto', background: '#fff' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 16 }}>Thông báo</Text>
        <Button type="link" size="small" onClick={() => router.push('/notifications')}>
          Xem tất cả
        </Button>
      </div>
      
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="Không có thông báo nào" style={{ padding: 40 }} />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                background: item.IsRead ? '#fff' : '#f6ffed',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0'
              }}
              onClick={() => !item.IsRead && markAsRead(item.NotificationID)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: item.IsRead ? '#f0f0f0' : '#e6f7ff' }}>
                    {getNotificationIcon(item.NotificationType)}
                  </Avatar>
                }
                title={
                  <Space>
                    <Text strong={item.IsRead} style={{ fontSize: 14 }}>{item.Title}</Text>
                    {!item.IsRead && <Badge status="processing" />}
                  </Space>
                }
                description={
                  <div>
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 8, fontSize: 13, color: '#666' }}
                    >
                      {item.Content}
                    </Paragraph>
                    <Space size={8}>
                      {getScopeTag(item)}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.SenderName} • {dayjs(item.CreatedAt).fromNow()}
                      </Text>
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      {notifications.length > 0 && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Button type="link" onClick={() => router.push('/notifications')}>
            Xem tất cả thông báo
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => notificationMenu}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          style={{
            color: unreadCount > 0 ? '#1890ff' : '#666',
            padding: '4px 8px'
          }}
        />
      </Badge>
    </Dropdown>
  );
}
