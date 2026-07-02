-- 02-seed.sql — GENERADO por gen_seed_sql.py desde reglas_mx.json. NO EDITAR A MANO.
-- source_version: LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07
-- Idempotente: upserts sobre claves naturales (reseed real = volumen virgen).
begin;

insert into jurisdicciones (codigo, nombre) values ('MX', 'Mexico')
  on conflict (codigo) do update set nombre = excluded.nombre;

insert into dimensiones (codigo, nombre) values ('fiscal', 'Fiscal (deducibilidad de gastos)')
  on conflict (codigo) do update set nombre = excluded.nombre;

insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('VIATICOS', 'Viaticos y gastos de viaje', 'Hospedaje, alimentacion, transporte y kilometraje fuera de la faja de 50 km', array['viatico', 'viaticos', 'hospedaje', 'hotel', 'vuelo', 'avion', 'boleto de avion', 'viaje', 'peaje', 'taxi', 'uber', 'transporte foraneo', 'kilometraje']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('SERVICIOS_PROFESIONALES', 'Servicios profesionales y honorarios', 'Honorarios, consultoria y servicios independientes', array['honorarios', 'consultoria', 'asesoria', 'servicios profesionales', 'servicio profesional', 'abogado', 'contador', 'notario', 'diseno', 'desarrollo de software', 'freelance']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('EQUIPO_DE_COMPUTO', 'Equipo de computo', 'Computadoras, servidores, perifericos (inversion, no gasto)', array['computadora', 'laptop', 'servidor', 'monitor', 'impresora', 'teclado', 'equipo de computo', 'macbook', 'pc de escritorio', 'disco duro', 'memoria ram']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('DONATIVOS', 'Donativos', 'Donativos a donatarias autorizadas', array['donativo', 'donativos', 'donacion', 'donaciones']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('INTERESES', 'Intereses y financiamiento', 'Intereses de prestamos y creditos del negocio', array['interes', 'intereses', 'interes moratorio', 'financiamiento', 'credito', 'prestamo']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('COMBUSTIBLES', 'Combustibles', 'Gasolina y diesel para vehiculos del negocio', array['gasolina', 'diesel', 'combustible', 'magna', 'premium', 'carga de combustible']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('ARRENDAMIENTO', 'Arrendamiento', 'Rentas de inmuebles, autos y equipos', array['renta', 'arrendamiento', 'alquiler', 'renta de oficina', 'renta de local', 'renta de auto', 'leasing']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-I', 'MX', 'fiscal', 'Estricta indispensabilidad y donativos', 'Las deducciones deben ser estrictamente indispensables para los fines de la actividad del contribuyente, salvo donativos no onerosos ni remunerativos a donatarias autorizadas, deducibles hasta el 7% de la utilidad fiscal del ejercicio anterior.',
   'LISR Art. 27, fraccion I', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'PM_TITULO_II', null,
         null, null,
         '["El gasto es estrictamente indispensable para la actividad del negocio"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LISR-27-I'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DONATIVOS', 'PM_TITULO_II', 'dudoso',
         null, 7.0,
         '["La donataria esta en el listado de autorizadas del SAT vigente", "CFDI de donativo", "No excede 7% de la utilidad fiscal del ejercicio anterior"]'::jsonb, '[]'::jsonb, '{"base_tope": "utilidad fiscal del ejercicio anterior", "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-27-I'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-III', 'MX', 'fiscal', 'CFDI y medios de pago electronicos', 'Deducciones amparadas con CFDI; pagos cuyo monto exceda $2,000 MXN deben efectuarse mediante transferencia, cheque nominativo, tarjeta o monedero electronico. Los combustibles para vehiculos deben pagarse con esos medios AUNQUE no excedan $2,000.',
   'LISR Art. 27, fraccion III', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'PM_TITULO_II', null,
         null, null,
         '["Existe CFDI valido que ampara el gasto", "Si el pago excede $2,000 MXN, se pago con medio electronico (transferencia/cheque/tarjeta/monedero)"]'::jsonb, '[]'::jsonb, '{"umbral_pago_electronico_mxn": 2000, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-27-III'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'COMBUSTIBLES', 'PM_TITULO_II', 'dudoso',
         null, null,
         '["Pagado con medio electronico SIN importar el monto (efectivo = no deducible)", "CFDI con complemento correspondiente"]'::jsonb, '["Combustible: si se pago en efectivo NO es deducible (LISR 27-III)"]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LISR-27-III'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-V', 'MX', 'fiscal', 'Retenciones a terceros (honorarios)', 'Cumplir obligaciones de retencion y entero de impuestos a cargo de terceros. Honorarios pagados a personas fisicas: retencion del 10% de ISR.',
   'LISR Art. 27, fraccion V (y Art. 106 ultimo parrafo)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'SERVICIOS_PROFESIONALES', 'PM_TITULO_II', 'deducible',
         null, null,
         '["CFDI de honorarios", "Si el prestador es persona fisica: retencion de 10% ISR efectuada y enterada", "Pago efectivamente erogado en el ejercicio (Art. 27 fracc. VIII)"]'::jsonb, '[]'::jsonb, '{"retencion_isr_pf_pct": 10, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-27-V'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-VII', 'MX', 'fiscal', 'Intereses por capitales tomados en prestamo', 'Intereses deducibles cuando el capital tomado en prestamo se invierta en los fines del negocio.',
   'LISR Art. 27, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'INTERESES', 'PM_TITULO_II', 'deducible',
         null, null,
         '["El capital del prestamo se destino a los fines del negocio (documentar destino)", "CFDI o estado de cuenta que ampare los intereses"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LISR-27-VII'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-28-V', 'MX', 'fiscal', 'Viaticos: topes y faja de 50 km', 'Viaticos no deducibles salvo que se destinen a hospedaje, alimentacion, transporte, uso de automovil y kilometraje, aplicados fuera de una faja de 50 km del establecimiento, y el beneficiario tenga relacion de trabajo o preste servicios profesionales. Topes diarios: alimentacion $750 nacional / $1,500 extranjero; hospedaje extranjero $3,850; renta de autos $850.',
   'LISR Art. 28, fraccion V', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'VIATICOS', 'PM_TITULO_II', 'dudoso',
         null, null,
         '["Erogado fuera de la faja de 50 km del establecimiento", "Beneficiario con relacion laboral o de servicios profesionales", "CFDI de cada erogacion", "Dentro de los topes diarios por concepto"]'::jsonb, '[]'::jsonb, '{"tope_alimentacion_nacional_dia": 750, "tope_alimentacion_extranjero_dia": 1500, "tope_hospedaje_extranjero_dia": 3850, "tope_renta_auto_dia": 850, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-28-V'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-28-XIII', 'MX', 'fiscal', 'Renta de automoviles, aviones y casas habitacion', 'Renta de automoviles deducible hasta $200 diarios por unidad ($285 si es electrico/hibrido); renta de aviones/embarcaciones y casas habitacion solo con requisitos reglamentarios.',
   'LISR Art. 28, fraccion XIII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2017-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'ARRENDAMIENTO', 'PM_TITULO_II', 'dudoso',
         null, null,
         '["Si es renta de automovil: dentro del tope diario y el vehiculo es estrictamente indispensable", "Si es inmueble de uso del negocio (oficina/local): CFDI de arrendamiento con retenciones aplicables", "Si es casa habitacion/avion/embarcacion: cumplir requisitos del RLISR (alta probabilidad de NO deducible)"]'::jsonb, '[]'::jsonb, '{"tope_renta_auto_dia": 200, "tope_renta_auto_electrico_dia": 285, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-28-XIII'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-28-XXVII', 'MX', 'fiscal', 'Capitalizacion delgada (partes relacionadas extranjeras)', 'No deducibles los intereses de deudas con partes relacionadas residentes en el extranjero que excedan la proporcion deuda/capital de 3:1.',
   'LISR Art. 28, fraccion XXVII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'INTERESES', 'PM_TITULO_II', 'dudoso',
         null, null,
         '["Si el acreedor es parte relacionada extranjera: verificar que la deuda no excede 3 veces el capital contable"]'::jsonb, '[]'::jsonb, '{"ratio_deuda_capital": "3:1", "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-28-XXVII'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-28-XXXII', 'MX', 'fiscal', 'Limitacion de intereses netos (30% utilidad fiscal ajustada)', 'Intereses netos del ejercicio que excedan el 30% de la utilidad fiscal ajustada no son deducibles; aplica cuando los intereses netos exceden $20,000,000.',
   'LISR Art. 28, fraccion XXXII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2020-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'INTERESES', 'PM_TITULO_II', null,
         null, 30.0,
         '["Si los intereses netos anuales exceden $20M MXN: revisar limite del 30% de utilidad fiscal ajustada"]'::jsonb, '[]'::jsonb, '{"umbral_intereses_netos_mxn": 20000000, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-28-XXXII'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-34-VII', 'MX', 'fiscal', 'Equipo de computo: inversion con depreciacion 30%', 'El equipo de computo es INVERSION, no gasto: se deduce via depreciacion con tasa maxima anual del 30% (computadoras, servidores, impresoras).',
   'LISR Arts. 31-34; Art. 34, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'EQUIPO_DE_COMPUTO', 'PM_TITULO_II', 'dudoso',
         null, 30.0,
         '["Registrar como inversion (activo fijo), no como gasto del ejercicio", "Deducir via depreciacion: maximo 30% anual", "CFDI a nombre del contribuyente"]'::jsonb, '["Equipo de computo: no es deducible al 100% como gasto directo; es inversion con depreciacion 30% anual (LISR 34-VII)"]'::jsonb, '{"tasa_depreciacion_anual_pct": 30, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LISR-34-VII'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CFF-29A', 'MX', 'fiscal', 'Requisitos de los CFDI', 'Todo comprobante debe ser CFDI con los requisitos del 29-A (RFC emisor/receptor, uso de CFDI, forma y metodo de pago). Sin CFDI valido no hay deduccion.',
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'PM_TITULO_II', null,
         null, null,
         '["CFDI vigente (no cancelado) con requisitos del Art. 29-A CFF", "Uso de CFDI congruente con el gasto"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CFF-29A'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-SAT-CRIT-VIATICOS', 'MX', 'fiscal', 'Criterio SAT: relacion laboral en viaticos', 'Para la deducibilidad, los viaticos deben corresponder a personas con relacion laboral o que presten servicios profesionales a la empresa.',
   'Criterio Normativo SAT (viaticos)', 'https://www.sat.gob.mx/normatividad/criterios-normativos#viaticos', 'LISR/CFF vigentes (DOF; verificar ultima reforma) — seed v1 2026-07',
   '2026-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'VIATICOS', 'PM_TITULO_II', null,
         null, null,
         '["Acreditar relacion laboral o de servicios del beneficiario del viatico (criterio SAT)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-SAT-CRIT-VIATICOS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

commit;
