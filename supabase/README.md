# Supabase setup notes

Hiện tại project chưa cần Supabase local CLI hoặc Docker.

Khi anh tạo Supabase project thật:

1. Mở Supabase SQL Editor.
2. Chạy file `supabase/migrations/001_init_schema.sql`.
3. Chạy file `supabase/seed.sql` để có sản phẩm mẫu.
4. Copy env vào `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Ghi chú:

- `order_items` lưu snapshot `product_name`, `unit_price`, `quantity`, `line_total` để đơn cũ không bị sai khi sản phẩm đổi giá/tên.
- RLS đã bật cho 4 bảng chính.
- Policy MVP hiện đủ cho customer/sales/admin, nhưng khi nối app thật cần test lại bằng user role thật.