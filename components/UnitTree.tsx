"use client"

import { useState, useEffect } from "react"
import { App, Tree, Button, Modal, Input, Spin, Empty, Tooltip } from "antd"
import { PlusOutlined, ApartmentOutlined } from "@ant-design/icons"
import type { DataNode } from "antd/es/tree"
import { useMemo, useCallback } from "react"

interface Unit {
  UnitID: string
  UnitName: string
  UnitLevel: number
  ParentUnitID: string | null
  HierarchyPath: string
  FullPathName: string
}

interface UnitTreeProps {
  userId: string
  visible: boolean
  onClose: () => void
}

// Cấu hình màu sắc theo level
const levelColors: Record<number, string> = {
  1: "#1890ff", // Sư đoàn - Xanh dương
  2: "#722ed1", // Trung đoàn - Tím
  3: "#fa8c16", // Tiểu đoàn - Cam (đổi từ xanh lá để không trùng nút +)
  4: "#faad14", // Đại đội - Vàng
  5: "#52c41a", // Trung đội - Xanh lá
  6: "#f5222d", // Tiểu đội - Đỏ
}

// Cấu hình tên level
const levelNames: Record<number, string> = {
  1: "Sư đoàn",
  2: "Trung đoàn",
  3: "Tiểu đoàn",
  4: "Đại đội",
  5: "Trung đội",
  6: "Tiểu đội",
}

export default function UnitTree({ userId, visible, onClose }: UnitTreeProps) {
  const { message } = App.useApp()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Unit | null>(null)
  const [newUnitName, setNewUnitName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (visible && userId) {
      fetchUnits()
    }
  }, [visible, userId])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/units?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setUnits(result.data)
      } else {
        message.error(result.message)
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn vị:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  // Chuyển đổi dữ liệu thành cấu trúc Tree
  const buildTreeData = (): DataNode[] => {
    if (units.length === 0) return []

    const unitMap = new Map<string, DataNode & { unit: Unit }>()
    const rootNodes: (DataNode & { unit: Unit })[] = []

    // Tạo map các node
    units.forEach((unit) => {
      const color = levelColors[unit.UnitLevel] || levelColors[6]
      
      const node: DataNode & { unit: Unit } = {
        key: unit.UnitID,
        title: (
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            padding: "6px 12px",
            borderRadius: 6,
            background: `${color}08`,
            border: `1px solid ${color}30`,
            transition: "all 0.2s",
          }}>
            <div style={{ 
              color, 
              fontWeight: unit.UnitLevel <= 2 ? 600 : 500,
              fontSize: unit.UnitLevel <= 2 ? 15 : 14,
            }}>
              {unit.UnitName}
            </div>
          </div>
        ),
        children: [],
        unit: unit,
      }
      unitMap.set(unit.UnitID, node)
    })

    // Xây dựng cây
    units.forEach((unit) => {
      const node = unitMap.get(unit.UnitID)!
      if (unit.ParentUnitID && unitMap.has(unit.ParentUnitID)) {
        const parent = unitMap.get(unit.ParentUnitID)!
        parent.children!.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    return rootNodes
  }

  const handleAddUnit = (parentUnit: Unit) => {
    setSelectedParent(parentUnit)
    setNewUnitName("")
    setAddModalVisible(true)
  }

  const handleSubmitAdd = async () => {
    if (!newUnitName.trim()) {
      message.warning("Vui lòng nhập tên đơn vị")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitName: newUnitName,
          parentUnitId: selectedParent?.UnitID,
          userId: userId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        message.success("Thêm đơn vị thành công")
        setAddModalVisible(false)
        
        // Thêm node mới vào state trực tiếp thay vì refresh
        const newUnit: Unit = {
          UnitID: result.data.UnitID,
          UnitName: result.data.UnitName,
          UnitLevel: result.data.UnitLevel,
          ParentUnitID: result.data.ParentUnitID,
          HierarchyPath: result.data.HierarchyPath,
          FullPathName: result.data.FullPathName,
        }
        setUnits(prev => [...prev, newUnit])
      } else {
        message.error(result.message)
      }
    } catch (error) {
      console.error("Lỗi khi thêm đơn vị:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setSubmitting(false)
    }
  }

  //const treeData = buildTreeData()
  const treeData = useMemo(() => buildTreeData(), [units])

  return (
    <>
      <Modal
        title={
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
            padding: "8px 0",
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <ApartmentOutlined style={{ fontSize: 20, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#262626" }}>
                Cơ cấu tổ chức đơn vị
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
                Quản lý cây đơn vị và thêm đơn vị mới
              </div>
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={900}
        styles={{ 
          body: { 
            maxHeight: "75vh", 
            overflowY: "auto",
            padding: "20px 24px",
          } 
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: "#8c8c8c" }}>Đang tải dữ liệu...</div>
          </div>
        ) : units.length === 0 ? (
          <Empty 
            description="Không có dữ liệu đơn vị"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div style={{
            background: "#fafafa",
            borderRadius: 8,
            padding: 16,
          }}>
            <Tree
              showLine={{ showLeafIcon: false }}
              defaultExpandAll
              treeData={treeData}
              titleRender={(nodeData) => {
                const node = nodeData as DataNode & { unit: Unit }
                const unit = node.unit
                const color = levelColors[unit.UnitLevel] || levelColors[6]

                return (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8,
                    padding: "4px 0",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center",
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: `${color}08`,
                        border: `1px solid ${color}30`,
                        transition: "all 0.2s",
                      }}>
                        <div style={{ 
                          color, 
                          fontWeight: unit.UnitLevel <= 2 ? 600 : 500,
                          fontSize: unit.UnitLevel <= 2 ? 15 : 14,
                        }}>
                          {unit.UnitName}
                        </div>
                      </div>
                    </div>
                    <Tooltip title="Thêm đơn vị con">
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddUnit(unit)
                        }}
                        style={{ 
                          color: "#52c41a",
                          borderRadius: 6,
                          width: 32,
                          height: 32,
                        }}
                      />
                    </Tooltip>
                  </div>
                )
              }}
            />
          </div>
        )}
      </Modal>

      {/* Modal thêm đơn vị */}
      <Modal
        title={
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <PlusOutlined style={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                Thêm đơn vị mới
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
                Thêm đơn vị con vào {selectedParent?.UnitName}
              </div>
            </div>
          </div>
        }
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleSubmitAdd}
        confirmLoading={submitting}
        okText="Thêm"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            padding: 12, 
            background: "#f6f8fa", 
            borderRadius: 6,
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
              Đơn vị cha
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {selectedParent?.UnitName}
            </div>
          </div>
          <Input
            placeholder="Nhập tên đơn vị mới"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            onPressEnter={handleSubmitAdd}
            autoFocus
            size="large"
          />
        </div>
      </Modal>
    </>
  )
}