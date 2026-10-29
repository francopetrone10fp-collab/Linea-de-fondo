-- Nota opcional para un monto manual de Liquidaciones, aparte del concepto
-- (ej. concepto "Amistoso vs Rosario Central", nota "A pedido del club, no
-- se pudo cargar como designación oficial"). Se usa en el desglose por
-- árbitro de Liquidaciones.
alter table public.liquidaciones_manuales add column if not exists nota text;
