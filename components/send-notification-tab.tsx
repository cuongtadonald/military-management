'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Radio, Card, App, Typography, Space, Tag, Alert } from 'antd';
import { SendOutlined, GlobalOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '@/components/auth-provider';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface SubordinateUser {
  UserID: string;
  Username: string;
  FullName: string;
  RoleName: string;
  UnitID: string;
  PermissionLevel: number;
}

export default function SendNotificationTab() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<'global' | 'subordinate'>('global');
  const [subordinateUsers, setSubordinateUsers] = useState<SubordinateUser[]>([]);

  useEffect(() => {
    if (user?.userId) {
      loadSubordinateUsers();
    }
  }, [user?.userId]);

  const loadSubordinateUsers = async () => {
    try {
      const res = await fetch(`/api/subordinate-users?userId=${user?.userId}`);
      const data = await res.json();
      if (data.success) {
        setSubordinateUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading subordinate users:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!user?.userId) return;

    setLoading(true);
    try {
      const payload = {
        title: values.title,
        content: values.content,
        senderId: user.userId,
        isGlobal: scope === 'global',
        targetUserIds: scope === 'subordinate' ? values.targetUserIds : [],
        notificationType: values.notificationType || 'INFO',
      };

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        message.success('Đã gửi thông báo thành công');
        form.resetFields();
        setScope('global');
      } else {
        message.error(data.message || 'Lỗi khi gửi thông báo');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      message.error('Lỗi khi gửi thông báo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ borderRadius: 8 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          <SendOutlined style={{ marginRight: 8, color: '#3a4d2e' }} />
          Gửi thông báo
        </Title>
        <Text type="secondary">
          Gửi thông báo đến cấp dưới hoặc toàn hệ thống
        </Text>
      </div>

      {/* <Alert
        message="Lưu ý"
        description="Chỉ có thể gửi thông báo đến các cấp dưới trực tiếp (theo SP W01P0004). Thông báo sẽ hiển thị ở nút chuông trên header của người nhận."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      /> */}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ notificationType: 'INFO' }}
      >
        <Form.Item
          name="title"
          label="Tiêu đề thông báo"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
        >
          <Input placeholder="Nhập tiêu đề thông báo" maxLength={255} />
        </Form.Item>

        <Form.Item
          name="content"
          label="Nội dung thông báo"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
        >
          <TextArea
            rows={6}
            placeholder="Nhập nội dung chi tiết của thông báo"
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="notificationType"
          label="Loại thông báo"
        >
          <Radio.Group>
            <Radio.Button value="INFO">
              <Tag color="blue">Thông tin</Tag>
            </Radio.Button>
            <Radio.Button value="WARNING">
              <Tag color="orange">Cảnh báo</Tag>
            </Radio.Button>
            <Radio.Button value="ERROR">
              <Tag color="red">Khẩn cấp</Tag>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Phạm vi gửi">
          <Radio.Group value={scope} onChange={(e) => setScope(e.target.value)}>
            <Radio.Button value="global">
              <Space>
                <GlobalOutlined />
                Toàn hệ thống
              </Space>
            </Radio.Button>
            <Radio.Button value="subordinate">
              <Space>
                <TeamOutlined />
                Cấp dưới trực tiếp
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {scope === 'subordinate' && (
          <Form.Item
            name="targetUserIds"
            label="Chọn người nhận"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một người' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn người nhận"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {subordinateUsers.map((u) => (
                <Select.Option key={u.UserID} value={u.UserID}>
                  {u.FullName} - {u.RoleName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={loading}
            size="large"
            style={{ background: '#3a4d2e', borderColor: '#3a4d2e' }}
          >
            Gửi thông báo
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
