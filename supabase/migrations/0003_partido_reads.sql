-- Confirmación de lectura del informe: un árbitro asignado a un partido
-- finalizado puede confirmar explícitamente ("Confirmar que vi este informe")
-- que vio el informe. Queda registrado quién y cuándo. No se marca solo al
-- abrir el partido — requiere que el árbitro toque el botón a propósito.
--
-- Es un historial, no un flag: cada confirmación es una fila nueva (no pisa
-- la anterior). La primera confirmación de cada árbitro sobre cada partido
-- exige haber visto todos los clips (ver clip_views en 0007); las siguientes
-- quedan libres.

create table public.partido_reads (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  referee_id uuid not null references public.referees(id) on delete cascade,
  confirmed_by uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now()
);
create index partido_reads_partido_referee_idx on public.partido_reads (partido_id, referee_id);

alter table public.partido_reads enable row level security;

-- lectura: coordinador/instructor ven todo; un árbitro ve las confirmaciones
-- de cualquier partido que ya puede ver (finalizado y asignado a la terna).
create policy partido_reads_select on public.partido_reads
  for select using (
    public.is_evaluator() or public.partido_visible_to_arbitro(partido_id)
  );

-- solo se puede confirmar la propia lectura (no en nombre de otro árbitro),
-- y solo sobre un partido que efectivamente le corresponde ver (finalizado +
-- asignado). Coordinador/instructor no insertan acá: es una autoconfirmación.
create policy partido_reads_insert on public.partido_reads
  for insert with check (
    confirmed_by = auth.uid()
    and referee_id = public.my_referee_id()
    and public.partido_visible_to_arbitro(partido_id)
  );

-- inmutable: sin policies de update/delete, nadie puede modificarla o
-- borrarla (ni siquiera coordinador) — RLS deniega por defecto sin policy.
-- (no hay unique constraint sobre partido_id+referee_id a propósito: permite
-- múltiples confirmaciones en el tiempo, es un historial.)
