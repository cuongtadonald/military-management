export type SoldierStatus = "Active" | "On Leave" | "Reserve" | "Discharged";
export type RecordType = "Award" | "Discipline" | "Training" | "Medical" | "Document";

export interface SoldierRecord {
  id: string;
  title: string;
  type: RecordType;
  date: string;
  description: string;
}

export interface Soldier {
  id: string;
  fullName: string;
  citizenId: string;
  rank: string;
  unit: string;
  position: string;
  status: SoldierStatus;
  avatar: string;
  dateOfBirth: string;
  gender: string;
  hometown: string;
  ethnicity: string;
  religion: string;
  phone: string;
  address: string;
  specialty: string;
  enlistmentDate: string;
  bloodType: string;
  politicalStatus: string;
  education: string;
  maritalStatus: string;
  familyInfo: string;
  healthStatus: string;
  records: SoldierRecord[];
}

type UnitNode = {
  value: string;
  label: string;
  children?: UnitNode[];
};

// ĐÃ SỬA LOGIC: Tự động sinh đúng chuỗi cấp bậc: Đại đội -> Trung đội -> Tiểu đội
const generateSubUnits = (parentName: string, count: number, currentLevel: string): UnitNode[] => {
  return Array.from({ length: count }).map((_, i) => {
    const nodeName = `${currentLevel} ${i + 1}`;
    
    // Xác định cấp tiếp theo cần sinh
    let nextLevel = "";
    if (currentLevel === "Đại đội") nextLevel = "Trung đội";
    else if (currentLevel === "Trung đội") nextLevel = "Tiểu đội";
    
    return {
      value: nodeName,
      label: nodeName,
      // Nếu có cấp tiếp theo thì đệ quy sinh tiếp, ngược lại để undefined (lá của cây)
      children: nextLevel ? generateSubUnits(nodeName, 4, nextLevel) : undefined
    };
  });
};

export const UNIT_TREE: UnitNode[] = [
  {
    value: "Trung đoàn 4", label: "Trung đoàn 4",
    children: [
      { value: "Tiểu đoàn 1", label: "Tiểu đoàn 1", children: generateSubUnits("Tiểu đoàn 1", 4, "Đại đội") },
      { value: "Tiểu đoàn 2", label: "Tiểu đoàn 2", children: generateSubUnits("Tiểu đoàn 2", 4, "Đại đội") }
    ]
  },
  {
    value: "Trung đoàn 5", label: "Trung đoàn 5",
    children: [
      { value: "Tiểu đoàn 1", label: "Tiểu đoàn 1", children: generateSubUnits("Tiểu đoàn 1", 4, "Đại đội") }
    ]
  },
  {
    value: "Trung đoàn 271", label: "Trung đoàn 271",
    children: [
      { value: "Tiểu đoàn 1", label: "Tiểu đoàn 1", children: generateSubUnits("Tiểu đoàn 1", 4, "Đại đội") },
      { value: "Tiểu đoàn 2", label: "Tiểu đoàn 2", children: generateSubUnits("Tiểu đoàn 2", 4, "Đại đội") }
    ]
  }
];

export const RANK_TREE = [
  {
    value: "Sĩ quan", label: "Sĩ quan",
    children: [
      { value: "Cấp Tướng", label: "Cấp Tướng", children: [{ value: "Đại tá", label: "Đại tá" }, { value: "Thượng tá", label: "Thượng tá" }, { value: "Trung tá", label: "Trung tá" }, { value: "Thiếu tá", label: "Thiếu tá" }] },
      { value: "Cấp Úy", label: "Cấp Úy", children: [{ value: "Đại úy", label: "Đại úy" }, { value: "Thượng úy", label: "Thượng úy" }, { value: "Trung úy", label: "Trung úy" }, { value: "Thiếu úy", label: "Thiếu úy" }] },
    ],
  },
  {
    value: "Hạ sĩ quan & Chiến sĩ", label: "Hạ sĩ quan & Chiến sĩ",
    children: [
      { value: "Hạ sĩ quan", label: "Hạ sĩ quan", children: [{ value: "Thượng sĩ", label: "Thượng sĩ" }, { value: "Trung sĩ", label: "Trung sĩ" }, { value: "Hạ sĩ", label: "Hạ sĩ" }] },
      { value: "Chiến sĩ", label: "Chiến sĩ", children: [{ value: "Binh nhất", label: "Binh nhất" }, { value: "Binh nhì", label: "Binh nhì" }] },
    ],
  },
];

