"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface ChangeEntry {
  field: string
  label: string
  oldValue: string
  newValue: string
}

export interface ChangeLog {
  id: string
  soldierId: string
  soldierName: string
  requestedBy: string
  requestedRole: string
  changes: ChangeEntry[]
  status: "completed" | "pending" | "rejected"
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

interface ChangeLogContextType {
  logs: ChangeLog[]
  addLog: (log: Omit<ChangeLog, "id" | "createdAt">) => void
  reviewLog: (id: string, status: "completed" | "rejected", reviewer: string, note?: string) => void
  pendingCount: number
  getLogsByStatus: (status: ChangeLog["status"]) => ChangeLog[]
}

const ChangeLogContext = createContext<ChangeLogContextType | undefined>(undefined)

const initialLogs: ChangeLog[] = [
  {
    id: "CL-001",
    soldierId: "SLD-1000",
    soldierName: "Nguyễn Văn An",
    requestedBy: "Thượng tá Trần Văn B",
    requestedRole: "Trung đoàn trưởng",
    changes: [
      { field: "rank", label: "Cấp bậc", oldValue: "Trung úy", newValue: "Đại úy" },
      { field: "position", label: "Chức vụ", oldValue: "Trung đội trưởng", newValue: "Đại đội trưởng" },
    ],
    status: "completed",
    createdAt: "15/01/2026",
    reviewedBy: "Đại tá Nguyễn Văn A",
    reviewedAt: "16/01/2026",
  },
  {
    id: "CL-002",
    soldierId: "SLD-1005",
    soldierName: "Lê Văn Hải",
    requestedBy: "Thiếu tá Lê Văn C",
    requestedRole: "Tiểu đoàn trưởng",
    changes: [
      { field: "unit", label: "Đơn vị", oldValue: "Trung đoàn 4 > Tiểu đoàn 1 > Đại đội 1", newValue: "Trung đoàn 5 > Tiểu đoàn 1 > Đại đội 1" },
    ],
    status: "pending",
    createdAt: "20/01/2026",
  },
  {
    id: "CL-003",
    soldierId: "SLD-1010",
    soldierName: "Phạm Văn Dũng",
    requestedBy: "Thiếu tá Lê Văn C",
    requestedRole: "Tiểu đoàn trưởng",
    changes: [
      { field: "rank", label: "Cấp bậc", oldValue: "Binh nhất", newValue: "Hạ sĩ" },
      { field: "position", label: "Chức vụ", oldValue: "Chiến sĩ", newValue: "Tiểu đội trưởng" },
    ],
    status: "pending",
    createdAt: "21/01/2026",
  },
]

export function ChangeLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ChangeLog[]>(initialLogs)

  const addLog = (log: Omit<ChangeLog, "id" | "createdAt">) => {
    const newLog: ChangeLog = {
      ...log,
      id: `CL-${Date.now()}`,
      createdAt: new Date().toLocaleDateString("vi-VN"),
    }
    setLogs((prev) => [newLog, ...prev])
  }

  const reviewLog = (id: string, status: "completed" | "rejected", reviewer: string, note?: string) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? { ...log, status, reviewedBy: reviewer, reviewedAt: new Date().toLocaleDateString("vi-VN"), reviewNote: note }
          : log
      )
    )
  }

  const pendingCount = logs.filter((l) => l.status === "pending").length

  const getLogsByStatus = (status: ChangeLog["status"]) => logs.filter((l) => l.status === status)

  return (
    <ChangeLogContext.Provider value={{ logs, addLog, reviewLog, pendingCount, getLogsByStatus }}>
      {children}
    </ChangeLogContext.Provider>
  )
}

export function useChangeLog() {
  const context = useContext(ChangeLogContext)
  if (!context) throw new Error("useChangeLog must be used within ChangeLogProvider")
  return context
}