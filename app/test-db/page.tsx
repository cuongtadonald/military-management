"use client"

import { useState } from "react"
import { Button, Card, Typography, Space, Alert } from "antd"

export default function TestDBPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Bat dau test ket noi...')
      
      const response = await fetch('/api/test-db')
      const data = await response.json()

      console.log('Response tu API:', data)

      if (data.success) {
        setResult(data)
        console.log('TEST THANH CONG!')
        console.log('Du lieu:', data.data)
      } else {
        setError(data.message || 'Loi khong xac dinh')
        console.error('TEST THAT BAI:', data)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Loi khong xac dinh'
      setError(errorMsg)
      console.error('Loi khi goi API:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Typography.Title level={2}>
        Test Ket Noi SQL Server
      </Typography.Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          size="large"
          loading={loading}
          onClick={testConnection}
        >
          {loading ? 'Dang test...' : 'Test Ket Noi'}
        </Button>

        {error && (
          <Alert
            message="Loi Ket Noi"
            description={error}
            type="error"
            showIcon
          />
        )}

        {result && (
          <Card title="Ket Qua Test" styles={{ body: { padding: 16 } }}>
            <Typography.Paragraph>
              <span style={{ fontWeight: 'bold' }}>Trang thai:</span> {result.message}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <span style={{ fontWeight: 'bold' }}>So ban ghi:</span> {result.count}
            </Typography.Paragraph>
            
            <Typography.Title level={4}>
              Du lieu mau (5 chien si dau tien):
            </Typography.Title>
            
            <pre style={{ 
              background: '#f5f5f5', 
              padding: 16, 
              borderRadius: 6,
              overflow: 'auto',
              fontSize: 12
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </Card>
        )}

        <Alert
          message="Huong dan"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Nhan nut Test Ket Noi de kiem tra</li>
              <li>Mo Console (F12) de xem log chi tiet</li>
              <li>Kiem tra terminal de xem log server</li>
              <li>Neu thanh cong, ban se thay danh sach chien si</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Space>
    </div>
  )
}