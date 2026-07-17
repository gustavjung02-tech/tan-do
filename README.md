# Tân Đô

## Google OAuth và Supabase Auth cấu hình

### Supabase Auth URL Configuration
- Site URL: đặt thành domain production thực tế.
- Additional Redirect URLs:
  - https://<production-domain>/auth/callback
  - http://localhost:3000/auth/callback
  - Nếu dùng preview deploy, thêm pattern tương ứng của Vercel preview.

### Google Cloud OAuth
- Authorized JavaScript origins: thêm production domain và http://localhost:3000.
- Authorized redirect URI: dùng callback của Supabase:
  - https://<project-ref>.supabase.co/auth/v1/callback

## Dữ liệu hành chính Việt Nam
- Chạy `npm run sync:locations` để cập nhật snapshot địa phương.
- Snapshot được lưu tại `data/vietnam-admin-units.json`.
