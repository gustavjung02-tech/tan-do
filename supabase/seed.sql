-- TAN-DO MVP seed data
-- Safe to run multiple times.

insert into public.products (name, sku, price, image_url, unit, is_active)
values
  ('Gạo thơm Tân Đô 5kg', 'TD-GAO-5KG', 92000, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=900&auto=format&fit=crop', 'túi', true),
  ('Nước mắm cá cơm 500ml', 'TD-NM-500', 38000, 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=900&auto=format&fit=crop', 'chai', true),
  ('Dầu ăn thực vật 1L', 'TD-DAU-1L', 52000, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=900&auto=format&fit=crop', 'chai', true),
  ('Đường tinh luyện 1kg', 'TD-DUONG-1KG', 26000, 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?q=80&w=900&auto=format&fit=crop', 'gói', true),
  ('Bột ngọt 400g', 'TD-BN-400', 34000, 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?q=80&w=900&auto=format&fit=crop', 'gói', true),
  ('Mì gói thùng 30 gói', 'TD-MI-30', 118000, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?q=80&w=900&auto=format&fit=crop', 'thùng', true)
on conflict (sku) do update
set
  name = excluded.name,
  price = excluded.price,
  image_url = excluded.image_url,
  unit = excluded.unit,
  is_active = excluded.is_active,
  updated_at = now();