export const POSITIONS = ["Chiến sĩ", "Tiểu đội trưởng", "Trung đội trưởng", "Đại đội trưởng", "Tiểu đoàn trưởng", "Chính trị viên", "Quân y", "Nhân viên tham mưu"];

const avatars = ["/soldiers/soldier-1.png", "/soldiers/soldier-2.png", "/soldiers/soldier-3.png", "/soldiers/soldier-4.png"];
const firstNames = ["Nguyễn Văn", "Trần Văn", "Lê Văn", "Phạm Văn", "Hoàng Văn", "Võ Văn", "Đặng Văn", "Bùi Văn"];
const lastNames = ["An", "Bình", "Cường", "Dũng", "Hải", "Khánh", "Long", "Minh", "Nam", "Phúc"];

const formatDate = (y: number, m: number, d: number) => `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

export const soldiers: Soldier[] = Array.from({ length: 47 }).map((_, i) => {
  const first = firstNames[i % firstNames.length];
  const last = lastNames[i % lastNames.length];
  
  const unitPath = i % 2 === 0 
    ? "Trung đoàn 4 > Tiểu đoàn 1 > Đại đội 1 > Trung đội 1 > Tiểu đội 1" 
    : "Trung đoàn 5 > Tiểu đoàn 1 > Đại đội 2 > Trung đội 3 > Tiểu đội 2";
    
  const rankPath = i % 3 === 0 ? "Sĩ quan > Cấp Tướng > Đại tá" : i % 3 === 1 ? "Sĩ quan > Cấp Úy > Trung úy" : "Hạ sĩ quan & Chiến sĩ > Chiến sĩ > Binh nhì";
  const position = POSITIONS[i % POSITIONS.length];
  const statuses: Soldier["status"][] = ["Active", "On Leave", "Reserve", "Discharged"];

  return {
    id: `SLD-${(1000 + i).toString()}`,
    avatar: avatars[i % avatars.length],
    fullName: `${first} ${last}`,
    rank: rankPath,
    unit: unitPath,
    position: position,
    citizenId: `${(100000000000 + i * 9871234).toString()}`,
    dateOfBirth: formatDate(1985 + (i % 15), (i % 8) + 1, (i % 28) + 1),
    gender: i % 5 === 1 || i % 5 === 4 ? "Nữ" : "Nam",
    hometown: ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Tây Ninh", "Cần Thơ"][i % 5],
    ethnicity: "Kinh",
    religion: i % 4 === 0 ? "Không" : "Phật giáo",
    phone: `09${10000000 + i}`,
    address: `${i + 12} Đường Cách Mạng Tháng 8, Phường ${(i % 9) + 1}, Tây Ninh`,
    enlistmentDate: formatDate(2015 + (i % 8), (i % 9) + 1, (i % 28) + 1),
    bloodType: ["O+", "A+", "B+", "AB+", "O-"][i % 5],
    politicalStatus: i % 3 === 0 ? "Đảng viên" : "Quần chúng",
    education: ["THPT", "Cao đẳng", "Đại học"][i % 3],
    specialty: ["Bộ binh", "Thông tin liên lạc", "Hậu cần", "Quân y"][i % 4],
    status: statuses[i % statuses.length],
    maritalStatus: i % 3 === 0 ? "Đã kết hôn" : "Độc thân",
    familyInfo: i % 3 === 0 ? "Vợ: Nguyễn Thị A, Con: 1" : "Bố: Nguyễn Văn B, Mẹ: Trần Thị C",
    healthStatus: "Loại 1 - Đủ điều kiện phục vụ",
    records: [],
  };
});

export function getSoldier(id: string): Soldier | undefined {
  return soldiers.find((s) => s.id === id);
}