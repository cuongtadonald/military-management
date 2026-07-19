# Hướng dẫn hiển thị ảnh chiến sĩ

## 1. Cấu trúc thư mục ảnh

```
your-project/
├── public/
│   └── images/
│       └── soldiers/
│           ├── default.png          # Ảnh mặc định khi không có ảnh
│           ├── SLD-1001.jpg         # Ảnh chiến sĩ SLD-1001
│           ├── SLD-1002.jpg         # Ảnh chiến sĩ SLD-1002
│           └── ...
```

## 2. Cách đặt tên file ảnh

**Quy tắc:** Đặt tên file ảnh trùng với `SoldierID` trong database

Ví dụ:
- Chiến sĩ có `SoldierID = 'SLD-1001'` → File ảnh: `SLD-1001.jpg`
- Chiến sĩ có `SoldierID = 'SLD-1002'` → File ảnh: `SLD-1002.png`

**Định dạng hỗ trợ:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

## 3. Cập nhật đường dẫn ảnh trong database

### Cách 1: Lưu đường dẫn tương đối (Khuyến nghị)

Trong bảng `Soldier`, cập nhật trường `PhotoPath`:

```sql
-- Cập nhật đường dẫn ảnh cho các chiến sĩ
UPDATE Soldier 
SET PhotoPath = '/images/soldiers/SLD-1001.jpg'
WHERE SoldierID = 'SLD-1001'

UPDATE Soldier 
SET PhotoPath = '/images/soldiers/SLD-1002.jpg'
WHERE SoldierID = 'SLD-1002'

-- Hoặc cập nhật hàng loạt
UPDATE Soldier 
SET PhotoPath = '/images/soldiers/' + SoldierID + '.jpg'
```

### Cách 2: Chỉ lưu tên file

Nếu chỉ lưu tên file trong database:

```sql
UPDATE Soldier 
SET PhotoPath = 'SLD-1001.jpg'
WHERE SoldierID = 'SLD-1001'
```

Sau đó trong code, bạn cần nối thêm đường dẫn:

```typescript
// Trong app/page.tsx, sửa cột Ảnh:
{
  title: "Ảnh",
  dataIndex: "PhotoPath",
  key: "PhotoPath",
  width: 70,
  render: (photo: string, record) => (
    <Avatar 
      src={photo ? `/images/soldiers/${photo}` : "/images/soldiers/default.png"} 
      size={40} 
      shape="square" 
    />
  ),
}
```

## 4. Tạo ảnh mặc định

Tạo file `public/images/soldiers/default.png` với:
- Kích thước: 100x100 pixels
- Nội dung: Icon người mặc định hoặc logo quân đội

Bạn có thể tải ảnh mặc định từ:
- https://www.flaticon.com/free-icons/user
- https://icons8.com/icons/set/user

## 5. Script cập nhật đường dẫn ảnh hàng loạt

Tạo file `scripts/update-photo-paths.sql`:

```sql
-- Script cập nhật đường dẫn ảnh cho tất cả chiến sĩ
-- Chạy trong SQL Server Management Studio

USE QlyQuanLuc
GO

-- Cách 1: Nếu PhotoPath chưa có giá trị
UPDATE Soldier 
SET PhotoPath = '/images/soldiers/' + SoldierID + '.jpg'
WHERE PhotoPath IS NULL OR PhotoPath = ''

-- Cách 2: Nếu muốn cập nhật tất cả (cẩn thận!)
-- UPDATE Soldier 
-- SET PhotoPath = '/images/soldiers/' + SoldierID + '.jpg'

-- Kiểm tra kết quả
SELECT SoldierID, FullName, PhotoPath 
FROM Soldier 
ORDER BY SoldierID
```

## 6. Kiểm tra ảnh đã hiển thị chưa

### Bước 1: Copy ảnh vào thư mục
Copy tất cả ảnh chiến sĩ vào thư mục `public/images/soldiers/`

### Bước 2: Kiểm tra đường dẫn
Mở trình duyệt và truy cập:
```
http://localhost:3000/images/soldiers/SLD-1001.jpg
```

