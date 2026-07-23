-- Progreso de visualización de clips por árbitro: se usa para exigir, solo
-- en la PRIMERA confirmación de lectura de cada árbitro sobre cada partido,
-- que haya entrado en viewport (IntersectionObserver, del lado del cliente)
-- cada uno de los clips del partido antes de habilitar el botón de
-- "Confirmar que vi este informe". Reconfirmaciones posteriores no dependen
-- de esta tabla.

create table public.clip_views (
  clip_id uuid not null references public.clips(id) on delete cascade,
  referee_id uuid not null references public.referees(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (clip_id, referee_id)
);
create index clip_views_referee_idx on public.clip_views (referee_id);

alter table public.clip_views enable row level security;

-- lectura: coordinador/instructor ven todo; un árbitro solo ve su propio
-- progreso (es lo único que necesita para calcular "Viste X de Y clips").
create policy clip_views_select on public.clip_views
  for select using (
    public.is_evaluator() or referee_id = public.my_referee_id()
  );

-- solo se puede registrar la propia visualización, y solo sobre un clip de
-- un partido que efectivamente le corresponde ver (finalizado + asignado).
create policy clip_views_insert on public.clip_views
  for insert with check (
    referee_id = public.my_referee_id()
    and exists (
      select 1 from public.clips c
      where c.id = clip_id and public.partido_visible_to_arbitro(c.partido_id)
    )
  );

-- inmutable: sin policies de update/delete.
