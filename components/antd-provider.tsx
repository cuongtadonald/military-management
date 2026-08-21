"use client"

import { AntdRegistry } from "@ant-design/nextjs-registry"
import { ConfigProvider, App as AntdApp } from "antd"
import type { ReactNode } from "react"

const militaryGreen = "#4b5320"

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: militaryGreen,
            colorInfo: militaryGreen,
            colorLink: militaryGreen,
            borderRadius: 8,
            fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
            colorBgLayout: "#f3f4ec",
          },
          components: {
            Layout: {
              headerBg: "#3b4019",
              headerColor: "#ffffff",
              headerHeight: 64,
            },
            Table: {
              headerBg: "#eef0e2",
              headerColor: "#3b4019",
              rowHoverBg: "#f3f4ec",
            },
            Button: {
              fontWeight: 500,
            },
          },
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  )
}