Nếu ảnh hiển thị → Đường dẫn đúng ✅

Nếu báo lỗi 404 → Kiểm tra lại:
- Tên file có đúng không?
- Thư mục có tồn tại không?
- Đường dẫn trong database có đúng không?

### Bước 3: Kiểm tra trong ứng dụng
Mở ứng dụng và kiểm tra cột Ảnh trong bảng danh sách chiến sĩ.

## 7. Xử lý lỗi khi không có ảnh

Code hiện tại đã xử lý 3 trường hợp:

```typescript
<Avatar 
  src={photo || "/images/soldiers/default.png"} 
  size={40} 
  shape="square" 
/>
```

1. **Có ảnh** → Hiển thị ảnh từ `photo`
2. **Không có ảnh** → Hiển thị ảnh mặc định `default.png`
3. **Ảnh bị lỗi** → Avatar sẽ hiển thị icon mặc định

## 8. Tối ưu ảnh

### Resize ảnh
Sử dụng tool online hoặc phần mềm để resize ảnh về kích thước chuẩn:
- Kích thước khuyến nghị: 200x200 pixels
- Dung lượng: < 100KB
- Định dạng: JPG (cho ảnh chụp), PNG (cho ảnh có nền trong suốt)

### Tool khuyến nghị:
- **Online:** https://www.iloveimg.com/resize-image
- **Windows:** Paint, IrfanView
- **Mac:** Preview, Photoshop
- **Batch processing:** XnConvert (miễn phí)

## 9. Upload ảnh qua giao diện (Tương lai)

Khi cần tính năng upload ảnh qua giao diện web, bạn cần:

1. Tạo API endpoint để nhận file upload
2. Lưu file vào thư mục `public/images/soldiers/`
3. Cập nhật đường dẫn vào database

Ví dụ API endpoint:

```typescript
// app/api/soldiers/[id]/upload-photo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const formData = await request.formData();
  const file = formData.get('photo') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${params.id}${path.extname(file.name)}`;
  const filepath = path.join(process.cwd(), 'public/images/soldiers', filename);
  
  await writeFile(filepath, buffer);
  
  // Cập nhật đường dẫn vào database
  // ...

  return NextResponse.json({ 
    success: true, 
    photoPath: `/images/soldiers/${filename}` 
  });
}
```

## 10. Troubleshooting

### Lỗi: Ảnh không hiển thị
- Kiểm tra Console (F12) để xem lỗi 404
- Kiểm tra đường dẫn trong database có bắt đầu bằng `/` không
- Kiểm tra file ảnh có tồn tại trong thư mục `public/images/soldiers/` không

### Lỗi: Ảnh bị vỡ
- Kiểm tra định dạng ảnh có được hỗ trợ không
- Kiểm tra dung lượng ảnh có quá lớn không
- Thử resize ảnh về kích thước nhỏ hơn

### Lỗi: Ảnh mặc định không hiển thị
- Kiểm tra file `default.png` có tồn tại không
- Kiểm tra đường dẫn `/images/soldiers/default.png` có đúng không

## 11. Ví dụ hoàn chỉnh

### Cấu trúc thư mục:
```
public/
└── images/
    └── soldiers/
        ├── default.png
        ├── SLD-1001.jpg
        ├── SLD-1002.jpg
        └── SLD-1003.jpg
```

### Database:
```sql
SELECT SoldierID, FullName, PhotoPath FROM Soldier

-- Kết quả:
-- SLD-1001 | Nguyễn Văn A | /images/soldiers/SLD-1001.jpg
-- SLD-1002 | Trần Văn B   | /images/soldiers/SLD-1002.jpg
-- SLD-1003 | Lê Văn C     | NULL
```

### Hiển thị:
- SLD-1001: Hiển thị ảnh `SLD-1001.jpg`
- SLD-1002: Hiển thị ảnh `SLD-1002.jpg`
- SLD-1003: Hiển thị ảnh `default.png`
