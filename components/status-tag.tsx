"use client"

import { Tag } from "antd"

// Hỗ trợ cả tiếng Việt và tiếng Anh
const statusConfig: Record<string, { color: string; label: string }> = {
  // Tiếng Việt (từ database)
  "Đang phục vụ": { color: "green", label: "Đang phục vụ" },
  "Điều chuyển": { color: "blue", label: "Điều chuyển" },
  "Nghỉ hưu": { color: "orange", label: "Nghỉ hưu" },
  "Xuất ngũ": { color: "default", label: "Xuất ngũ" },
  
  // Tiếng Anh (để tương thích ngược)
  "Active": { color: "green", label: "Đang phục vụ" },
  "On Leave": { color: "gold", label: "Đang nghỉ phép" },
  "Reserve": { color: "blue", label: "Dự bị" },
  "Discharged": { color: "default", label: "Xuất ngũ" },
}

interface StatusTagProps {
  status: string
}

export function StatusTag({ status }: StatusTagProps) {
  const config = statusConfig[status] || { color: "default", label: status }
  
  return (
    <Tag color={config.color} style={{ marginInlineEnd: 0 }}>
      {config.label}
    </Tag>
  )
}

// RecordTypeTag giữ nguyên
const recordColors: Record<string, string> = {
  Award: "gold",
  Discipline: "red",
  Training: "blue",
  Medical: "cyan",
  Document: "default",
}

const recordLabels: Record<string, string> = {
  Award: "Khen thưởng",
  Discipline: "Kỷ luật",
  Training: "Huấn luyện",
  Medical: "Quân y",
  Document: "Tài liệu",
}

export function RecordTypeTag({ type }: { type: string }) {
  return (
    <Tag color={recordColors[type] ?? "default"}>
      {recordLabels[type] ?? type}
    </Tag>
  )
}