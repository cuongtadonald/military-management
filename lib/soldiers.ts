export type Soldier = {
  id: string
  avatar: string
  fullName: string
  rank: string
  unit: string
  position: string
  militaryId: string
  citizenId: string
  // personal info
  dateOfBirth: string
  gender: string
  hometown: string
  ethnicity: string
  religion: string
  phone: string
  email: string
  address: string
  // military info
  enlistmentDate: string
  bloodType: string
  politicalStatus: string
  education: string
  specialty: string
  status: "Active" | "On Leave" | "Reserve" | "Discharged"
  // attached records
  records: SoldierRecord[]
}

export type SoldierRecord = {
  id: string
  title: string
  type: "Award" | "Discipline" | "Training" | "Medical" | "Document"
  date: string
  description: string
}

export const RANKS = [
  "Binh nhì",
  "Binh nhất",
  "Hạ sĩ",
  "Trung sĩ",
  "Thượng sĩ",
  "Thiếu úy",
  "Trung úy",
  "Thượng úy",
  "Đại úy",
  "Thiếu tá",
  "Trung tá",
  "Thượng tá",
  "Đại tá",
  "Thiếu tướng",
  "Trung tướng",
  "Thượng tướng",
  "Đại tướng",
]

export const UNITS = [
  "Tiểu đoàn Bộ binh 1",
  "Trung đoàn Thiết giáp 2",
  "Lữ đoàn Pháo binh 3",
  "Binh chủng Thông tin",
  "Tiểu đoàn Công binh",
  "Quân y",
]

export const POSITIONS = [
  "Chiến sĩ",
  "Tiểu đội trưởng",
  "Đại đội trưởng",
  "Nhân viên thông tin",
  "Quân y",
  "Công binh",
  "Tham mưu tiểu đoàn",
]

const avatars = [
  "/soldiers/soldier-1.png",
  "/soldiers/soldier-2.png",
  "/soldiers/soldier-3.png",
  "/soldiers/soldier-4.png",
]

function makeRecords(seed: number): SoldierRecord[] {
  const base: Omit<SoldierRecord, "id">[] = [
    {
      title: "Giấy khen",
      type: "Award",
      date: "2023-08-12",
      description: "Được khen thưởng vì thành tích xuất sắc trong huấn luyện.",
    },
    {
      title: "Huấn luyện bắn súng nâng cao",
      type: "Training",
      date: "2022-05-03",
      description: "Hoàn thành khóa huấn luyện bắn súng nâng cao đạt loại giỏi.",
    },
    {
      title: "Khám sức khỏe định kỳ",
      type: "Medical",
      date: "2024-01-20",
      description: "Đủ điều kiện sức khỏe phục vụ tại ngũ.",
    },
    {
      title: "Hồ sơ nhập ngũ",
      type: "Document",
      date: "2019-09-01",
      description: "Hoàn tất hồ sơ nhập ngũ theo quy định.",
    },
  ]

  return base.slice(0, ((seed % 3) + 2)).map((r, i) => ({
    ...r,
    id: `${seed}-rec-${i}`,
  }))
}

const firstNames = [
  "Nguyễn Văn",
  "Trần Văn",
  "Lê Văn",
  "Phạm Văn",
  "Hoàng Văn",
  "Võ Văn",
  "Đặng Văn",
  "Bùi Văn",
  "Đỗ Văn",
  "Hồ Văn",
  "Ngô Văn",
  "Dương Văn",
  "Phan Văn",
  "Mai Văn",
  "Lý Văn",
  "Tạ Văn",
]
const lastNames = [
  "An",
  "Bình",
  "Cường",
  "Dũng",
  "Hải",
  "Khánh",
  "Long",
  "Minh",
  "Nam",
  "Phúc",
  "Quang",
  "Sơn",
]

export const soldiers: Soldier[] = Array.from({ length: 47 }).map((_, i) => {
  const first = firstNames[i % firstNames.length]
  const last = lastNames[i % lastNames.length]
  const rank = RANKS[i % RANKS.length]
  const unit = UNITS[i % UNITS.length]
  const position = POSITIONS[i % POSITIONS.length]
  const statuses: Soldier["status"][] = ["Active", "On Leave", "Reserve", "Discharged"]
  return {
    id: `SLD-${(1000 + i).toString()}`,
    avatar: avatars[i % avatars.length],
    fullName: `${first} ${last}`,
    rank,
    unit,
    position,
    militaryId: `MIL-${(20210000 + i * 137).toString()}`,
    citizenId: `${(100000000000 + i * 9871234).toString()}`,
    dateOfBirth: `19${85 + (i % 15)}-0${(i % 8) + 1}-1${i % 9}`,
    gender: i % 5 === 1 || i % 5 === 4 ? "Nữ" : "Nam",
    hometown: [
      "Hà Nội",
      "TP. Hồ Chí Minh",
      "Đà Nẵng",
      "Tây Ninh",
      "Cần Thơ",
    ][i % 5],
    ethnicity: "Kinh",
    religion: i % 4 === 0 ? "Không" : "Phật giáo",
    phone: `09${10000000 + i}`,
    //phone: `+1 555 0${(100 + i).toString()} ${(2000 + i).toString()}`,
    //email: `${first.toLowerCase()}.${last.toLowerCase()}@army.mil`,
    email: `quannhan${i + 1}@qdnd.vn`,
    mail: `${first.toLowerCase()}.${last.toLowerCase()}@army.mil`,
    address: `${i + 12} Đường Cách Mạng Tháng 8, Phường ${(i % 9) + 1}, Tây Ninh`,
    enlistmentDate: `20${15 + (i % 8)}-0${(i % 9) + 1}-0${(i % 8) + 1}`,
    bloodType: ["O+", "A+", "B+", "AB+", "O-"][i % 5],
    politicalStatus: i % 3 === 0 ? "Đảng viên" : "Đoàn viên",
    education: [
      "THPT",
      "Cao đẳng",
      "Đại học",
      "Học viện Quân sự",
    ][i % 4],
    specialty: [
      "Bộ binh",
      "Thông tin liên lạc",
      "Hậu cần",
      "Quân y",
      "Công binh",
    ][i % 5],
    status: statuses[i % statuses.length],
    records: makeRecords(i),
  }
})

export function getSoldier(id: string): Soldier | undefined {
  return soldiers.find((s) => s.id === id)
}
