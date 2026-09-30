-- Daakhla: schema, row-level security and the public registration RPC.
--
-- Access model
--   * Students never sign in. They open a region's link (/r/<code>) and submit
--     through `submit_registration`, which files the row under that region.
--   * Admins sign in with Supabase Auth. Each has a scope: 'all' (super admin)
--     or one province code. RLS limits students and links to that scope.
--   * New admins are created by the `create-admin` edge function (needs the
--     service role to create auth users); only super admins may call it.

create table public.provinces (
  code text primary key,
  name text not null
);

create table public.cities (
  province text not null references public.provinces(code),
  name text not null,
  primary key (province, name)
);

create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  scope text not null check (scope = 'all' or scope in ('PB','SD','KP','BL','IS','GB','AJ')),
  created_at timestamptz not null default now()
);

create table public.registration_links (
  code text primary key,
  province text not null references public.provinces(code),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Per-province, per-year sequence behind IDs like PB-26-0017.
create table public.registration_counters (
  province text not null references public.provinces(code),
  yy text not null,
  last_seq int not null default 0,
  primary key (province, yy)
);

create table public.students (
  id text primary key,
  province text not null references public.provinces(code),
  link_code text references public.registration_links(code),
  full_name text not null,
  father_name text not null,
  cnic text not null,
  dob date not null,
  gender text not null check (gender in ('Female','Male')),
  phone text not null,
  email text not null,
  city text not null,
  address text not null,
  level text not null check (level in ('Matric','Intermediate','Bachelor''s','Master''s')),
  program text not null check (program in ('Computer Science','Engineering','Medical','Business','Arts & Humanities')),
  institution text not null,
  marks numeric(5,2) not null check (marks between 0 and 100),
  status text not null default 'Pending' check (status in ('Pending','Verified')),
  created_at timestamptz not null default now(),
  foreign key (province, city) references public.cities(province, name)
);
create index students_province_idx on public.students (province, created_at desc);

-- Seed reference data --------------------------------------------------------

insert into public.provinces (code, name) values
  ('PB','Punjab'), ('SD','Sindh'), ('KP','Khyber Pakhtunkhwa'), ('BL','Balochistan'),
  ('IS','Islamabad Capital Territory'), ('GB','Gilgit-Baltistan'), ('AJ','Azad Jammu & Kashmir');

insert into public.cities (province, name) values
  ('PB','Lahore'), ('PB','Rawalpindi'), ('PB','Faisalabad'), ('PB','Multan'), ('PB','Gujranwala'),
  ('SD','Karachi'), ('SD','Hyderabad'), ('SD','Sukkur'), ('SD','Larkana'),
  ('KP','Peshawar'), ('KP','Abbottabad'), ('KP','Mardan'), ('KP','Swat'),
  ('BL','Quetta'), ('BL','Gwadar'), ('BL','Turbat'),
  ('IS','Islamabad'),
  ('GB','Gilgit'), ('GB','Skardu'), ('GB','Hunza'),
  ('AJ','Muzaffarabad'), ('AJ','Mirpur');

-- Replace these codes with fresh random ones for production if you like; the
-- frontend reads them from this table.
insert into public.registration_links (code, province) values
  ('pb-7k2q','PB'), ('sd-4m9x','SD'), ('kp-2r8t','KP'), ('bl-9c3v','BL'),
  ('is-5h1w','IS'), ('gb-8n6p','GB'), ('aj-3d7z','AJ');

-- Helpers --------------------------------------------------------------------

create function public.current_admin_scope() returns text
language sql stable security definer set search_path = public as $$
  select scope from public.admins where id = auth.uid()
$$;

create function public.can_see_province(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select scope = 'all' or scope = p from public.admins where id = auth.uid()), false)
$$;

-- Row-level security ---------------------------------------------------------

alter table public.provinces enable row level security;
alter table public.cities enable row level security;
alter table public.admins enable row level security;
alter table public.registration_links enable row level security;
alter table public.registration_counters enable row level security;
alter table public.students enable row level security;

create policy "reference data is public" on public.provinces for select using (true);
create policy "reference data is public" on public.cities for select using (true);

create policy "admins can see the admin list" on public.admins
  for select to authenticated using (public.current_admin_scope() is not null);

create policy "admins see links for their regions" on public.registration_links
  for select to authenticated using (public.can_see_province(province));

create policy "admins see students in their regions" on public.students
  for select to authenticated using (public.can_see_province(province));

create policy "admins update students in their regions" on public.students
  for update to authenticated
  using (public.can_see_province(province))
  with check (public.can_see_province(province));

-- Admins may only change a student's status; inserts go through the RPC below.
revoke insert, update, delete on public.students from anon, authenticated;
grant update (status) on public.students to authenticated;
revoke insert, update, delete on public.admins, public.registration_links, public.registration_counters from anon, authenticated;

-- Public RPCs ----------------------------------------------------------------

create function public.resolve_link(p_code text)
returns table (code text, province text)
language sql stable security definer set search_path = public as $$
  select l.code, l.province from public.registration_links l where l.code = p_code and l.active
$$;

create function public.submit_registration(p_code text, p jsonb)
returns public.students
language plpgsql volatile security definer set search_path = public as $$
declare
  v_province text;
  v_yy text := to_char(now(), 'YY');
  v_seq int;
  v_marks numeric;
  v_row public.students;
begin
  select province into v_province from public.registration_links where code = p_code and active;
  if v_province is null then
    raise exception 'This registration link is not valid' using errcode = 'P0001';
  end if;

  -- Mirrors src/data/validate.ts.
  if length(trim(coalesce(p->>'full_name', ''))) < 3
     or trim(coalesce(p->>'father_name', '')) = ''
     or length(regexp_replace(coalesce(p->>'cnic', ''), '\D', '', 'g')) <> 13
     or coalesce(p->>'dob', '') = ''
     or regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g') !~ '^03\d{9}$'
     or coalesce(p->>'email', '') !~ '^\S+@\S+\.\S+$'
     or length(trim(coalesce(p->>'address', ''))) < 5
     or trim(coalesce(p->>'institution', '')) = ''
     or coalesce(p->>'marks', '') !~ '^\d+(\.\d+)?$'
  then
    raise exception 'Some details are missing or invalid' using errcode = 'P0001';
  end if;
  v_marks := (p->>'marks')::numeric;
  if v_marks > 100 then
    raise exception 'Some details are missing or invalid' using errcode = 'P0001';
  end if;

  insert into public.registration_counters as c (province, yy, last_seq) values (v_province, v_yy, 1)
  on conflict (province, yy) do update set last_seq = c.last_seq + 1
  returning last_seq into v_seq;

  -- gender / city / level / program are enforced by table constraints.
  insert into public.students (id, province, link_code, full_name, father_name, cnic, dob, gender, phone, email,
                               city, address, level, program, institution, marks)
  values (v_province || '-' || v_yy || '-' || lpad(v_seq::text, 4, '0'), v_province, p_code,
          trim(p->>'full_name'), trim(p->>'father_name'), p->>'cnic', (p->>'dob')::date, p->>'gender',
          p->>'phone', trim(p->>'email'), p->>'city', trim(p->>'address'), p->>'level', p->>'program',
          trim(p->>'institution'), v_marks)
  returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.submit_registration(text, jsonb) from public;
revoke execute on function public.resolve_link(text) from public;
grant execute on function public.submit_registration(text, jsonb) to anon, authenticated;
grant execute on function public.resolve_link(text) to anon, authenticated;
