-- ============================================================
-- Baliza — Schema · Cole no SQL Editor do Supabase e execute
-- ============================================================

create table if not exists consultores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade unique,
  nome       text not null,
  empresa    text,
  criado_em  timestamptz default now()
);

create table if not exists licencas (
  id              uuid primary key default gen_random_uuid(),
  consultor_id    uuid references consultores(id) on delete cascade,
  cliente_nome    text not null,
  cliente_cnpj    text,
  tipo            text not null,
  numero          text,
  orgao           text,
  empreendimento  text,
  data_emissao    date,
  data_validade   date not null,
  observacoes     text,
  criado_em       timestamptz default now()
);

create table if not exists condicionantes (
  id           uuid primary key default gen_random_uuid(),
  licenca_id   uuid references licencas(id) on delete cascade,
  consultor_id uuid references consultores(id) on delete cascade,
  numero       int,
  descricao    text not null,
  prazo_data   date,
  status       text default 'pendente',
  criado_em    timestamptz default now()
);

-- RLS (cada consultor vê só os seus dados)
alter table consultores    enable row level security;
alter table licencas       enable row level security;
alter table condicionantes enable row level security;

create policy "own" on consultores    for all using (user_id = auth.uid());
create policy "own" on licencas       for all using (consultor_id in (select id from consultores where user_id = auth.uid()));
create policy "own" on condicionantes for all using (consultor_id in (select id from consultores where user_id = auth.uid()));
