'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge, Dropdown, Typography, Button, Empty, Spin, Tag, Modal } from 'antd';
import {
  BellOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SendOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Paragraph, Title } = Typography;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Notification {
  NotificationID: string;
  Title: string;
  Content: string;
  NotificationType: string;
  CreatedAt: string;
  IsRead: boolean;
  SenderName: string;
  SenderRank?: string;
  IsGlobal?: boolean;
  TargetUnitID?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const typeConfig: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  INFO: {
    color: '#2563eb',
    bg: '#eff6ff',
    icon: <InfoCircleOutlined />,
    label: 'Thông tin',
  },
  WARNING: {
    color: '#d97706',
    bg: '#fffbeb',
    icon: <WarningOutlined />,
    label: 'Cảnh báo',
  },
  ERROR: {
    color: '#dc2626',
    bg: '#fef2f2',
    icon: <ThunderboltOutlined />,
    label: 'Khẩn',
  },
};

const getTypeConfig = (type: string) => typeConfig[type] ?? typeConfig.INFO;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- Fetch ---------- */

  const fetchNotifications = async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?userId=${user.userId}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SSE realtime ---------- */

  useEffect(() => {
    if (!user?.userId) return;
    fetchNotifications();

    const cleanup = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connectSSE = () => {
      cleanup();
      const es = new EventSource(`/api/notifications/stream?userId=${user.userId}`);
      eventSourceRef.current = es;
      es.onopen = () => {};
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_notification') fetchNotifications();
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();
    const fallbackPoll = setInterval(fetchNotifications, 30000);
    return () => {
      cleanup();
      clearInterval(fallbackPoll);
    };
  }, [user?.userId]);

  /* ---------- Mark as read ---------- */

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId: user?.userId }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.NotificationID === notificationId ? { ...n, IsRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  /* ---------- Open detail ---------- */

  const openDetail = (notif: Notification) => {
    if (!notif.IsRead) markAsRead(notif.NotificationID);
    setSelectedNotif(notif);
  };

  /* ================================================================== */
  /*  DROPDOWN – Notification list                                       */
  /* ================================================================== */

  const notificationMenu = (
    <div
      style={{
        width: 420,
        maxHeight: 520,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,.12)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 17 }}>
            Thông báo
          </Text>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 10,
                padding: '1px 8px',
                lineHeight: '20px',
              }}
            >
              {unreadCount} mới
            </span>
          )}
        </div>
        <Button
          type="link"
          size="small"
          onClick={() => router.push('/notifications')}
          style={{ fontSize: 13 }}
        >
          Xem tất cả
        </Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Empty
              image={<InboxOutlined style={{ fontSize: 48, color: '#d1d5db' }} />}
              description={<Text type="secondary">Không có thông báo nào</Text>}
            />
          </div>
        ) : (
          notifications.map((item) => {
            const cfg = getTypeConfig(item.NotificationType);
            return (
              <div
                key={item.NotificationID}
                onClick={() => openDetail(item)}
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  gap: 12,
                  cursor: 'pointer',
                  borderBottom: '1px solid #f5f5f5',
                  background: item.IsRead ? '#fff' : '#f0fdf4',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = item.IsRead
                    ? '#fff'
                    : '#f0fdf4';
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: cfg.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: cfg.color,
                    flexShrink: 0,
                  }}
                >
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      strong={!item.IsRead}
                      style={{
                        fontSize: 14,
                        color: item.IsRead ? '#374151' : '#111827',
                        flex: 1,
                        minWidth: 0,
                      }}
                      ellipsis
                    >
                      {item.Title}
                    </Text>
                    {!item.IsRead && (
                      <span
                        style={{
                          background: '#fbbf24',
                          color: '#78350f',
                          fontWeight: 700,
                          fontSize: 10,
                          borderRadius: 4,
                          padding: '1px 6px',
                          lineHeight: '16px',
                          flexShrink: 0,
                        }}
                      >
                        MỚI
                      </span>
                    )}
                  </div>

                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{
                      fontSize: 13,
                      color: '#6b7280',
                      marginBottom: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.Content}
                  </Paragraph>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: '#9ca3af',
                    }}
                  >
                    {item.IsGlobal ? (
                      <Tag
                        icon={<GlobalOutlined />}
                        color="blue"
                        style={{
                          margin: 0,
                          fontSize: 11,
                          borderRadius: 4,
                          lineHeight: '20px',
                        }}
                      >
                        Toàn hệ thống
                      </Tag>
                    ) : item.TargetUnitID ? (
                      <Tag
                        icon={<TeamOutlined />}
                        color="green"
                        style={{
                          margin: 0,
                          fontSize: 11,
                          borderRadius: 4,
                          lineHeight: '20px',
                        }}
                      >
                        Theo đơn vị
                      </Tag>
                    ) : null}
                    <span>
                      {item.SenderName} · {dayjs(item.CreatedAt).fromNow()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  /* ================================================================== */
  /*  DETAIL MODAL – positioned to the LEFT                              */
  /* ================================================================== */

  const renderDetail = () => {
    if (!selectedNotif) return null;
    const cfg = getTypeConfig(selectedNotif.NotificationType);
    const isNew =
      !selectedNotif.IsRead ||
      dayjs().diff(dayjs(selectedNotif.CreatedAt), 'hour') < 24;

    return (
      <Modal
        open={!!selectedNotif}
        onCancel={() => setSelectedNotif(null)}
        footer={null}
        width={520}
        centered
        mask={false}
        closable={false}
        styles={{
          body: { padding: 0 },
        }}
        style={{
          position: 'fixed',
          top: 53,
          left: 'calc(74% - 480px)',
          transform: 'translateX(-50%)',
          margin: 0,
          paddingBottom: 0,
        }}
      >
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
          {/* ---- Header ---- */}
          <div
            style={{
              padding: '16px 24px 12px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text strong style={{ fontSize: 16, color: '#111827' }}>
              Chi tiết thông báo
            </Text>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined style={{ fontSize: 14 }} />}
              onClick={() => setSelectedNotif(null)}
              style={{ color: '#9ca3af' }}
            />
          </div>

          {/* ---- Scrollable body ---- */}
          <div style={{ maxHeight: 460, overflowY: 'auto', padding: '20px 24px 24px' }}>
            {/* Title */}
            <Title
              level={5}
              style={{ margin: '0 0 14px', color: '#111827', lineHeight: 1.4 }}
            >
              {selectedNotif.Title}
            </Title>

            {/* Status bar */}
            <div
              style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {isNew && (
                  <span
                    style={{
                      background: '#fbbf24',
                      color: '#78350f',
                      fontWeight: 700,
                      fontSize: 11,
                      borderRadius: 6,
                      padding: '2px 10px',
                      letterSpacing: 0.5,
                    }}
                  >
                    MỚI
                  </span>
                )}
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 12,
                    color: cfg.color,
                    background: cfg.bg,
                    border: 'none',
                  }}
                >
                  {cfg.label}
                </Tag>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <SendOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                <span style={{ color: '#9ca3af' }}>Được gửi bởi:</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>
                  {selectedNotif.SenderName || 'Hệ thống'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <ClockCircleOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                <span style={{ color: '#9ca3af' }}>Thời gian:</span>
                <span style={{ color: '#374151', fontWeight: 500 }}>
                  {dayjs(selectedNotif.CreatedAt).format('HH:mm DD/MM/YYYY')}
                </span>
              </div>
            </div>

            {/* Content */}
            <div style={{ marginBottom: 20 }}>
              <Text
                strong
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 10,
                }}
              >
                Nội dung
              </Text>
              <div
                style={{
                  fontSize: 14,
                  color: '#374151',
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedNotif.Content}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#f0f0f0', marginBottom: 16 }} />

            {/* Other info */}
            <div>
              <Text
                strong
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  letterSpacing: 1,
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                Thông tin khác
              </Text>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Scope */}
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                    Phạm vi
                  </div>
                  {selectedNotif.IsGlobal ? (
                    <Tag
                      icon={<GlobalOutlined />}
                      color="blue"
                      style={{ margin: 0, borderRadius: 6, fontSize: 12 }}
                    >
                      Toàn bộ đơn vị cấp dưới
                    </Tag>
                  ) : selectedNotif.TargetUnitID ? (
                    <Tag
                      icon={<TeamOutlined />}
                      color="green"
                      style={{ margin: 0, borderRadius: 6, fontSize: 12 }}
                    >
                      Theo đơn vị
                    </Tag>
                  ) : (
                    <Tag
                      icon={<GlobalOutlined />}
                      color="blue"
                      style={{ margin: 0, borderRadius: 6, fontSize: 12 }}
                    >
                      Toàn bộ đơn vị cấp dưới
                    </Tag>
                  )}
                </div>

                {/* Status */}
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                    Trạng thái
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedNotif.IsRead ? (
                      <>
                        <CheckCircleOutlined style={{ color: '#16a34a' }} />
                        <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 500 }}>
                          Đã đọc
                        </span>
                      </>
                    ) : (
                      <>
                        <SendOutlined style={{ color: '#2563eb' }} />
                        <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 500 }}>
                          Đang hiệu lực
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */

  return (
    <>
      <Dropdown
        popupRender={() => notificationMenu}
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
              color: unreadCount > 0 ? '#4ade80' : 'rgba(255,255,255,.75)',
              padding: '4px 8px',
            }}
          />
        </Badge>
      </Dropdown>

      {renderDetail()}
    </>
  );
}
