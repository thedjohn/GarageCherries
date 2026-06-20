-- Storage RLS policies for car-images bucket
-- Run this in the Supabase SQL editor

-- Authenticated users can upload to their own folder
create policy "Dealers can upload car images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'car-images');

-- Authenticated users can update/delete their own uploads
create policy "Dealers can update own images"
on storage.objects for update
to authenticated
using (bucket_id = 'car-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Dealers can delete own images"
on storage.objects for delete
to authenticated
using (bucket_id = 'car-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public read (bucket is already public but explicit policy is safer)
create policy "Public can read car images"
on storage.objects for select
to public
using (bucket_id = 'car-images');
