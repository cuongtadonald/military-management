import { Tag } from "antd"
import type { Soldier } from "@/lib/soldiers"

const statusColors: Record<Soldier["status"], string> = {
  Active: "green",
  "On Leave": "gold",
  Reserve: "blue",
  Discharged: "default",
}

export function StatusTag({ status }: { status: Soldier["status"] }) {
  return (
    <Tag color={statusColors[status]} style={{ marginInlineEnd: 0 }}>
      {status}
    </Tag>
  )
}

const recordColors: Record<string, string> = {
  Award: "gold",
  Discipline: "red",
  Training: "blue",
  Medical: "cyan",
  Document: "default",
}

export function RecordTypeTag({ type }: { type: string }) {
  return <Tag color={recordColors[type] ?? "default"}>{type}</Tag>
}
