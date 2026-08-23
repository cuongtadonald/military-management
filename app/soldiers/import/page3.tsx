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
  Tabs,
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
  PlusCircleOutlined,
  EditOutlined,
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
  SoldierID: string // Mã quân nhân
  FullName: string
  UnitID: string // Mã đơn vị
  UnitName: string // Tên đơn vị (không lưu DB)
  UnitFullPath?: string // Đường dẫn đầy đủ (VD: "Quân khu 7,Sư đoàn 5,Phòng Tham mưu")
  Position: string
  RankID: string // Mã cấp bậc
  RankName: string // Tên cấp bậc (không lưu DB)
  DateOfBirth: string
  Gender: string
  CitizenID: string
  Hometown: string // Quê quán
  Address: string // Địa chỉ hiện tại (Col 15)
  ProvinceID?: string // Mã tỉnh (Col 11)
  ProvinceName?: string // Tên tỉnh (không lưu DB)
  WardID?: string // Mã xã/phường (Col 13)
  WardName?: string // Tên xã/phường (không lưu DB)
  Ethnicity?: string // Dân tộc (Col 16)
  SoldierType?: string // Đối tượng (Col 17)
  Religion?: string // Tôn giáo (Col 18)
  MaritalStatusID?: string // Mã tình trạng hôn nhân (Col 19)
  MaritalStatus?: string // Tên tình trạng hôn nhân (không lưu DB)
  EducationLevel?: string
  Specialization?: string
  PoliticalLevel?: string
  BloodType?: string
  HealthClassification?: string
  Height?: number
  Weight?: number
  BloodPressure?: string
  EnlistmentDate: string
  PartyJoinDate?: string
  YouthUnionJoinDate?: string
  PhotoPath?: string // Link ảnh (Col 32)
  Status: "valid" | "warning" | "error"
  errors: string[]
  warnings: string[]
  isExisting?: boolean // true nếu Mã QN đã tồn tại trên hệ thống (cập nhật)
  // Dữ liệu từ các sheet khác
  FamilyMembers?: FamilyMemberRow[]
  WorkProcesses?: WorkProcessRow[]
  TrainingProcesses?: TrainingProcessRow[]
}

interface FamilyMemberRow {
  FullName: string
  Relationship: string
  DateOfBirth?: string
  Occupation?: string
  Workplace?: string
  PhoneNumber?: string
  Address?: string
  IsDependent?: boolean
}

interface WorkProcessRow {
  FromDate?: string
  ToDate?: string
  UnitName?: string
  Position?: string
  RankID?: string
  RankName?: string
  PartyPosition?: string
  Description?: string
}

interface TrainingProcessRow {
  SchoolName: string
  MajorName?: string
  FromDate?: string
  ToDate?: string
  TrainingType?: string
  Certificate?: string
  Description?: string
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
  const [importData, setImportData] = useState<SoldierImportRow[]>([]) // Danh sách thêm mới
  const [updateData, setUpdateData] = useState<SoldierImportRow[]>([]) // Danh sách cập nhật
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [userHierarchyPath, setUserHierarchyPath] = useState<string>("")

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
    // Download file mẫu có sẵn từ server
    const link = document.createElement('a')
    link.href = '/templates/File_mau_import_quan_nhan.xlsx'
    link.download = 'File_mau_import_quan_nhan.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    message.success("Đã tải file mẫu")
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  // Convert ngày tháng từ số Excel hoặc text sang DD/MM/YYYY
  const convertExcelDate = (value: any): string => {
    if (!value) return ""
    
    // Nếu là số (Excel date serial)
    if (typeof value === "number") {
      const date = new Date((value - 25569) * 86400 * 1000)
      const day = String(date.getUTCDate()).padStart(2, "0")
      const month = String(date.getUTCMonth() + 1).padStart(2, "0")
      const year = date.getUTCFullYear()
      return `${day}/${month}/${year}`
    }
    
    // Nếu là string
    const str = String(value).trim()
    
    // Nếu đã là DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      return str
    }
    
