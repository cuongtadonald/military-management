# Hướng dẫn chức năng Cơ cấu đơn vị

## 📋 Tổng quan

Chức năng **Cơ cấu đơn vị** cho phép quản lý cây tổ chức đơn vị theo dạng cây (tree view) với các tính năng:

- ✅ Hiển thị cây đơn vị theo phân cấp
- ✅ Phân quyền theo cấp đơn vị của user
- ✅ Thêm đơn vị con
- ✅ Màu sắc và ký hiệu phân biệt các cấp

## 🎨 Giao diện

### Vị trí
- Nút **"Cơ cấu đơn vị"** nằm ở header, bên trái nút chuông thông báo
- Icon: 🏢 (ApartmentOutlined)

### Khi click vào nút
- Mở Modal hiển thị cây đơn vị
- Cây được mở rộng hoàn toàn (expand all)
- Có chú thích màu sắc cho từng cấp

## 🎨 Màu sắc theo cấp đơn vị

| Cấp | Level | Màu sắc | Icon | Label |
|-----|-------|---------|------|-------|
| Sư đoàn | 1 | 🟦 Xanh dương | 🟦 | Sư đoàn |
| Trung đoàn | 2 | 🟪 Tím | 🟪 | Trung đoàn |
| Tiểu đoàn | 3 | 🟩 Xanh lá | 🟩 | Tiểu đoàn |
| Đại đội | 4 | 🟨 Vàng | 🟨 | Đại đội |
| Trung đội | 5 | 🟧 Cam | 🟧 | Trung đội |
| Tiểu đội | 6 | 🟥 Đỏ | 🟥 | Tiểu đội |

## 🔧 Cấu trúc database

### Bảng OrganizationUnit

```sql
CREATE TABLE OrganizationUnit (
  UnitID VARCHAR(50) PRIMARY KEY,
  UnitName NVARCHAR(255),
  UnitLevel INT,
  ParentUnitID VARCHAR(50),
  HierarchyPath VARCHAR(1000)
)
```

### Ví dụ dữ liệu

```sql
-- Sư đoàn 5 (Level 1)
INSERT INTO OrganizationUnit VALUES ('F00001', N'Sư đoàn 5', 1, NULL, '/F00001/')

-- Trung đoàn 4 (Level 2) - con của Sư đoàn 5
INSERT INTO OrganizationUnit VALUES ('E00008', N'Trung đoàn 4', 2, 'F00001', '/F00001/E00008/')

-- Tiểu đoàn 14 (Level 3) - con của Trung đoàn 4
INSERT INTO OrganizationUnit VALUES ('D00014', N'Tiểu đoàn 14', 3, 'E00008', '/F00001/E00008/D00014/')
```

## 📡 API Endpoints

### GET /api/units

Lấy cây đơn vị của user

**Query params:**
- `userId`: ID của user đang đăng nhập

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "UnitID": "F00001",
      "UnitName": "Sư đoàn 5",
      "UnitLevel": 1,
      "ParentUnitID": null,
      "HierarchyPath": "/F00001/"
    },
    {
      "UnitID": "E00008",
      "UnitName": "Trung đoàn 4",
      "UnitLevel": 2,
      "ParentUnitID": "F00001",
      "HierarchyPath": "/F00001/E00008/"
    }
  ],
  "rootUnitId": "F00001"
}
```

### POST /api/units

Thêm đơn vị mới

**Request body:**
```json
{
  "unitName": "Đại đội 5",
  "parentUnitId": "D00014",
  "userId": "U001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thêm đơn vị thành công",
  "data": {
    "UnitID": "U1234567890",
    "UnitName": "Đại đội 5",
    "UnitLevel": 4,
    "ParentUnitID": "D00014",
    "HierarchyPath": "/F00001/E00008/D00014/U1234567890/"
  }
}
```

## 🔐 Phân quyền

### Nguyên tắc
- User chỉ thấy cây đơn vị bắt đầu từ cấp của mình
- User chỉ được thêm đơn vị con vào đơn vị mình quản lý

### Ví dụ
- **Admin** (UnitID = null): Thấy toàn bộ cây
- **Sư đoàn trưởng** (UnitID = F00001): Thấy cây từ Sư đoàn 5 trở xuống
- **Trung đoàn trưởng** (UnitID = E00008): Thấy cây từ Trung đoàn 4 trở xuống
- **Tiểu đoàn trưởng** (UnitID = D00014): Thấy cây từ Tiểu đoàn 14 trở xuống

## 📝 Cách sử dụng

### 1. Xem cây đơn vị
1. Click nút **"Cơ cấu đơn vị"** ở header
2. Modal mở ra hiển thị cây đơn vị
3. Cây được mở rộng hoàn toàn
4. Mỗi node hiển thị:
   - Icon theo cấp
   - Tên đơn vị
   - Tag màu hiển thị cấp

### 2. Thêm đơn vị con
1. Trong modal cây đơn vị, tìm đơn vị cha
2. Click nút **+** (màu xanh lá) bên cạnh tên đơn vị cha
3. Modal "Thêm đơn vị mới" hiện ra
4. Nhập tên đơn vị mới
5. Click **"Thêm"**

### 3. Sử dụng trong form thêm chiến sĩ
Sau này khi thêm chiến sĩ, có thể sử dụng cây đơn vị để chọn đơn vị:
- Thay vì Cascader, có thể dùng TreeSelect
- Dữ liệu lấy từ API /api/units

## 🛠️ Cài đặt

### 1. Copy các file

```bash
# API route
cp /workspace/output/app/api/units/route.ts app/api/units/route.ts

