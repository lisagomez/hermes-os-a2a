-- 02-seed.sql — GENERADO por gen_seed_sql.py desde reglas_mx.json. NO EDITAR A MANO.
-- source_version: seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion
-- Idempotente: upserts sobre claves naturales (reseed real = volumen virgen).
begin;

insert into jurisdicciones (codigo, nombre) values ('MX', 'Mexico')
  on conflict (codigo) do update set nombre = excluded.nombre;
insert into jurisdicciones (codigo, nombre) values ('CO', 'Colombia')
  on conflict (codigo) do update set nombre = excluded.nombre;

insert into dimensiones (codigo, nombre) values ('fiscal', 'Fiscal (deducibilidad de gastos)')
  on conflict (codigo) do update set nombre = excluded.nombre;
insert into dimensiones (codigo, nombre) values ('contable', 'Contable (registro y normas de informacion financiera)')
  on conflict (codigo) do update set nombre = excluded.nombre;
insert into dimensiones (codigo, nombre) values ('contractual', 'Contractual (clausulas de acuerdos comerciales)')
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
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('CLAUSULA_PAGO', 'Clausula de pago y contraprestacion', 'Forma, calendario y condiciones de pago pactadas en el contrato', array['forma de pago', 'condiciones de pago', 'contraprestacion', 'precio pactado', 'calendario de pagos', 'anticipo']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('CLAUSULA_CONFIDENCIALIDAD', 'Clausula de confidencialidad', 'Obligaciones de no divulgacion y proteccion de informacion', array['confidencialidad', 'confidencial', 'no divulgacion', 'nda', 'secreto industrial']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('CLAUSULA_TERMINACION', 'Clausula de terminacion y vigencia', 'Vigencia, renovacion, preaviso y causales de terminacion', array['terminacion', 'rescision', 'vigencia del contrato', 'renovacion automatica', 'preaviso', 'causales de terminacion']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;
insert into categorias_gasto (clave, nombre, descripcion, keywords) values
  ('CLAUSULA_PENAL', 'Clausula penal / pena convencional', 'Penalizaciones pactadas por incumplimiento', array['pena convencional', 'clausula penal', 'penalizacion', 'mora']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-I', 'MX', 'fiscal', 'Estricta indispensabilidad y donativos', 'Las deducciones deben ser estrictamente indispensables para los fines de la actividad del contribuyente, salvo donativos no onerosos ni remunerativos a donatarias autorizadas, deducibles hasta el 7% de la utilidad fiscal del ejercicio anterior.',
   'LISR Art. 27, fraccion I', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 27, fraccion III', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 27, fraccion V (y Art. 106 ultimo parrafo)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 27, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 28, fraccion V', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 28, fraccion XIII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 28, fraccion XXVII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Art. 28, fraccion XXXII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'LISR Arts. 31-34; Art. 34, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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
   'Criterio Normativo SAT (viaticos)', 'https://www.sat.gob.mx/normatividad/criterios-normativos#viaticos', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
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

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CFF-28-CONTABILIDAD', 'MX', 'contable', 'Integracion de la contabilidad y contabilidad electronica', 'La contabilidad se integra por libros, registros, papeles de trabajo, CFDI y demas documentacion; los registros deben cumplir los requisitos del reglamento y la contabilidad electronica se ingresa mensualmente a traves del portal del SAT.',
   'CFF Art. 28', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Registro contable del gasto con la documentacion soporte integrada (CFF 28)", "Contabilidad electronica enviada al SAT en los plazos aplicables"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CFF-28-CONTABILIDAD'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CFF-30-CONSERVACION', 'MX', 'contable', 'Conservacion de la contabilidad (5 anos)', 'La contabilidad y documentacion soporte deben conservarse durante 5 anos contados desde la fecha en que se presentaron o debieron presentarse las declaraciones relacionadas.',
   'CFF Art. 30', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Conservar el soporte documental del registro durante 5 anos (CFF 30)"]'::jsonb, '[]'::jsonb, '{"plazo_conservacion_anios": 5, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-CFF-30-CONSERVACION'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-NIF-C6-ACTIVO-FIJO', 'MX', 'contable', 'Propiedades, planta y equipo (NIF C-6)', 'El equipo (incluido el de computo) se reconoce como activo fijo y se deprecia contablemente segun su vida util estimada y valor residual; la tasa contable puede diferir de la fiscal (LISR 34).',
   'NIF C-6 (CINIF), Propiedades, planta y equipo', 'https://www.cinif.org.mx/', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '2011-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'EQUIPO_DE_COMPUTO', 'GENERAL', 'dudoso',
         null, null,
         '["Reconocer como propiedades, planta y equipo (activo), no como gasto", "Depreciar segun vida util estimada y valor residual (NIF C-6)", "Conciliar la depreciacion contable con la fiscal (LISR 34: 30%) en la conciliacion contable-fiscal"]'::jsonb, '["La depreciacion contable (NIF C-6, vida util) puede diferir de la fiscal (LISR 34): registrar la diferencia temporal"]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-NIF-C6-ACTIVO-FIJO'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-NIF-D5-ARRENDAMIENTOS', 'MX', 'contable', 'Arrendamientos (NIF D-5)', 'Los contratos de arrendamiento se reconocen con un activo por derecho de uso y un pasivo por arrendamiento, salvo plazo corto (<=12 meses) o bajo valor.',
   'NIF D-5 (CINIF), Arrendamientos', 'https://www.cinif.org.mx/', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '2019-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'ARRENDAMIENTO', 'GENERAL', 'dudoso',
         null, null,
         '["Evaluar si el contrato califica como arrendamiento bajo NIF D-5", "Reconocer activo por derecho de uso y pasivo, salvo corto plazo o bajo valor"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-NIF-D5-ARRENDAMIENTOS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('CO-ET-107-EXPENSAS', 'CO', 'fiscal', 'Expensas necesarias: causalidad, necesidad y proporcionalidad', 'Son deducibles las expensas realizadas durante el ano gravable en desarrollo de la actividad productora de renta, siempre que tengan relacion de causalidad con ella y sean necesarias y proporcionadas.',
   'Estatuto Tributario (CO), Art. 107', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1989-03-30'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Relacion de causalidad con la actividad productora de renta", "Gasto necesario y proporcionado segun criterio comercial (ET 107)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'CO-ET-107-EXPENSAS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'SERVICIOS_PROFESIONALES', 'GENERAL', 'deducible',
         null, null,
         '["Factura electronica valida del prestador", "Retencion en la fuente por honorarios practicada y consignada (tarifa segun norma vigente)"]'::jsonb, '[]'::jsonb, '{"retencion_honorarios_pct": 11, "verificar": true}'::jsonb
  from reglas r where r.clave = 'CO-ET-107-EXPENSAS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('CO-ET-771-2-FACTURA', 'CO', 'fiscal', 'Procedencia de costos y deducciones: factura', 'Para la procedencia de costos, deducciones e impuestos descontables se requiere factura (electronica) o documento equivalente con los requisitos de los articulos 617 y 618 del ET.',
   'Estatuto Tributario (CO), Art. 771-2', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1997-07-14'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Factura electronica o documento equivalente con requisitos ET 617/618 (validada ante DIAN)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'CO-ET-771-2-FACTURA'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('CO-ET-104-REALIZACION', 'CO', 'fiscal', 'Realizacion de las deducciones', 'Las deducciones se entienden realizadas cuando se paguen efectivamente o, para obligados a llevar contabilidad, cuando se devenguen (causacion).',
   'Estatuto Tributario (CO), Art. 104', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1989-03-30'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Deduccion imputada al periodo correcto: pago efectivo o devengo si se lleva contabilidad (ET 104)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'CO-ET-104-REALIZACION'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CCF-1794-1796-ELEMENTOS', 'MX', 'contractual', 'Elementos y obligatoriedad del contrato', 'El contrato existe con consentimiento y objeto; es valido si hay capacidad, ausencia de vicios, objeto licito y la forma que la ley exija. Desde su perfeccionamiento obliga a lo expresamente pactado y a las consecuencias de la buena fe, el uso o la ley.',
   'Codigo Civil Federal, Arts. 1794-1796', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1932-10-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Identificacion y capacidad de las partes acreditadas", "Objeto del contrato licito y determinado (alcance del servicio/entregables)", "Consentimiento documentado (firma de ambas partes)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CCF-1794-1796-ELEMENTOS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CCF-1843-PENA', 'MX', 'contractual', 'Clausula penal: limite', 'La clausula penal no puede exceder ni en valor ni en cuantia a la obligacion principal; el exceso es nulo.',
   'Codigo Civil Federal, Art. 1843', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1932-10-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CLAUSULA_PENAL', 'GENERAL', 'dudoso',
         null, null,
         '["La pena convencional no excede el valor de la obligacion principal (CCF 1843)", "Supuestos de incumplimiento que activan la pena definidos con precision"]'::jsonb, '["Clausula penal: si excede la obligacion principal, el exceso es nulo (CCF 1843) — revisar cuantia"]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CCF-1843-PENA'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CCO-78-FORMA', 'MX', 'contractual', 'Libertad de forma en materia mercantil', 'En las convenciones mercantiles cada parte se obliga en la manera y terminos que aparezca que quiso obligarse, sin que la validez dependa de formalidades, salvo los casos en que la ley exija forma especifica.',
   'Codigo de Comercio, Art. 78', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1890-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, null, 'GENERAL', null,
         null, null,
         '["Terminos pactados por escrito aunque la ley no exija formalidad (evidencia mercantil, CCo 78)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CCO-78-FORMA'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CFF-29A-CONTRACTUAL', 'MX', 'contractual', 'Pagos del contrato y facturacion CFDI', 'Los pagos pactados en el contrato deben ampararse con CFDI que cumpla los requisitos del CFF 29-A; definir moneda, plazos, y retenciones aplicables segun el tipo de contraparte.',
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '2014-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CLAUSULA_PAGO', 'GENERAL', 'dudoso',
         null, null,
         '["Cada pago pactado se factura con CFDI valido (CFF 29-A)", "Moneda, calendario y condiciones de pago definidos sin ambiguedad", "Retenciones aplicables identificadas segun el tipo de contraparte"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CFF-29A-CONTRACTUAL'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LFPDPPP-21-CONFIDENCIALIDAD', 'MX', 'contractual', 'Deber de confidencialidad (datos personales)', 'Quien trate datos personales debe guardar confidencialidad respecto de ellos; la obligacion subsiste aun despues de terminada la relacion con el titular o el responsable.',
   'LFPDPPP Art. 21', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '2010-07-06'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CLAUSULA_CONFIDENCIALIDAD', 'GENERAL', 'dudoso',
         null, null,
         '["Informacion confidencial delimitada (que incluye y que no)", "Plazo de la obligacion definido; si hay datos personales, la confidencialidad subsiste tras terminar la relacion (LFPDPPP 21)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LFPDPPP-21-CONFIDENCIALIDAD'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CCF-1797-TERMINACION', 'MX', 'contractual', 'Terminacion: no al arbitrio de una sola parte', 'La validez y el cumplimiento de los contratos no puede dejarse al arbitrio de uno de los contratantes; las causales y mecanica de terminacion deben ser claras y bilaterales.',
   'Codigo Civil Federal, Art. 1797', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion',
   '1932-10-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CLAUSULA_TERMINACION', 'GENERAL', 'dudoso',
         null, null,
         '["Causales de terminacion claras y no potestativas de una sola parte (CCF 1797)", "Preaviso y efectos de la terminacion definidos (pagos devengados, entregables, devolucion de informacion)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-CCF-1797-TERMINACION'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

commit;