    // Nếu là YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [year, month, day] = str.split("-")
      return `${day}/${month}/${year}`
    }
    
    // Nếu chỉ có năm (cho ngày sinh thân nhân)
    if (/^\d{4}$/.test(str)) {
      return str // Giữ nguyên năm
    }
    
    return str
  }

  // Map giá trị dropdown sang mã
  const mapDropdownValue = (value: string, type: string): string => {
    const val = String(value || "").trim().toLowerCase()
    
    if (!val) return ""
    
    switch (type) {
      case "gender":
        if (val === "nam") return "1"
        if (val === "nữ") return "0"
        return val
      
      case "ethnicity":
        // Giữ nguyên text (Kinh, Tày, Thái, etc.)
        // Database lưu text, không lưu mã
        return value.charAt(0).toUpperCase() + value.slice(1) // Viết hoa chữ cái đầu
      
      case "religion":
        // Giữ nguyên text (Không, Phật giáo, Thiên chúa giáo, etc.)
        // Database lưu text, không lưu mã
        return value.charAt(0).toUpperCase() + value.slice(1) // Viết hoa chữ cái đầu
      
      case "bloodType":
        // Map nhóm máu
        const bloodMap: Record<string, string> = {
          "a": "A",
          "b": "B",
          "ab": "AB",
          "o": "O",
          "a+": "A+",
          "a-": "A-",
          "b+": "B+",
          "b-": "B-",
          "ab+": "AB+",
          "ab-": "AB-",
          "o+": "O+",
          "o-": "O-",
        }
        return bloodMap[val] || "O"
      
      case "healthClassification":
        // Map loại sức khỏe
        const healthMap: Record<string, string> = {
          "loại 1": "Loại 1",
          "loại 2": "Loại 2",
          "loại 3": "Loại 3",
          "loại 4": "Loại 4",
          "loại 5": "Loại 5",
          "loại 6": "Loại 6",
        }
        return healthMap[val] || "Loại 1"
      
      default:
        return value
    }
  }

  // ============================================================
  // FILE UPLOAD & VALIDATION
  // ============================================================

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // 1. Đọc sheet "Thông Tin Chiến Sĩ"
        const basicSheet = workbook.Sheets["Thông Tin Chiến Sĩ"] || workbook.Sheets[workbook.SheetNames[0]]
        if (!basicSheet) {
          message.error("Không tìm thấy sheet 'Thông Tin Chiến Sĩ'")
          return
        }

        const basicData = XLSX.utils.sheet_to_json(basicSheet, { header: 1 }) as any[][]
        if (basicData.length < 3) {
          message.error("Sheet 'Thông Tin Chiến Sĩ' không có dữ liệu")
          return
        }

        // Skip header rows (row 0 and row 1 are headers)
        const basicRows = basicData.slice(2).filter((row) => row.length > 0 && row[0])
        
        // 2. Đọc sheet "Thân nhân" - map theo SoldierID
        const familySheet = workbook.Sheets["Thân nhân"]
        const familyBySoldierID = new Map<string, FamilyMemberRow[]>()
        if (familySheet) {
          const familyData = XLSX.utils.sheet_to_json(familySheet, { header: 1 }) as any[][]
          const familyRows = familyData.slice(1).filter((row) => row.length > 0 && row[0])
          familyRows.forEach((row) => {
            const soldierID = String(row[0] || "").trim()
            if (soldierID) {
              const member: FamilyMemberRow = {
                Relationship: String(row[1] || "").trim(),
                FullName: String(row[2] || "").trim(),
                DateOfBirth: convertExcelDate(row[3]), // Convert ngày sinh (có thể là năm hoặc số Excel)
                Occupation: String(row[4] || "").trim(),
                Workplace: String(row[5] || "").trim(),
                PhoneNumber: String(row[6] || "").trim(),
                Address: String(row[7] || "").trim(),
                IsDependent: String(row[8] || "").trim() === "1" || String(row[8] || "").trim() === "có",
              }
              if (!familyBySoldierID.has(soldierID)) {
                familyBySoldierID.set(soldierID, [])
              }
              familyBySoldierID.get(soldierID)!.push(member)
            }
          })
        }

        // 3. Đọc sheet "Quá trình công tác" - map theo SoldierID
        const workSheet = workbook.Sheets["Quá trình công tác"]
        const workBySoldierID = new Map<string, WorkProcessRow[]>()
        if (workSheet) {
          const workData = XLSX.utils.sheet_to_json(workSheet, { header: 1 }) as any[][]
          const workRows = workData.slice(2).filter((row) => row.length > 0 && row[0])
          workRows.forEach((row) => {
            const soldierID = String(row[0] || "").trim()
            if (soldierID) {
              const work: WorkProcessRow = {
                FromDate: convertExcelDate(row[1]), // Convert từ số Excel
                ToDate: convertExcelDate(row[2]), // Convert từ số Excel
                Description: String(row[3] || "").trim(),
                RankID: String(row[4] || "").trim(),
                RankName: String(row[5] || "").trim(),
                PartyPosition: String(row[6] || "").trim(),
              }
              if (!workBySoldierID.has(soldierID)) {
                workBySoldierID.set(soldierID, [])
              }
              workBySoldierID.get(soldierID)!.push(work)
            }
          })
        }

        // 4. Đọc sheet "Quá trình đào tạo" - map theo SoldierID
        const trainingSheet = workbook.Sheets["Quá trình đào tạo"]
        const trainingBySoldierID = new Map<string, TrainingProcessRow[]>()
        if (trainingSheet) {
          const trainingData = XLSX.utils.sheet_to_json(trainingSheet, { header: 1 }) as any[][]
          const trainingRows = trainingData.slice(2).filter((row) => row.length > 0 && row[0])
          trainingRows.forEach((row) => {
            const soldierID = String(row[0] || "").trim()
            if (soldierID) {
              const training: TrainingProcessRow = {
                SchoolName: String(row[1] || "").trim(),
                MajorName: String(row[2] || "").trim(),
                FromDate: convertExcelDate(row[3]), // Convert từ số Excel
                ToDate: convertExcelDate(row[4]), // Convert từ số Excel
                TrainingType: String(row[5] || "").trim(),
                Certificate: String(row[6] || "").trim(),
              }
              if (!trainingBySoldierID.has(soldierID)) {
                trainingBySoldierID.set(soldierID, [])
              }
              trainingBySoldierID.get(soldierID)!.push(training)
            }
          })
        }

        // 5. Parse dữ liệu (chưa validate bắt buộc)
        const parsedData: SoldierImportRow[] = []

        basicRows.forEach((row, index) => {
          const rowNumber = index + 3 // +3 vì có 2 dòng header
          const soldierID = String(row[0] || "").trim()
          
          // Map các giá trị dropdown
          const genderValue = mapDropdownValue(String(row[8] || "").trim(), "gender")
          const ethnicityValue = mapDropdownValue(String(row[16] || "").trim(), "ethnicity")
          const religionValue = mapDropdownValue(String(row[18] || "").trim(), "religion")
          const bloodTypeValue = mapDropdownValue(String(row[24] || "").trim(), "bloodType")
          const healthValue = mapDropdownValue(String(row[25] || "").trim(), "healthClassification")
          
          const soldier: SoldierImportRow = {
            rowNumber,
            SoldierID: soldierID,
            FullName: String(row[1] || "").trim(),
            UnitID: String(row[2] || "").trim(),
            UnitName: String(row[3] || "").trim(),
            Position: String(row[4] || "").trim(),
            RankID: String(row[5] || "").trim(),
            RankName: String(row[6] || "").trim(),
            DateOfBirth: convertExcelDate(row[7]), // Convert từ số Excel
            Gender: genderValue, // Map Nam/Nữ -> 1/0
            CitizenID: String(row[9] || "").trim(),
            Hometown: String(row[10] || "").trim(),
            ProvinceID: row[11] ? String(row[11]) : undefined, // Col 11: Mã tỉnh
            ProvinceName: String(row[12] || "").trim() || undefined, // Col 12: Tên tỉnh (không lưu)
            WardID: row[13] ? String(row[13]) : undefined, // Col 13: Mã xã/phường
            WardName: String(row[14] || "").trim() || undefined, // Col 14: Tên xã/phường (không lưu)
            Address: String(row[15] || "").trim(), // Col 15: Địa chỉ hiện tại
            Ethnicity: ethnicityValue, // Col 16: Dân tộc
            SoldierType: String(row[17] || "").trim() || undefined, // Col 17: Đối tượng
            Religion: religionValue, // Col 18: Tôn giáo
            MaritalStatusID: String(row[19] || "").trim() || undefined, // Col 19: Mã TTHN
            MaritalStatus: String(row[20] || "").trim() || undefined, // Col 20: Tên TTHN (không lưu)
            EducationLevel: String(row[21] || "").trim() || undefined,
            Specialization: String(row[22] || "").trim() || undefined,
            PoliticalLevel: String(row[23] || "").trim() || undefined,
            BloodType: bloodTypeValue, // Col 24: Nhóm máu
            HealthClassification: healthValue, // Col 25: Loại sức khỏe
            Height: row[26] ? Number(row[26]) : undefined,
            Weight: row[27] ? Number(row[27]) : undefined,
            BloodPressure: String(row[28] || "").trim() || undefined,
            EnlistmentDate: convertExcelDate(row[29]), // Convert từ số Excel
            PartyJoinDate: convertExcelDate(row[30]) || undefined, // Convert từ số Excel
            YouthUnionJoinDate: convertExcelDate(row[31]) || undefined, // Convert từ số Excel
            PhotoPath: String(row[32] || "").trim() || undefined, // Col 32: Link ảnh
            Status: "valid",
            errors: [],
            warnings: [],
            isExisting: false,
            // Gộp dữ liệu từ các sheet khác theo SoldierID
            FamilyMembers: familyBySoldierID.get(soldierID) || [],
            WorkProcesses: workBySoldierID.get(soldierID) || [],
            TrainingProcesses: trainingBySoldierID.get(soldierID) || [],
          }

          parsedData.push(soldier)
        })

        // 6. Lấy tên đơn vị từ DB và kiểm tra các Mã QN đã tồn tại
        setCheckingExisting(true)
        let existingIdSet = new Set<string>()
        
        // 6a. Lấy tên đơn vị từ database và hierarchy path để validate
        try {
          const unitIdsToResolve = Array.from(new Set(
            parsedData.map(s => s.UnitID).filter(id => id.length > 0)
          ))
          
          if (unitIdsToResolve.length > 0) {
            const unitResponse = await fetch("/api/units/resolve-names", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ unitIds: unitIdsToResolve }),
            })
            const unitResult = await unitResponse.json()
            if (unitResult.success && unitResult.data?.unitNames) {
              const unitNameMap = unitResult.data.unitNames
              const unitFullPathMap = unitResult.data.unitFullPaths || {}
              const unitHierarchyPathMap = unitResult.data.unitHierarchyPaths || {}
              // Cập nhật UnitName, UnitFullPath từ DB cho từng soldier
              parsedData.forEach(soldier => {
                if (soldier.UnitID && unitNameMap[soldier.UnitID]) {
                  soldier.UnitName = unitNameMap[soldier.UnitID]
                  soldier.UnitFullPath = unitFullPathMap[soldier.UnitID]
                }
              })
              // Lưu user's hierarchy path (lấy từ đơn vị đầu tiên để so sánh)
              // Thực tế cần lấy từ user's unit, nhưng ở đây ta sẽ validate ở backend
            }
          }
        } catch (err) {
          console.error("Lỗi khi lấy tên đơn vị:", err)
        }
        
        // 6b. Kiểm tra Mã QN đã tồn tại
        try {
          const soldierIdsToCheck = parsedData
            .map(s => s.SoldierID)
            .filter(id => id.length > 0)
          
          if (soldierIdsToCheck.length > 0) {
            const checkResponse = await fetch("/api/soldiers/check-existing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ soldierIds: soldierIdsToCheck }),
            })
            const checkResult = await checkResponse.json()
            if (checkResult.success && checkResult.data?.existingIds) {
              existingIdSet = new Set(checkResult.data.existingIds)
            }
          }
        } catch (err) {
          console.error("Lỗi khi kiểm tra Mã QN tồn tại:", err)
        }
        setCheckingExisting(false)

        // 7. Validate và phân nhóm dữ liệu
        const validationErrors: ValidationError[] = []
        const newData: SoldierImportRow[] = []
        const updateList: SoldierImportRow[] = []
        let validCount = 0
        let warningCount = 0
        let errorCount = 0

        parsedData.forEach((soldier) => {
          const { rowNumber } = soldier
          const isExisting = existingIdSet.has(soldier.SoldierID)
          soldier.isExisting = isExisting

          // Date validation (luôn kiểm tra format cho cả thêm mới và cập nhật)
          const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
          if (soldier.DateOfBirth && !dateRegex.test(soldier.DateOfBirth)) {
            soldier.errors.push("Ngày sinh không đúng định dạng (DD/MM/YYYY)")
            validationErrors.push({ rowNumber, message: "Ngày sinh sai định dạng", field: "DateOfBirth", value: soldier.DateOfBirth })
          }
          if (soldier.EnlistmentDate && !dateRegex.test(soldier.EnlistmentDate)) {
            soldier.errors.push("Ngày nhập ngũ không đúng định dạng (DD/MM/YYYY)")
            validationErrors.push({ rowNumber, message: "Ngày nhập ngũ sai định dạng", field: "EnlistmentDate", value: soldier.EnlistmentDate })
          }

          if (isExisting) {
            // Cập nhật: KHÔNG kiểm tra bắt buộc, chỉ cần có Mã QN
            if (!soldier.SoldierID) {
              soldier.errors.push("Thiếu mã quân nhân")
              validationErrors.push({ rowNumber, message: "Thiếu mã quân nhân", field: "SoldierID" })
            }
            soldier.warnings.push("Mã QN đã tồn tại - sẽ cập nhật thông tin")
          } else {
            // Thêm mới: kiểm tra các field bắt buộc
            if (!soldier.SoldierID) {
              soldier.errors.push("Thiếu mã quân nhân")
              validationErrors.push({ rowNumber, message: "Thiếu mã quân nhân", field: "SoldierID" })
            }
            if (!soldier.FullName) {
              soldier.errors.push("Thiếu họ tên")
              validationErrors.push({ rowNumber, message: "Thiếu họ tên", field: "FullName" })
            }
            if (!soldier.UnitID) {
              soldier.errors.push("Thiếu mã đơn vị")
              validationErrors.push({ rowNumber, message: "Thiếu mã đơn vị", field: "UnitID" })
            }
            if (!soldier.RankID) {
              soldier.errors.push("Thiếu mã cấp bậc")
              validationErrors.push({ rowNumber, message: "Thiếu mã cấp bậc", field: "RankID" })
            }
            if (!soldier.CitizenID) {
              soldier.errors.push("Thiếu số CCCD")
              validationErrors.push({ rowNumber, message: "Thiếu số CCCD", field: "CitizenID" })
            }
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

          // Phân nhóm
          if (isExisting) {
            updateList.push(soldier)
          } else {
            newData.push(soldier)
          }
        })

        setUploadedFile(file)
        setImportData(newData)
        setUpdateData(updateList)
        setErrors(validationErrors)
        setSummary({
          totalRows: basicRows.length,
          validRows: validCount,
          warningRows: warningCount,
          errorRows: errorCount,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          uploadTime: new Date().toLocaleString("vi-VN"),
        })

        setCurrentStep(1)
        const updateMsg = updateList.length > 0 ? `, ${updateList.length} cập nhật` : ""
        message.success(`Đã tải file: ${basicRows.length} quân nhân (${newData.length} thêm mới${updateMsg})`)
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
      // Lọc bỏ các dòng lỗi
      const validNewData = importData.filter((row) => row.Status !== "error")
      const validUpdateData = updateData.filter((row) => row.Status !== "error")

      // Helper để map dữ liệu gửi lên API
      const mapSoldierPayload = (row: SoldierImportRow) => ({
        SoldierID: row.SoldierID,
        FullName: row.FullName,
        UnitID: row.UnitID,
        UnitName: row.UnitName,
        Position: row.Position,
        RankID: row.RankID,
        RankName: row.RankName,
        DateOfBirth: parseDate(row.DateOfBirth),
        Gender: row.Gender === "Nam" ? 1 : 0,
        CitizenID: row.CitizenID,
        Hometown: row.Hometown,
        Address: row.Address,
        ProvinceID: row.ProvinceID,
        ProvinceName: row.ProvinceName,
        WardID: row.WardID,
        WardName: row.WardName,
        Ethnicity: row.Ethnicity,
        SoldierType: row.SoldierType,
        Religion: row.Religion,
        MaritalStatusID: row.MaritalStatusID,
        MaritalStatus: row.MaritalStatus,
        EducationLevel: row.EducationLevel,
        Specialization: row.Specialization,
        PoliticalLevel: row.PoliticalLevel,
        BloodType: row.BloodType,
        HealthClassification: row.HealthClassification,
        Height: row.Height,
        Weight: row.Weight,
        BloodPressure: row.BloodPressure,
        EnlistmentDate: parseDate(row.EnlistmentDate),
        PartyJoinDate: parseDate(row.PartyJoinDate || ""),
        YouthUnionJoinDate: parseDate(row.YouthUnionJoinDate || ""),
        PhotoPath: row.PhotoPath,
        FamilyMembers: row.FamilyMembers?.map((m) => ({
          Relationship: m.Relationship,
          FullName: m.FullName,
          DateOfBirth: parseDate(m.DateOfBirth || ""),
          Occupation: m.Occupation,
          Workplace: m.Workplace,
          PhoneNumber: m.PhoneNumber,
          Address: m.Address,
          IsDependent: m.IsDependent,
        })),
        WorkProcesses: row.WorkProcesses?.map((w) => ({
          FromDate: parseDate(w.FromDate || ""),
          ToDate: w.ToDate === "nay" ? null : parseDate(w.ToDate || ""),
          WorkDescription: w.Description,
          RankID: w.RankID,
          PartyPosition: w.PartyPosition,
        })),
        TrainingProcesses: row.TrainingProcesses?.map((t) => ({
          SchoolName: t.SchoolName,
          MajorName: t.MajorName,
          FromDate: parseDate(t.FromDate || ""),
          ToDate: parseDate(t.ToDate || ""),
          TrainingType: t.TrainingType,
          Certificate: t.Certificate,
        })),
      })

      const newSoldiersPayload = validNewData.map(mapSoldierPayload)
      const updateSoldiersPayload = validUpdateData.map(mapSoldierPayload)

      // Gọi API import
      const response = await fetch("/api/soldiers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldiers: newSoldiersPayload,
          updateSoldiers: updateSoldiersPayload,
          userId: user.userId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const { success, failed, updateSuccess, updateFailed, results, updateResults } = result.data
        
        // Cập nhật summary với kết quả thực tế
        const totalSuccess = (success || 0) + (updateSuccess || 0)
        const totalFailed = (failed || 0) + (updateFailed || 0)
        setSummary((prev) => prev ? {
          ...prev,
          validRows: totalSuccess,
          errorRows: totalFailed,
        } : prev)

        // Hiển thị thông báo chi tiết
        const errorMessages: string[] = []
        if (failed > 0 && results) {
          results
            .filter((r: any) => !r.success)
            .slice(0, 3)
            .forEach((r: any) => errorMessages.push(`Thêm mới dòng ${r.rowNumber}: ${r.error}`))
        }
        if (updateFailed > 0 && updateResults) {
          updateResults
            .filter((r: any) => !r.success)
            .slice(0, 3)
            .forEach((r: any) => errorMessages.push(`Cập nhật dòng ${r.rowNumber}: ${r.error}`))
        }
        
        if (totalFailed > 0) {
          message.warning(
            `Đã xử lý ${totalSuccess} quân nhân. ${totalFailed} thất bại:\n${errorMessages.join("\n")}`,
            10
          )
        } else {
          const parts: string[] = []
          if (success > 0) parts.push(`thêm mới ${success}`)
          if (updateSuccess > 0) parts.push(`cập nhật ${updateSuccess}`)
          message.success(`Đã ${parts.join(" và ")} quân nhân thành công`)
        }

        setCurrentStep(3)
      } else {
        message.error(result.message || "Lỗi khi import dữ liệu")
      }
    } catch (error) {
      console.error("Lỗi khi import:", error)
      message.error("Lỗi khi import dữ liệu")
    } finally {
      setImporting(false)
    }
  }

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null
    
    // Nếu chỉ có năm (cho ngày sinh thân nhân)
    if (/^\d{4}$/.test(dateStr)) {
      return `${dateStr}-01-01` // Giả sử là 01/01/YYYY
    }
    
    // Nếu là DD/MM/YYYY
    const parts = dateStr.split("/")
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    
    // Nếu đã là YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
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
      fixed: "left",
    },
    {
      title: "Mã QN",
      dataIndex: "SoldierID",
      width: 100,
      fixed: "left",
    },
    {
      title: "Họ và tên",
      dataIndex: "FullName",
      width: 180,
      fixed: "left",
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
      render: (gender: string) => gender === "1" ? "Nam" : "Nữ",
    },
    {
      title: "CCCD",
      dataIndex: "CitizenID",
      width: 140,
    },
    {
      title: "Đơn vị",
      dataIndex: "UnitName",
      width: 250,
      render: (_: string, record: SoldierImportRow) => {
        const fullPath = record.UnitFullPath || record.UnitName
        const parts = fullPath.split(",").map(p => p.trim()).filter(p => p)
        if (parts.length <= 1) {
          return <span>{parts[0] || record.UnitName}</span>
        }
        // Tất cả trừ phần tử cuối hiển thị chữ xám nhỏ
        const ancestors = parts.slice(0, -1)
        const leaf = parts[parts.length - 1]
        return (
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 11, color: "#8c8c8c" }}>
              {ancestors.join(", ")}
            </div>
            <div>{leaf}</div>
          </div>
        )
      },
    },
    {
      title: "Chức vụ",
      dataIndex: "Position",
      width: 150,
    },
    {
      title: "Cấp bậc",
      dataIndex: "RankName",
      width: 120,
    },
    {
      title: "Quê quán",
      dataIndex: "Hometown",
      width: 200,
    },
    {
      title: "Địa chỉ",
      dataIndex: "Address",
      width: 200,
    },
    {
      title: "Tỉnh/TP",
      dataIndex: "ProvinceName",
      width: 150,
    },
    {
      title: "Xã/Phường",
      dataIndex: "WardName",
      width: 150,
    },
    {
      title: "Dân tộc",
      dataIndex: "Ethnicity",
      width: 100,
    },
    {
      title: "Tôn giáo",
      dataIndex: "Religion",
      width: 120,
    },
    {
      title: "Tình trạng HN",
      dataIndex: "MaritalStatus",
      width: 150,
    },
    {
      title: "Học vấn",
      dataIndex: "EducationLevel",
      width: 120,
    },
    {
      title: "Chuyên môn",
      dataIndex: "Specialization",
      width: 150,
    },
    {
      title: "Chính trị",
      dataIndex: "PoliticalLevel",
      width: 120,
    },
    {
      title: "Nhóm máu",
      dataIndex: "BloodType",
      width: 100,
    },
    {
      title: "Sức khỏe",
      dataIndex: "HealthClassification",
      width: 120,
    },
    {
      title: "Cao (cm)",
      dataIndex: "Height",
      width: 80,
    },
    {
      title: "Nặng (kg)",
      dataIndex: "Weight",
      width: 80,
    },
    {
      title: "Huyết áp",
      dataIndex: "BloodPressure",
      width: 120,
    },
    {
      title: "Ngày nhập ngũ",
      dataIndex: "EnlistmentDate",
      width: 130,
    },
    {
      title: "Ngày vào Đảng",
      dataIndex: "PartyJoinDate",
      width: 130,
    },
    {
      title: "Ngày vào Đoàn",
      dataIndex: "YouthUnionJoinDate",
      width: 130,
    },
    {
      title: "Link ảnh",
      dataIndex: "PhotoURL",
      width: 200,
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      width: 100,
      align: "center",
      fixed: "right",
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

  // Helper: render 4 sub-tabs cho một nhóm dữ liệu (thêm mới hoặc cập nhật)
  const renderSubTabs = (dataList: SoldierImportRow[]) => {
    const totalFamily = dataList.reduce((sum, row) => sum + (row.FamilyMembers?.length || 0), 0)
    const totalWork = dataList.reduce((sum, row) => sum + (row.WorkProcesses?.length || 0), 0)
    const totalTraining = dataList.reduce((sum, row) => sum + (row.TrainingProcesses?.length || 0), 0)

    return (
      <Tabs
        defaultActiveKey="soldiers"
        items={[
          {
            key: "soldiers",
            label: `Thông tin chiến sĩ (${dataList.length})`,
            children: (
              <Table
                rowKey="rowNumber"
                columns={previewColumns}
                dataSource={dataList}
                pagination={false}
                scroll={{ x: 4000 }}
                size="small"
              />
            )
          },
          {
            key: "family",
            label: `Thân nhân (${totalFamily})`,
            children: dataList.some(row => row.FamilyMembers && row.FamilyMembers.length > 0) ? (
              <Table
                rowKey={(record, index) => `${record.soldierID}-${index}`}
                columns={[
                  { title: "Mã QN", dataIndex: "soldierID", width: 100 },
                  { title: "Quan hệ", dataIndex: "relationship", width: 120 },
                  { title: "Họ và tên", dataIndex: "fullName", width: 180 },
                  { title: "Ngày sinh", dataIndex: "dateOfBirth", width: 120 },
                  { title: "Nghề nghiệp", dataIndex: "occupation", width: 150 },
                  { title: "Nơi công tác", dataIndex: "workplace", width: 200 },
                  { title: "SĐT", dataIndex: "phoneNumber", width: 120 },
                  { title: "Địa chỉ", dataIndex: "address", width: 200 },
                  { title: "Phụ thuộc", dataIndex: "isDependent", width: 100, render: (v: boolean) => v ? "Có" : "Không" },
                ]}
                dataSource={dataList.flatMap(row =>
                  (row.FamilyMembers || []).map(member => ({
                    soldierID: row.SoldierID,
                    relationship: member.Relationship,
                    fullName: member.FullName,
                    dateOfBirth: member.DateOfBirth,
                    occupation: member.Occupation,
                    workplace: member.Workplace,
                    phoneNumber: member.PhoneNumber,
                    address: member.Address,
                    isDependent: member.IsDependent,
                  }))
                )}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1200 }}
                size="small"
              />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8c8c8c" }}>
                Không có dữ liệu thân nhân
              </div>
            )
          },
          {
            key: "work",
            label: `Quá trình công tác (${totalWork})`,
            children: dataList.some(row => row.WorkProcesses && row.WorkProcesses.length > 0) ? (
              <Table
                rowKey={(record, index) => `${record.soldierID}-${index}`}
                columns={[
                  { title: "Mã QN", dataIndex: "soldierID", width: 100 },
                  { title: "Từ ngày", dataIndex: "fromDate", width: 120 },
                  { title: "Đến ngày", dataIndex: "toDate", width: 120 },
                  { title: "Đơn vị/Chức vụ", dataIndex: "description", width: 300 },
                  { title: "Cấp bậc", dataIndex: "rankName", width: 120 },
                  { title: "Chức vụ Đảng", dataIndex: "partyPosition", width: 150 },
                ]}
                dataSource={dataList.flatMap(row =>
                  (row.WorkProcesses || []).map(work => ({
                    soldierID: row.SoldierID,
                    fromDate: work.FromDate,
                    toDate: work.ToDate,
                    description: work.Description,
                    rankID: work.RankID,
                    rankName: work.RankName,
                    partyPosition: work.PartyPosition,
                  }))
                )}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
                size="small"
              />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8c8c8c" }}>
                Không có dữ liệu quá trình công tác
              </div>
            )
          },
          {
            key: "training",
            label: `Quá trình đào tạo (${totalTraining})`,
            children: dataList.some(row => row.TrainingProcesses && row.TrainingProcesses.length > 0) ? (
              <Table
                rowKey={(record, index) => `${record.soldierID}-${index}`}
                columns={[
                  { title: "Mã QN", dataIndex: "soldierID", width: 100 },
                  { title: "Tên trường", dataIndex: "schoolName", width: 200 },
                  { title: "Ngành học", dataIndex: "majorName", width: 180 },
                  { title: "Từ ngày", dataIndex: "fromDate", width: 120 },
                  { title: "Đến ngày", dataIndex: "toDate", width: 120 },
                  { title: "Hình thức", dataIndex: "trainingType", width: 150 },
                  { title: "Bằng/Chứng chỉ", dataIndex: "certificate", width: 150 },
                ]}
                dataSource={dataList.flatMap(row =>
                  (row.TrainingProcesses || []).map(training => ({
                    soldierID: row.SoldierID,
                    schoolName: training.SchoolName,
                    majorName: training.MajorName,
                    fromDate: training.FromDate,
                    toDate: training.ToDate,
                    trainingType: training.TrainingType,
                    certificate: training.Certificate,
                  }))
                )}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
                size="small"
              />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8c8c8c" }}>
                Không có dữ liệu quá trình đào tạo
              </div>
            )
          }
        ]}
      />
    )
  }

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
                styles={{ content: { color: "#3a4d2e" } }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Hợp lệ"
                value={summary?.validRows}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: "#52c41a" } }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Cảnh báo"
                value={summary?.warningRows}
                prefix={<WarningOutlined />}
                styles={{ content: { color: "#faad14" } }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Lỗi"
                value={summary?.errorRows}
                prefix={<CloseCircleOutlined />}
                styles={{ content: { color: "#ff4d4f" } }}
              />
            </Col>
          </Row>

          {/* Thống kê thêm mới / cập nhật */}
          <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
            <Tag icon={<PlusCircleOutlined />} color="blue" style={{ fontSize: 13, padding: "4px 12px" }}>
              Thêm mới: {importData.length} quân nhân
            </Tag>
            {updateData.length > 0 && (
              <Tag icon={<EditOutlined />} color="orange" style={{ fontSize: 13, padding: "4px 12px" }}>
                Cập nhật: {updateData.length} quân nhân
              </Tag>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
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

        <Card title={`Xem trước dữ liệu (${importData.length + updateData.length} dòng)`} style={{ borderRadius: 8 }}>
          {updateData.length > 0 ? (
            // Có cả thêm mới và cập nhật -> hiển thị 2 tab lớn
            <Tabs
              defaultActiveKey="add"
              type="card"
              items={[
                {
                  key: "add",
                  label: (
                    <span>
                      <PlusCircleOutlined style={{ marginRight: 6 }} />
                      Thêm chiến sĩ ({importData.length})
                    </span>
                  ),
                  children: importData.length > 0
                    ? renderSubTabs(importData)
                    : <div style={{ textAlign: "center", padding: "40px 0", color: "#8c8c8c" }}>Không có dữ liệu thêm mới</div>
                },
                {
                  key: "update",
                  label: (
                    <span>
                      <EditOutlined style={{ marginRight: 6 }} />
                      Cập nhật chiến sĩ ({updateData.length})
                    </span>
                  ),
                  children: renderSubTabs(updateData)
                }
              ]}
            />
          ) : (
            // Chỉ có thêm mới
            renderSubTabs(importData)
          )}
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
              <Text type="secondary">Thêm mới:</Text>
              <div style={{ fontWeight: 500, color: "#1677ff" }}>{importData.length} quân nhân</div>
            </div>
            {updateData.length > 0 && (
              <div>
                <Text type="secondary">Cập nhật:</Text>
                <div style={{ fontWeight: 500, color: "#fa8c16" }}>{updateData.length} quân nhân</div>
              </div>
            )}
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

  const renderStep3 = () => {
    const newValidCount = importData.filter(r => r.Status !== "error").length
    const updateValidCount = updateData.filter(r => r.Status !== "error").length
    return (
      <Card style={{ borderRadius: 8 }}>
        <Alert
          title="Xác nhận nhập dữ liệu"
          description={
            updateData.length > 0
              ? `Bạn sắp thêm mới ${newValidCount} quân nhân và cập nhật ${updateValidCount} quân nhân. Dữ liệu cảnh báo và lỗi sẽ không được nhập.`
              : `Bạn sắp nhập ${newValidCount} quân nhân vào hệ thống. Dữ liệu cảnh báo và lỗi sẽ không được nhập.`
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={16}>
          <Col span={updateData.length > 0 ? 6 : 8}>
            <Card style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
              <Statistic
                title="Thêm mới"
                value={newValidCount}
                styles={{ content: { color: "#52c41a" } }}
                suffix="quân nhân"
              />
            </Card>
          </Col>
          {updateData.length > 0 && (
            <Col span={6}>
              <Card style={{ background: "#fff7e6", borderColor: "#ffd591" }}>
                <Statistic
                  title="Cập nhật"
                  value={updateValidCount}
                  styles={{ content: { color: "#fa8c16" } }}
                  suffix="quân nhân"
                />
              </Card>
            </Col>
          )}
          <Col span={updateData.length > 0 ? 6 : 8}>
            <Card style={{ background: "#fffbe6", borderColor: "#ffe58f" }}>
              <Statistic
                title="Bỏ qua (cảnh báo)"
                value={summary?.warningRows}
                styles={{ content: { color: "#faad14" } }}
                suffix="dòng"
              />
            </Card>
          </Col>
          <Col span={updateData.length > 0 ? 6 : 8}>
            <Card style={{ background: "#fff1f0", borderColor: "#ffccc7" }}>
              <Statistic
                title="Bỏ qua (lỗi)"
                value={summary?.errorRows}
                styles={{ content: { color: "#ff4d4f" } }}
                suffix="dòng"
              />
            </Card>
          </Col>
        </Row>
      </Card>
    )
  }

  const renderStep4 = () => {
    const newValidCount = importData.filter(r => r.Status !== "error").length
    const updateValidCount = updateData.filter(r => r.Status !== "error").length
    return (
      <Card style={{ borderRadius: 8, textAlign: "center", padding: "40px 20px" }}>
        <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a", marginBottom: 24 }} />
        <Title level={3} style={{ color: "#52c41a" }}>
          Nhập dữ liệu thành công!
        </Title>
        <Text style={{ fontSize: 16 }}>
          {updateData.length > 0
            ? `Đã thêm mới ${newValidCount} và cập nhật ${updateValidCount} quân nhân`
            : `Đã nhập ${newValidCount} quân nhân vào hệ thống`
          }
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
                setUpdateData([])
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
  }

  const steps = [
    { title: "Tải file Excel", content: "Chọn và tải file Excel" },
    { title: "Kiểm tra dữ liệu", content: "Hệ thống kiểm tra và đối chiếu" },
    { title: "Xem trước dữ liệu", content: "Xem dữ liệu trước khi nhập" },
    { title: "Hoàn tất", content: "Nhập dữ liệu vào hệ thống" },
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
              disabled={!summary || (importData.filter(r => r.Status !== "error").length === 0 && updateData.filter(r => r.Status !== "error").length === 0)}
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
              disabled={!summary || (importData.filter(r => r.Status !== "error").length === 0 && updateData.filter(r => r.Status !== "error").length === 0)}
            >
              Nhập dữ liệu
            </Button>
          )}
        </div>
      )}
    </PageLayout>
  )
}
