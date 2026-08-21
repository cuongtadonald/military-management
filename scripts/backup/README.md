# Hướng dẫn Backup và Restore dữ liệu

## Tổng quan

Hệ thống backup bao gồm:
- **Backup Database**: Toàn bộ dữ liệu SQL Server (các bảng, dữ liệu quân nhân, tài liệu, etc.)
- **Backup Files**: Avatar quân nhân, file tài liệu upload trong chức năng "Tài liệu quân lực"

## Lịch backup tự động

- **Tần suất**: Ngày 1 hàng tháng lúc 02:00 AM
- **Thời gian lưu trữ**: 6 tháng (tự động xóa backup cũ hơn 6 tháng)
- **Thư mục backup**: `C:\QuanLyQuanLuc_Backups`

## Cấu trúc thư mục backup

```
C:\QuanLyQuanLuc_Backups\
├── Database\                    # Backup SQL Server
│   ├── QlyQuanLuc_20260801_020000.bak
│   ├── QlyQuanLuc_20260901_020000.bak
│   └── ...
├── Files\                       # Backup files uploads
│   ├── 20260801_020000\
│   │   ├── uploads\            # Avatar + Tài liệu quân lực
│   │   └── public\             # Ảnh, icons
│   └── ...
└── backup.log                   # Log file
```

## Backup thủ công

### Cách 1: Qua giao diện web

1. Đăng nhập với tài khoản Admin (U002)
2. Vào menu **Quản lý Backup**
3. Chọn loại backup:
   - **Backup toàn bộ**: Database + Files
   - **Backup Database**: Chỉ database
   - **Backup Files**: Chỉ avatar + tài liệu upload

### Cách 2: Qua script

Mở Command Prompt với quyền Administrator và chạy:

```cmd
cd C:\QuanLyQuanLuc\scripts\backup
backup-all.bat
```

## Cài đặt lịch backup tự động

Nếu chưa có lịch backup tự động, chạy script sau với quyền Administrator:

```cmd
cd C:\QuanLyQuanLuc\scripts\backup
setup-scheduler.bat
```

Script sẽ tạo Windows Task Scheduler để tự động backup vào ngày 1 hàng tháng lúc 02:00 AM.

## Kiểm tra Task Scheduler

Mở Command Prompt và chạy:

```cmd
schtasks /query /tn "QuanLyQuanLuc_MonthlyBackup" /v
```

## Khôi phục dữ liệu (Restore)

### Restore Database

1. Mở Command Prompt với quyền Administrator
2. Chạy script:

```cmd
cd C:\QuanLyQuanLuc\scripts\backup
restore-database.bat
```

3. Chọn backup cần restore từ danh sách
4. Gõ `YES` để xác nhận

**Lưu ý**: Restore sẽ ghi đè lên database hiện tại!

### Restore Files

Copy thư mục backup từ `C:\QuanLyQuanLuc_Backups\Files\<timestamp>\uploads\` vào `C:\QuanLyQuanLuc\public\uploads\`

```cmd
xcopy "C:\QuanLyQuanLuc_Backups\Files\20260801_020000\uploads\*" "C:\QuanLyQuanLuc\public\uploads\" /E /I /H /Y
```

## Xóa backup cũ

### Qua giao diện web

1. Vào menu **Quản lý Backup**
2. Tìm backup cần xóa
3. Click nút **Xóa** (icon thùng rác)

### Thủ công

Xóa file/thư mục trong `C:\QuanLyQuanLuc_Backups\`

## Cấu hình

### Thay đổi đường dẫn backup

Mở file `.env.local` và thêm:

```env
BACKUP_PATH=D:\Backup\QuanLyQuanLuc
```

### Thay đổi lịch backup

1. Mở Task Scheduler
2. Tìm task **QuanLyQuanLuc_MonthlyBackup**
3. Click **Properties** → **Triggers** → **Edit**
4. Thay đổi lịch theo ý muốn

### Thay đổi thời gian lưu trữ backup

Mở file `scripts\backup\backup-all.bat` và sửa dòng:

```cmd
forfiles /P "%BACKUP_ROOT%\Files" /D -180 /C "cmd /c rmdir /S /Q @path"
```

Thay `-180` (180 ngày = 6 tháng) bằng số ngày mong muốn.

## Xử lý sự cố

### Backup thất bại

1. Kiểm tra log file: `C:\QuanLyQuanLuc_Backups\backup.log`
2. Đảm bảo SQL Server đang chạy
3. Kiểm tra quyền ghi vào thư mục backup
4. Kiểm tra dung lượng ổ đĩa

### Không thể restore

1. Đảm bảo file backup không bị hỏng
2. Kiểm tra kết nối SQL Server
3. Đảm bảo có đủ dung lượng ổ đĩa
4. Thử restore trên máy test trước

### Task Scheduler không chạy

1. Kiểm tra task có tồn tại: `schtasks /query /tn "QuanLyQuanLuc_MonthlyBackup"`
2. Chạy lại script cài đặt: `setup-scheduler.bat`
3. Kiểm tra Windows Event Viewer để xem lỗi

## Liên hệ

Nếu gặp vấn đề, vui lòng liên hệ bộ phận IT để được hỗ trợ.
