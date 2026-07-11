import { Tag } from "antd"
import type { Soldier } from "@/lib/soldiers"

// 1. Bản đồ màu sắc (giữ nguyên giá trị tiếng Anh để logic không đổi)
const statusColors: Record<Soldier["status"], string> = {
  Active: "green",
  "On Leave": "gold",
  Reserve: "blue",
  Discharged: "default",
}

// 2. Bản đồ nhãn hiển thị tiếng Việt
const statusLabels: Record<Soldier["status"], string> = {
  Active: "Đang tại ngũ",
  "On Leave": "Đang nghỉ phép",
  Reserve: "Dự bị",
  Discharged: "Đã xuất ngũ",
}

export function StatusTag({ status }: { status: Soldier["status"] }) {
  return (
    <Tag color={statusColors[status]} style={{ marginInlineEnd: 0 }}>
      {statusLabels[status]}
    </Tag>
  )
}

// 3. Bản đồ màu sắc cho loại hồ sơ
const recordColors: Record<string, string> = {
  Award: "gold",
  Discipline: "red",
  Training: "blue",
  Medical: "cyan",
  Document: "default",
}

// 4. Bản đồ nhãn hiển thị tiếng Việt cho loại hồ sơ
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