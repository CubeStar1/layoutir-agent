CREATE OR REPLACE FUNCTION execute_sql(query text) 
RETURNS jsonb 
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  clean_query text := rtrim(query, ';');
BEGIN
  EXECUTE 'SELECT jsonb_agg(t) FROM (' || clean_query || ') t' INTO result;
  RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

create table public.conversations (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  title text not null,
  lastContext jsonb null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint conversations_pkey primary key (id),
  constraint conversations_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_conversations_updated_at BEFORE
update on conversations for EACH row
execute FUNCTION update_updated_at ();

create table public.messages (
  id uuid not null default extensions.uuid_generate_v4 (),
  conversation_id uuid null,
  role text not null,
  parts jsonb not null,
  metadata jsonb null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint messages_pkey primary key (id),
  constraint messages_conversation_id_fkey foreign KEY (conversation_id) references conversations (id) on delete CASCADE
) TABLESPACE pg_default;

-- STORAGE BUCKETS SETUP --

-- 1. Create buckets if they don't exist
insert into storage.buckets (id, name, public) 
values 
  ('project-assets', 'project-assets', true),
  ('layoutir', 'layoutir', true)
on conflict (id) do nothing;

-- 2. Allow public read access (required for getPublicUrl to work for images)
create policy "Public Access for project-assets"
on storage.objects for select
to public
using ( bucket_id = 'project-assets' );

create policy "Public Access for layoutir"
on storage.objects for select
to public
using ( bucket_id = 'layoutir' );

-- 3. Allow authenticated users to upload files
create policy "Authenticated Uploads for project-assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'project-assets' );

create policy "Authenticated Uploads for layoutir"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'layoutir' );

-- 4. Allow users to delete their own uploads
create policy "Users can delete their own project-assets"
on storage.objects for delete
to authenticated
using ( bucket_id = 'project-assets' and auth.uid() = owner );

create policy "Users can delete their own layoutir"
on storage.objects for delete
to authenticated
using ( bucket_id = 'layoutir' and auth.uid() = owner );
