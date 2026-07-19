export type PermissionLevel = 1 | 2 | 3;

export interface Permissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canImportExport: boolean;
  canCreateRequest: boolean;
  canApproveRequest: boolean;
}

// Map PermissionLevel từ database với quyền hạn
export const PERMISSION_LEVELS: Record<PermissionLevel, Permissions> = {
  1: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canImportExport: true,
    canCreateRequest: true,
    canApproveRequest: true,
  },
  2: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canImportExport: true,
    canCreateRequest: true,
    canApproveRequest: true,
  },
  3: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canImportExport: false,
    canCreateRequest: true,
    canApproveRequest: false,
  },
};

// Thêm lại để tương thích ngược
export const ROLE_LABELS: Record<number, string> = {
  1: "Toàn quyền",
  2: "Quản lý",
  3: "Xem và đề xuất",
};

export function getPermissionsByLevel(level: PermissionLevel): Permissions {
  return PERMISSION_LEVELS[level] || PERMISSION_LEVELS[3];
}

export function getLevelLabel(level: PermissionLevel): string {
  return ROLE_LABELS[level] || "Không xác định";
}