-- Convierte partido_reads de "una fila por árbitro" (visto/no visto) a un
-- historial real: cada confirmación queda como una fila nueva, sin pisar
-- la anterior. Necesario para permitir reconfirmar un partido ya visto.
-- (0003_partido_reads.sql ya viene actualizado para instalaciones nuevas;
-- esta migración es para bases que ya corrieron 0003 con el esquema viejo.)

alter table public.partido_reads add column if not exists id uuid not null default gen_random_uuid();
alter table public.partido_reads drop constraint if exists partido_reads_pkey;
alter table public.partido_reads add primary key (id);
create index if not exists partido_reads_partido_referee_idx on public.partido_reads (partido_id, referee_id);
