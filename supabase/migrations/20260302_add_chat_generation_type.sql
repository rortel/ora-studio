alter table public.generations drop constraint if exists generations_type_check;
alter table public.generations add constraint generations_type_check
  check (type in ('text', 'code', 'image', 'video', 'chat'));
