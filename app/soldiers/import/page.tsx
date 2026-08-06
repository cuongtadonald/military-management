/**
 * File: app/soldiers/import/page.tsx
 * Mô tả: Trang Nhập danh sách quân nhân từ Excel - Wizard 4 bước
 * Bước 1: Tải file Excel
 * Bước 2: Kiểm tra dữ liệu
 * Bước 3: Xem trước dữ liệu
 * Bước 4: Hoàn tất
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  App,
  Button,
  Card,
  Steps,
  Typography,
  Upload,
  Table,
  Tag,
  Progress,
  Space,
  Alert,
  Row,
  Col,
  Statistic,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  ArrowLeftOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  InboxOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import * as XLSX from "xlsx"

const { Title, Text } = Typography
const { Dragger } = Upload

// ============================================================
// INTERFACES
// ============================================================

interface SoldierImportRow {
  rowNumber: number
  FullName: string
  DateOfBirth: string
  Gender: string
  CitizenID: string
  RankName: string
  Position: string
  UnitName: string
  EnlistmentDate: string
  Status: "valid" | "warning" | "error"
  errors: string[]
  warnings: string[]
}

interface ValidationError {
  rowNumber: number
  message: string
  field?: string
  value?: string
}

interface ImportSummary {
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  fileName: string
  fileSize: string
  uploadTime: string
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ImportSoldiersPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { user, isLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  // File data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<SoldierImportRow[]>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  // ============================================================
  // TEMPLATE DOWNLOAD
  // ============================================================

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Thông tin cơ bản
    const basicInfoHeaders = [
      "Họ và tên",
      "Ngày sinh (DD/MM/YYYY)",
      "Giới tính (Nam/Nữ)",
      "Số CCCD",
      "Cấp bậc",
      "Chức vụ",
      "Đơn vị",
      "Ngày nhập ngũ (DD/MM/YYYY)",
      "Dân tộc",
      "Tôn giáo",
      "Quê quán",
      "Địa chỉ",
      "Tỉnh/Thành phố",
      "Xã/Phường",
      "Trình độ văn hóa",
      "Chuyên môn",
      "Trình độ chính trị",
      "Chiều cao (cm)",
      "Cân nặng (kg)",
      "Nhóm máu",
      "Huyết áp",
      "Phân loại sức khỏe",
      "Ngày vào Đoàn (DD/MM/YYYY)",
      "Ngày vào Đảng (DD/MM/YYYY)",
    ]

    const basicInfoSample = [
      [
        "Nguyễn Văn A",
        "15/05/1990",
        "Nam",
        "079090000001",
        "Trung úy",
        "Trung đội trưởng",
        "Đại đội 1",
        "20/03/2010",
        "Kinh",
        "Không",
        "Hà Nội",
        "123 Đường ABC, Quận XYZ",
        "Hà Nội",
        "Phường XYZ",
        "12/12",
        "Chỉ huy quân sự",
        "Sơ cấp",
        "170",
        "65",
        "O+",
        "120/80",
        "Loại 1",
        "26/03/2005",
        "15/05/2012",
      ],
    ]

    const ws1 = XLSX.utils.aoa_to_sheet([basicInfoHeaders, ...basicInfoSample])
    XLSX.utils.book_append_sheet(wb, ws1, "Thông tin cơ bản")

    // Sheet 2: Thân nhân
    const familyHeaders = [
      "Số CCCD quân nhân",
      "Họ và tên thân nhân",
      "Quan hệ",
      "Ngày sinh (DD/MM/YYYY)",
      "Nghề nghiệp",
      "Nơi công tác",
      "Số điện thoại",
      "Địa chỉ",
      "Có phụ thuộc (Có/Không)",
    ]

    const familySample = [
      [
        "079090000001",
        "Nguyễn Thị B",
        "Mẹ",
        "20/08/1960",
        "Giáo viên",
        "Trường THPT XYZ",
        "0912345678",
        "123 Đường ABC, Hà Nội",
        "Có",
      ],
    ]

    const ws2 = XLSX.utils.aoa_to_sheet([familyHeaders, ...familySample])
    XLSX.utils.book_append_sheet(wb, ws2, "Thân nhân")

    // Sheet 3: Quá trình công tác
    const workHeaders = [
      "Số CCCD quân nhân",
      "Từ ngày (DD/MM/YYYY)",
      "Đến ngày (DD/MM/YYYY)",
      "Đơn vị công tác",
      "Chức vụ",
      "Cấp bậc",
      "Chức vụ Đảng/Đoàn thể",
      "Binh chủng",
      "Chiến trường",
      "Ghi chú",
    ]

    const workSample = [
      [
        "079090000001",
        "20/03/2010",
        "15/08/2012",
        "Đại đội 1",
        "Chiến sĩ",
        "Binh nhì",
        "Đoàn viên",
        "Bộ binh",
        "",
        "",
      ],
      [
        "079090000001",
        "16/08/2012",
        "nay",
        "Đại đội 1",
        "Trung đội trưởng",
        "Trung úy",
        "Bí thư Chi đoàn",
        "Bộ binh",
        "",
        "",
      ],
    ]

    const ws3 = XLSX.utils.aoa_to_sheet([workHeaders, ...workSample])
    XLSX.utils.book_append_sheet(wb, ws3, "Quá trình công tác")

    // Sheet 4: Quá trình đào tạo
    const trainingHeaders = [
      "Số CCCD quân nhân",
      "Tên trường đào tạo",
      "Ngành học/Lớp học",
      "Từ ngày (DD/MM/YYYY)",
      "Đến ngày (DD/MM/YYYY)",
      "Hình thức đào tạo",
      "Bằng cấp/Chứng chỉ",
      "Ghi chú",
    ]

    const trainingSample = [
      [
        "079090000001",
        "Trường Sĩ quan Lục quân 1",
        "Chỉ huy tham mưu",
        "01/09/2010",
        "30/06/2014",
        "Chính quy",
        "Cử nhân",
        "",
      ],
    ]

    const ws4 = XLSX.utils.aoa_to_sheet([trainingHeaders, ...trainingSample])
    XLSX.utils.book_append_sheet(wb, ws4, "Quá trình đào tạo")

    // Download
    XLSX.writeFile(wb, "File_mau_import_quan_nhan.xlsx")
    message.success("Đã tải file mẫu")
  }

  // ============================================================
  // FILE UPLOAD & VALIDATION
  // ============================================================

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Read first sheet (Thông tin cơ bản)
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) {
          message.error("File Excel không có dữ liệu")
          return
        }

        // Parse data (skip header row)
        const headers = jsonData[0]
        const rows = jsonData.slice(1).filter((row) => row.length > 0 && row[0])

        const parsedData: SoldierImportRow[] = []
        const validationErrors: ValidationError[] = []
        let validCount = 0
        let warningCount = 0
        let errorCount = 0

        rows.forEach((row, index) => {
          const rowNumber = index + 2 // +2 because of header row and 0-index
          const soldier: SoldierImportRow = {
            rowNumber,
            FullName: String(row[0] || "").trim(),
            DateOfBirth: String(row[1] || "").trim(),
            Gender: String(row[2] || "").trim(),
            CitizenID: String(row[3] || "").trim(),
            RankName: String(row[4] || "").trim(),
            Position: String(row[5] || "").trim(),
            UnitName: String(row[6] || "").trim(),
            EnlistmentDate: String(row[7] || "").trim(),
            Status: "valid",
            errors: [],
            warnings: [],
          }

          // Validation - Kiểm tra các trường bắt buộc
          // Các trường bắt buộc: Họ và tên, Ngày sinh, Giới tính, Số CCCD, Cấp bậc, Chức vụ, Đơn vị, Ngày nhập ngũ
          
          if (!soldier.FullName) {
            soldier.errors.push("Thiếu họ tên")
            validationErrors.push({ rowNumber, message: "Thiếu họ tên", field: "FullName" })
          }

          if (!soldier.DateOfBirth) {
            soldier.errors.push("Thiếu ngày sinh")
            validationErrors.push({ rowNumber, message: "Thiếu ngày sinh", field: "DateOfBirth" })
          }

          if (!soldier.Gender) {
            soldier.errors.push("Thiếu giới tính")
            validationErrors.push({ rowNumber, message: "Thiếu giới tính", field: "Gender" })
          }

          if (!soldier.CitizenID) {
            soldier.errors.push("Thiếu số CCCD")
            validationErrors.push({ rowNumber, message: "Thiếu số CCCD", field: "CitizenID" })
          }

          if (!soldier.RankName) {
            soldier.errors.push("Thiếu cấp bậc")
            validationErrors.push({ rowNumber, message: "Thiếu cấp bậc", field: "RankName" })
          }

          if (!soldier.Position) {
            soldier.errors.push("Thiếu chức vụ")
            validationErrors.push({ rowNumber, message: "Thiếu chức vụ", field: "Position" })
          }

          if (!soldier.UnitName) {
            soldier.errors.push("Thiếu đơn vị")
            validationErrors.push({ rowNumber, message: "Thiếu đơn vị", field: "UnitName" })
          }

          if (!soldier.EnlistmentDate) {
            soldier.errors.push("Thiếu ngày nhập ngũ")
            validationErrors.push({ rowNumber, message: "Thiếu ngày nhập ngũ", field: "EnlistmentDate" })
          }

          // Date validation - Kiểm tra định dạng ngày
          const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
          if (soldier.DateOfBirth && !dateRegex.test(soldier.DateOfBirth)) {
            soldier.errors.push("Ngày sinh không đúng định dạng (DD/MM/YYYY)")
            validationErrors.push({
              rowNumber,
              message: "Ngày sinh không đúng định dạng",
              field: "DateOfBirth",
              value: soldier.DateOfBirth,
            })
          }

          if (soldier.EnlistmentDate && !dateRegex.test(soldier.EnlistmentDate)) {
            soldier.errors.push("Ngày nhập ngũ không đúng định dạng (DD/MM/YYYY)")
            validationErrors.push({
              rowNumber,
              message: "Ngày nhập ngũ không đúng định dạng",
              field: "EnlistmentDate",
              value: soldier.EnlistmentDate,
            })
          }

          // Set status
          if (soldier.errors.length > 0) {
            soldier.Status = "error"
            errorCount++
          } else if (soldier.warnings.length > 0) {
            soldier.Status = "warning"
            warningCount++
          } else {
            soldier.Status = "valid"
            validCount++
          }

          parsedData.push(soldier)
        })

        setUploadedFile(file)
        setImportData(parsedData)
        setErrors(validationErrors)
        setSummary({
          totalRows: rows.length,
          validRows: validCount,
          warningRows: warningCount,
          errorRows: errorCount,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          uploadTime: new Date().toLocaleString("vi-VN"),
        })

        setCurrentStep(1)
        message.success("Đã tải và kiểm tra file Excel")
      } catch (error) {
        console.error("Lỗi khi đọc file Excel:", error)
        message.error("Lỗi khi đọc file Excel")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  // ============================================================
  // IMPORT DATA
  // ============================================================

  const handleImport = async () => {
    if (!user?.userId) return

    setImporting(true)
    try {
      const validData = importData.filter((row) => row.Status !== "error")
      let successCount = 0
      let failCount = 0

      for (const row of validData) {
        try {
          const response = await fetch("/api/soldiers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              FullName: row.FullName,
              DateOfBirth: parseDate(row.DateOfBirth),
              Gender: row.Gender === "Nam" ? 1 : 0,
              CitizenID: row.CitizenID,
              RankID: row.RankName, // TODO: Map to RankID
              Position: row.Position,
              UnitID: row.UnitName, // TODO: Map to UnitID
              EnlistmentDate: parseDate(row.EnlistmentDate),
              CreatedBy: user.userId,
            }),
          })

          const result = await response.json()
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      }

      if (successCount > 0) {
        message.success(`Đã nhập thành công ${successCount} quân nhân`)
      }
      if (failCount > 0) {
        message.warning(`${failCount} quân nhân nhập thất bại`)
      }

      setCurrentStep(3)
    } catch (error) {
      console.error("Lỗi khi import:", error)
      message.error("Lỗi khi import dữ liệu")
    } finally {
      setImporting(false)
    }
  }

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null
    const parts = dateStr.split("/")
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return null
  }

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
          <Text>Đang kiểm tra phiên đăng nhập...</Text>
        </div>
      </PageLayout>
    )
  }

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const previewColumns: ColumnsType<SoldierImportRow> = [
    {
      title: "STT",
      dataIndex: "rowNumber",
      width: 60,
      align: "center",
    },
    {
      title: "Họ và tên",
      dataIndex: "FullName",
      width: 180,
    },
    {
      title: "Ngày sinh",
      dataIndex: "DateOfBirth",
      width: 120,
    },
    {
      title: "Giới tính",
      dataIndex: "Gender",
      width: 100,
    },
    {
      title: "CCCD",
      dataIndex: "CitizenID",
      width: 140,
    },
    {
      title: "Cấp bậc",
      dataIndex: "RankName",
      width: 120,
    },
    {
      title: "Chức vụ",
      dataIndex: "Position",
      width: 150,
    },
    {
      title: "Đơn vị",
      dataIndex: "UnitName",
      width: 150,
    },
    {
      title: "Ngày nhập ngũ",
      dataIndex: "EnlistmentDate",
      width: 130,
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      width: 100,
      align: "center",
      render: (status: string) => {
        if (status === "valid") return <CheckCircleOutlined style={{ color: "#52c41a" }} />
        if (status === "warning") return <WarningOutlined style={{ color: "#faad14" }} />
        return <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
      },
    },
  ]

  // ============================================================
  // RENDER STEPS
  // ============================================================

  const renderStep1 = () => (
    <Row gutter={24}>
      <Col span={12}>
        <Card title="Tải file Excel" style={{ borderRadius: 8 }}>
          <Dragger
            accept=".xlsx,.xls"
            beforeUpload={(file) => {
              handleFileUpload(file)
              return false
            }}
            showUploadList={false}
            style={{ padding: "40px 20px" }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#3a4d2e", fontSize: 48 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
              Kéo thả file Excel vào đây
            </p>
            <p className="ant-upload-hint">hoặc</p>
            <Button type="primary" icon={<UploadOutlined />} style={{ marginTop: 16 }}>
              Chọn file từ máy
            </Button>
            <div style={{ marginTop: 16, fontSize: 13, color: "#8c8c8c" }}>
              Định dạng: .xlsx, .xls | Tối đa: 10.000 dòng
            </div>
          </Dragger>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
              <FileExcelOutlined style={{ fontSize: 32, color: "#52c41a" }} />
              <div style={{ flex: 1 }}>
                <Text strong>Tải file mẫu</Text>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                  File mẫu import quân nhân.xlsx (4 sheet)
                </div>
              </div>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                Tải xuống
              </Button>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  )

  const renderStep2 = () => (
    <Row gutter={24}>
      <Col span={16}>
        <Card title="Thông tin file đã tải lên" style={{ marginBottom: 16, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileExcelOutlined style={{ fontSize: 32, color: "#52c41a" }} />
            <div style={{ flex: 1 }}>
              <Text strong>{summary?.fileName}</Text>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {summary?.uploadTime} • {summary?.fileSize}
              </div>
            </div>
            <Tag color="success" style={{ fontSize: 13, padding: "4px 12px" }}>
              File hợp lệ
            </Tag>
          </div>
        </Card>

        <Card title="Kết quả kiểm tra dữ liệu" style={{ marginBottom: 16, borderRadius: 8 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Tổng số dòng"
                value={summary?.totalRows}
                prefix={<FileExcelOutlined />}
                valueStyle={{ color: "#3a4d2e" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Hợp lệ"
                value={summary?.validRows}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Cảnh báo"
                value={summary?.warningRows}
                prefix={<WarningOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Lỗi"
                value={summary?.errorRows}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Tỷ lệ hợp lệ</Text>
              <Text strong>
                {summary?.validRows}/{summary?.totalRows} dòng
              </Text>
            </div>
            <Progress
              percent={summary ? Math.round((summary.validRows / summary.totalRows) * 100) : 0}
              strokeColor="#52c41a"
              status="active"
            />
          </div>
        </Card>

        <Card title={`Xem trước dữ liệu (${Math.min(10, importData.length)} dòng đầu tiên)`} style={{ borderRadius: 8 }}>
          <Table
            rowKey="rowNumber"
            columns={previewColumns}
            dataSource={importData.slice(0, 10)}
            pagination={false}
            scroll={{ x: 1200 }}
            size="small"
          />
        </Card>
      </Col>

      <Col span={8}>
        <Card title="Tóm tắt import" style={{ marginBottom: 16, borderRadius: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <Text type="secondary">File:</Text>
              <div style={{ fontWeight: 500 }}>{summary?.fileName}</div>
            </div>
            <div>
              <Text type="secondary">Tổng số dòng:</Text>
              <div style={{ fontWeight: 500 }}>{summary?.totalRows}</div>
            </div>
            <div>
              <Text type="secondary">Hợp lệ:</Text>
              <div style={{ fontWeight: 500, color: "#52c41a" }}>{summary?.validRows}</div>
            </div>
            <div>
              <Text type="secondary">Cảnh báo:</Text>
              <div style={{ fontWeight: 500, color: "#faad14" }}>{summary?.warningRows}</div>
            </div>
            <div>
              <Text type="secondary">Lỗi:</Text>
              <div style={{ fontWeight: 500, color: "#ff4d4f" }}>{summary?.errorRows}</div>
            </div>
            <div>
              <Text type="secondary">Người import:</Text>
              <div style={{ fontWeight: 500 }}>{user?.fullName}</div>
            </div>
            <div>
              <Text type="secondary">Thời gian:</Text>
              <div style={{ fontWeight: 500 }}>{summary?.uploadTime}</div>
            </div>
          </div>
        </Card>

        <Card
          title={`Lỗi dữ liệu (${errors.length})`}
          extra={<Button type="link" size="small">Xem tất cả</Button>}
          style={{ borderRadius: 8 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto" }}>
            {errors.slice(0, 5).map((error, index) => (
              <div
                key={index}
                style={{
                  padding: 12,
                  background: "#fff1f0",
                  borderLeft: "3px solid #ff4d4f",
                  borderRadius: 4,
                }}
              >
                <Text strong style={{ color: "#ff4d4f" }}>
                  Dòng {error.rowNumber}
                </Text>
                <div style={{ fontSize: 13, marginTop: 4 }}>{error.message}</div>
                {error.value && (
                  <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
                    {error.field}: {error.value}
                  </div>
                )}
              </div>
            ))}
          </div>

          {errors.length > 0 && (
            <Button
              block
              icon={<DownloadOutlined />}
              style={{ marginTop: 16 }}
              onClick={() => message.info("Chức năng xuất danh sách lỗi đang được phát triển")}
            >
              Xuất danh sách lỗi Excel
            </Button>
          )}
        </Card>
      </Col>
    </Row>
  )

  const renderStep3 = () => (
    <Card style={{ borderRadius: 8 }}>
      <Alert
        message="Xác nhận nhập dữ liệu"
        description={`Bạn sắp nhập ${summary?.validRows} quân nhân vào hệ thống. Dữ liệu cảnh báo và lỗi sẽ không được nhập.`}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={16}>
        <Col span={8}>
          <Card style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
            <Statistic
              title="Sẽ nhập"
              value={summary?.validRows}
              valueStyle={{ color: "#52c41a" }}
              suffix="quân nhân"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: "#fffbe6", borderColor: "#ffe58f" }}>
            <Statistic
              title="Bỏ qua (cảnh báo)"
              value={summary?.warningRows}
              valueStyle={{ color: "#faad14" }}
              suffix="dòng"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ background: "#fff1f0", borderColor: "#ffccc7" }}>
            <Statistic
              title="Bỏ qua (lỗi)"
              value={summary?.errorRows}
              valueStyle={{ color: "#ff4d4f" }}
              suffix="dòng"
            />
          </Card>
        </Col>
      </Row>
    </Card>
  )

  const renderStep4 = () => (
    <Card style={{ borderRadius: 8, textAlign: "center", padding: "40px 20px" }}>
      <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a", marginBottom: 24 }} />
      <Title level={3} style={{ color: "#52c41a" }}>
        Nhập dữ liệu thành công!
      </Title>
      <Text style={{ fontSize: 16 }}>
        Đã nhập {summary?.validRows} quân nhân vào hệ thống
      </Text>
      <div style={{ marginTop: 32 }}>
        <Space>
          <Button size="large" onClick={() => router.push("/soldiers")}>
            Về danh sách quân nhân
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              setCurrentStep(0)
              setUploadedFile(null)
              setImportData([])
              setSummary(null)
              setErrors([])
            }}
          >
            Import file mới
          </Button>
        </Space>
      </div>
    </Card>
  )

  const steps = [
    { title: "Tải file Excel", description: "Chọn và tải file Excel" },
    { title: "Kiểm tra dữ liệu", description: "Hệ thống kiểm tra và đối chiếu" },
    { title: "Xem trước dữ liệu", description: "Xem dữ liệu trước khi nhập" },
    { title: "Hoàn tất", description: "Nhập dữ liệu vào hệ thống" },
  ]

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 4 }}>
            Danh sách quân nhân &gt; Import Excel
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Nhập danh sách quân nhân từ Excel
          </Title>
          <Text type="secondary">Nhập dữ liệu hàng loạt quân nhân từ file Excel</Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/soldiers")}>
          Quay lại danh sách
        </Button>
      </div>

      {/* Steps */}
      <Card style={{ marginBottom: 20, borderRadius: 8 }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* Content */}
      {currentStep === 0 && renderStep1()}
      {currentStep === 1 && renderStep2()}
      {currentStep === 2 && renderStep3()}
      {currentStep === 3 && renderStep4()}

      {/* Action Buttons */}
      {currentStep > 0 && currentStep < 3 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <Button onClick={() => router.push("/soldiers")}>Hủy bỏ</Button>
          {currentStep > 0 && (
            <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(currentStep - 1)}>
              Quay lại bước trước
            </Button>
          )}
          {currentStep === 1 && (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => setCurrentStep(2)}
              disabled={!summary || summary.validRows === 0}
            >
              Tiếp tục
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleImport}
              loading={importing}
              disabled={!summary || summary.validRows === 0}
            >
              Nhập dữ liệu
            </Button>
          )}
        </div>
      )}
    </PageLayout>
  )
}