# Component
cp /workspace/output/components/UnitTree.tsx components/UnitTree.tsx

# Header (đã tích hợp)
cp /workspace/output/components/app-header.tsx components/app-header.tsx
```

### 2. Kiểm tra database

Đảm bảo bảng OrganizationUnit đã có dữ liệu:

```sql
-- Kiểm tra dữ liệu
SELECT * FROM OrganizationUnit ORDER BY HierarchyPath

-- Nếu chưa có, thêm dữ liệu mẫu
-- (Xem file SQL mẫu bên dưới)
```

### 3. Restart server

```bash
rm -rf .next
npm run dev
```

## 📊 Dữ liệu mẫu

### Script SQL tạo dữ liệu mẫu

```sql
-- Xóa dữ liệu cũ (cẩn thận!)
-- DELETE FROM OrganizationUnit

-- Sư đoàn 5
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('F00001', N'Sư đoàn 5', 1, NULL, '/F00001/')

-- Trung đoàn 4
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('E00008', N'Trung đoàn 4', 2, 'F00001', '/F00001/E00008/')

-- Trung đoàn 5
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('E00009', N'Trung đoàn 5', 2, 'F00001', '/F00001/E00009/')

-- Tiểu đoàn 14 (thuộc Trung đoàn 4)
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('D00014', N'Tiểu đoàn 14', 3, 'E00008', '/F00001/E00008/D00014/')

-- Tiểu đoàn 15 (thuộc Trung đoàn 4)
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('D00015', N'Tiểu đoàn 15', 3, 'E00008', '/F00001/E00008/D00015/')

-- Đại đội 1 (thuộc Tiểu đoàn 14)
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('C00001', N'Đại đội 1', 4, 'D00014', '/F00001/E00008/D00014/C00001/')

-- Đại đội 2 (thuộc Tiểu đoàn 14)
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('C00002', N'Đại đội 2', 4, 'D00014', '/F00001/E00008/D00014/C00002/')

-- Trung đội 1 (thuộc Đại đội 1)
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('P00001', N'Trung đội 1', 5, 'C00001', '/F00001/E00008/D00014/C00001/P00001/')

-- Tiểu đội 1 (thuộc Trung đội 1)
INSERT INTO OrganizationUnit (UnitID, UnitName, UnitLevel, ParentUnitID, HierarchyPath)
VALUES ('T00001', N'Tiểu đội 1', 6, 'P00001', '/F00001/E00008/D00014/C00001/P00001/T00001/')
```

## 🐛 Xử lý lỗi

### Lỗi: Không hiển thị cây đơn vị

**Nguyên nhân:**
- Chưa có dữ liệu trong bảng OrganizationUnit
- User chưa được gán UnitID

**Giải pháp:**
```sql
-- Kiểm tra dữ liệu
SELECT * FROM OrganizationUnit

-- Kiểm tra user
SELECT UserID, FullName, UnitID FROM [User]

-- Gán UnitID cho user
UPDATE [User] SET UnitID = 'F00001' WHERE UserID = 'U001'
```

### Lỗi: Không thêm được đơn vị

**Nguyên nhân:**
- Thiếu quyền (tham khảo Stored Procedure phân quyền)
- Đơn vị cha không tồn tại

**Giải pháp:**
- Kiểm tra console log để xem lỗi chi tiết
- Đảm bảo user có quyền thêm đơn vị

## 🔄 Tích hợp với chức năng khác

### 1. Form thêm chiến sĩ
Thay vì dùng Cascader với dữ liệu cứng, có thể dùng TreeSelect:

```typescript
import { TreeSelect } from 'antd'

<TreeSelect
  treeData={unitTreeData}
  value={unitId}
  onChange={setUnitId}
  placeholder="Chọn đơn vị"
  treeDefaultExpandAll
/>
```

### 2. Lọc chiến sĩ theo đơn vị
Sử dụng HierarchyPath để lọc:

```sql
-- Lọc tất cả chiến sĩ thuộc Sư đoàn 5 và các đơn vị con
SELECT * FROM Soldier s
INNER JOIN OrganizationUnit ou ON s.UnitID = ou.UnitID
WHERE ou.HierarchyPath LIKE '/F00001/%'
```

## 📚 Tài liệu tham khảo

- [Ant Design Tree](https://ant.design/components/tree)
- [Ant Design TreeSelect](https://ant.design/components/tree-select)
- [SQL Server Hierarchy](https://docs.microsoft.com/en-us/sql/relational-databases/hierarchyid-sql-server)

---

**Cập nhật lần cuối:** 2026-06-27  
**Phiên bản:** 1.0  
**Người tạo:** AI Assistant
