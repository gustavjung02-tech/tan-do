-- Supabase/PostgREST upsert needs a non-partial unique index for onConflict.

create unique index if not exists products_source_catalog_source_key_unique
  on public.products(source_catalog, source_key);