-- Las categorías pasan a depender de la competencia (asociación/federación):
-- cada una define sus propias divisiones, y hasta puede repetir nombres con
-- otra (ej. "Juveniles" existe en AROB y en FBPSF, son categorías distintas).
-- (0001_init.sql ya viene con esta columna e índice desde el arranque; los
-- pasos de acá están protegidos para no romper una base que ya migró.)

alter table public.categories
  add column if not exists competition_id uuid references public.competitions(id) on delete set null;

drop index if exists categories_name_key;
create unique index if not exists categories_name_key on public.categories (competition_id, lower(name));

-- Si esta base ya tenía una categoría "Superliga" suelta (del viejo campo de
-- texto libre "competition", migrada en 0009/0010), la vinculamos a AROB en
-- vez de crear una fila duplicada.
do $link_superliga$
declare
  arob_id uuid;
begin
  select id into arob_id from public.competitions where lower(name) = lower('Asociación Rosarina de Básquet (AROB)');
  if arob_id is not null then
    update public.categories
    set competition_id = arob_id
    where competition_id is null and lower(name) = lower('Superliga');
  end if;
end;
$link_superliga$;

do $seed_categories$
declare
  arob_id uuid;
  fbpsf_id uuid;
  cab_id uuid;
begin
  select id into arob_id from public.competitions where lower(name) = lower('Asociación Rosarina de Básquet (AROB)');
  select id into fbpsf_id from public.competitions where lower(name) = lower('Federación de Básquet de la Provincia de Santa Fe (FBPSF)');
  select id into cab_id from public.competitions where lower(name) = lower('Confederación Argentina de Básquet (CAB)');

  if arob_id is not null then
    insert into public.categories (name, color, competition_id) values
      ('Superliga', '#8A6FD6', arob_id),
      ('Primera A', '#4E8FD6', arob_id),
      ('Primera B', '#7F77DD', arob_id),
      ('Primera C', '#D85A30', arob_id),
      ('Primera D', '#5DCAA5', arob_id),
      ('Liga Próximo', '#D4537E', arob_id),
      ('Juveniles', '#B4592E', arob_id),
      ('Cadetes', '#6B8E6B', arob_id),
      ('Infantiles', '#C77B3D', arob_id)
    on conflict (competition_id, lower(name)) do nothing;
  end if;

  if fbpsf_id is not null then
    insert into public.categories (name, color, competition_id) values
      ('Mayores masculino', '#4E8FD6', fbpsf_id),
      ('Mayores femenino', '#D4537E', fbpsf_id),
      ('Liga Próximo', '#7F77DD', fbpsf_id),
      ('Juveniles', '#B4592E', fbpsf_id),
      ('Cadetes', '#6B8E6B', fbpsf_id),
      ('Infantiles', '#C77B3D', fbpsf_id)
    on conflict (competition_id, lower(name)) do nothing;
  end if;

  if cab_id is not null then
    insert into public.categories (name, color, competition_id) values
      ('Liga Federal', '#4E8FD6', cab_id),
      ('Liga Nacional femenino', '#D4537E', cab_id),
      ('LFF Liga Próximo', '#7F77DD', cab_id),
      ('LFF Juveniles', '#B4592E', cab_id),
      ('LFF Cadetes', '#6B8E6B', cab_id),
      ('LFF Infantiles', '#C77B3D', cab_id)
    on conflict (competition_id, lower(name)) do nothing;
  end if;
end;
$seed_categories$;
