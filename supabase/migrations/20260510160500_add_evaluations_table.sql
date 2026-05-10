-- Create the evaluations table
create table if not exists public.evaluations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  clarity integer default 0,
  business_model integer default 0,
  traction integer default 0,
  financials integer default 0,
  pitch integer default 0,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  author_id uuid references auth.users(id)
);

-- Enable Row Level Security
alter table public.evaluations enable row level security;

-- Create policy to allow admins to manage evaluations
create policy "Admins can manage evaluations"
  on public.evaluations
  for all
  using ( auth.jwt() ->> 'role' = 'service_role' or exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));
