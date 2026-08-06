'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Radio, Card, App, Typography, Space, Tag, Alert } from 'antd';
import { SendOutlined, GlobalOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '@/components/auth-provider';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface UnitOption {
  UnitID: string;
  UnitName: string;
  FullPathName: string;
  UnitLevel: number;
}

export default function SendNotificationTab() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<'global' | 'unit'>('global');
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);

  useEffect(() => {
    if (user?.userId) {
      loadSubordinateUnits();
    }
  }, [user?.userId]);

  const loadSubordinateUnits = async () => {
    try {
      const res = await fetch(`/api/units?userId=${user?.userId}`);
      const data = await res.json();
      if (data.success) {
        // Chỉ hiển thị các đơn vị cấp dưới (level cao hơn)
        const subordinates = data.data.filter((u: UnitOption) => u.UnitLevel > (user.unitLevel || 0));
        setUnitOptions(subordinates);
      }
    } catch (error) {
      console.error('Error loading units:', error);
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
        targetUnitId: scope === 'unit' ? values.targetUnitId : null,
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

      <Alert
        message="Lưu ý"
        description="Chỉ có thể gửi thông báo đến các đơn vị cấp dưới trực tiếp. Thông báo sẽ hiển thị ở nút chuông trên header của người nhận."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

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
            <Radio.Button value="unit">
              <Space>
                <TeamOutlined />
                Theo đơn vị
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {scope === 'unit' && (
          <Form.Item
            name="targetUnitId"
            label="Chọn đơn vị nhận"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
          >
            <Select
              placeholder="Chọn đơn vị"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {unitOptions.map((unit) => (
                <Select.Option key={unit.UnitID} value={unit.UnitID}>
                  {unit.FullPathName || unit.UnitName} (Level {unit.UnitLevel})
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
