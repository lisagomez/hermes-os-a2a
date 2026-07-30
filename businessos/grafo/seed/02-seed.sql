-- 02-seed.sql — GENERADO por gen_seed_sql.py desde reglas_mx.json. NO EDITAR A MANO.
-- source_version: seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.
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
insert into dimensiones (codigo, nombre) values ('regulatorio', 'Regulatorio (permisos y cumplimiento operativo)')
  on conflict (codigo) do update set nombre = excluded.nombre;
insert into dimensiones (codigo, nombre) values ('datos-personales', 'Datos personales (licitud de tratamiento y prospeccion B2B)')
  on conflict (codigo) do update set nombre = excluded.nombre;

insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('VIATICOS', 'Viaticos y gastos de viaje', 'Hospedaje, alimentacion, transporte y kilometraje fuera de la faja de 50 km', array['viatico', 'viaticos', 'hospedaje', 'hotel', 'vuelo', 'avion', 'boleto de avion', 'viaje', 'peaje', 'taxi', 'uber', 'transporte foraneo', 'kilometraje']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('SERVICIOS_PROFESIONALES', 'Servicios profesionales y honorarios', 'Honorarios, consultoria y servicios independientes', array['honorarios', 'consultoria', 'asesoria', 'servicios profesionales', 'servicio profesional', 'abogado', 'contador', 'notario', 'diseno', 'desarrollo de software', 'freelance']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('EQUIPO_DE_COMPUTO', 'Equipo de computo', 'Computadoras, servidores, perifericos (inversion, no gasto)', array['computadora', 'laptop', 'servidor', 'monitor', 'impresora', 'teclado', 'equipo de computo', 'macbook', 'pc de escritorio', 'disco duro', 'memoria ram']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DONATIVOS', 'Donativos', 'Donativos a donatarias autorizadas', array['donativo', 'donativos', 'donacion', 'donaciones']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('INTERESES', 'Intereses y financiamiento', 'Intereses de prestamos y creditos del negocio', array['interes', 'intereses', 'interes moratorio', 'financiamiento', 'credito', 'prestamo']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('COMBUSTIBLES', 'Combustibles', 'Gasolina y diesel para vehiculos del negocio', array['gasolina', 'diesel', 'combustible', 'magna', 'premium', 'carga de combustible']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('ARRENDAMIENTO', 'Arrendamiento', 'Rentas de inmuebles, autos y equipos', array['renta', 'arrendamiento', 'alquiler', 'renta de oficina', 'renta de local', 'renta de auto', 'leasing']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('CLAUSULA_PAGO', 'Clausula de pago y contraprestacion', 'Forma, calendario y condiciones de pago pactadas en el contrato', array['forma de pago', 'condiciones de pago', 'contraprestacion', 'precio pactado', 'calendario de pagos', 'anticipo']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('CLAUSULA_CONFIDENCIALIDAD', 'Clausula de confidencialidad', 'Obligaciones de no divulgacion y proteccion de informacion', array['confidencialidad', 'confidencial', 'no divulgacion', 'nda', 'secreto industrial']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('CLAUSULA_TERMINACION', 'Clausula de terminacion y vigencia', 'Vigencia, renovacion, preaviso y causales de terminacion', array['terminacion', 'rescision', 'vigencia del contrato', 'renovacion automatica', 'preaviso', 'causales de terminacion']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('CLAUSULA_PENAL', 'Clausula penal / pena convencional', 'Penalizaciones pactadas por incumplimiento', array['pena convencional', 'clausula penal', 'penalizacion', 'mora']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DRONES_DELIVERY', 'Uso de RPAS (drones) para entrega/delivery', 'Operacion de aeronaves pilotadas a distancia (RPAS) para reparto/entrega comercial', array['dron', 'drones', 'rpas', 'delivery con dron', 'entrega por dron', 'reparto con dron', 'aeronave no tripulada', 'vehiculo aereo no tripulado', 'dron de reparto', 'drone delivery']::text[], array['agente de seguros', 'agente de seguros y fianzas', 'corredor de seguros', 'correduria de seguros', 'intermediario de seguros', 'intermediacion de seguros', 'vender seguros', 'cedula de agente']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('AGENTES_SEGUROS', 'Intermediacion de seguros: agentes y corredores', 'Actuar como agente/corredor que intermedia la contratacion de seguros (vender, cotizar o asesorar sobre polizas), independientemente del ramo asegurado', array['agente de seguros', 'agente de seguros y fianzas', 'corredor de seguros', 'correduria de seguros', 'intermediario de seguros', 'intermediacion de seguros', 'vender seguros', 'cedula de agente']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DATOS_CONTACTO_CORPORATIVO', 'Datos de contacto corporativo (prospeccion B2B)', 'Tratamiento de correo/telefono corporativo de representantes o personal de una empresa para prospeccion B2B, incluida la inferencia de correos por patron del dominio', array['correo corporativo', 'email corporativo', 'contacto corporativo', 'patron de correo de dominio', 'inferencia de correo']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DATOS_CONTACTO_PERSONA_FISICA', 'Datos de contacto de persona fisica titular', 'Tratamiento de correo o telefono PERSONAL de una persona fisica (titular) para prospeccion; tratamiento diferenciado del contacto corporativo', array['dato de persona fisica', 'correo personal de titular', 'telefono personal de titular', 'prospeccion a persona fisica']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DATOS_TRANSFERENCIA_INTL', 'Transferencia de datos a terceros (nacional o internacional)', 'Comunicacion de datos personales a terceros distintos del encargado, dentro o fuera del territorio nacional (p. ej. proveedores de enriquecimiento o verificacion)', array['transferencia internacional de datos', 'proveedor extranjero de datos', 'encargado en el extranjero']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DATOS_FUENTE_PUBLICA', 'Datos de fuentes de acceso publico oficiales', 'Consulta y tratamiento de datos que figuran en fuentes de acceso publico por disposicion de ley (DENUE del INEGI, listados 69-B del SAT, padrones publicos)', array['fuente publica oficial', 'consulta denue', 'lista 69-b', 'padron publico oficial', 'rfc de fuente publica']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;

-- Bajas explicitas: reglas RETIRADAS del seed (el upsert no borra).
-- Idempotente; on delete cascade en impactos borra los suyos.
delete from reglas where clave = any (array['MX-LFPDPPP-21-CONFIDENCIALIDAD']::text[]);

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-I', 'MX', 'fiscal', 'Estricta indispensabilidad y donativos', 'Las deducciones deben ser estrictamente indispensables para los fines de la actividad del contribuyente, salvo donativos no onerosos ni remunerativos a donatarias autorizadas, deducibles hasta el 7% de la utilidad fiscal del ejercicio anterior.',
   'LISR Art. 27, fraccion I', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 27, fraccion III', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 27, fraccion V (y Art. 106 ultimo parrafo)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 27, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 28, fraccion V', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 28, fraccion XIII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 28, fraccion XXVII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Art. 28, fraccion XXXII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'LISR Arts. 31-34; Art. 34, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Criterio Normativo SAT (viaticos)', 'https://www.sat.gob.mx/normatividad/criterios-normativos#viaticos', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'CFF Art. 28', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'CFF Art. 30', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'NIF C-6 (CINIF), Propiedades, planta y equipo', 'https://www.cinif.org.mx/', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'NIF D-5 (CINIF), Arrendamientos', 'https://www.cinif.org.mx/', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Estatuto Tributario (CO), Art. 107', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Estatuto Tributario (CO), Art. 771-2', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Estatuto Tributario (CO), Art. 104', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Codigo Civil Federal, Arts. 1794-1796', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Codigo Civil Federal, Art. 1843', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'Codigo de Comercio, Art. 78', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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
  ('MX-LFPDPPP2025-20-CONFIDENCIALIDAD', 'MX', 'contractual', 'Deber de confidencialidad (datos personales, LFPDPPP 2025)', 'El responsable o tercero debe establecer controles o mecanismos para que todas las personas que intervengan en cualquier fase del tratamiento de datos personales guarden confidencialidad respecto de estos; la obligacion subsiste aun despues de finalizar sus relaciones con el responsable. Sustituye a la LFPDPPP 2010 (Art. 21), abrogada por el Decreto DOF 20-03-2025 (Transitorio Segundo).',
   'LFPDPPP (nueva ley, DOF 20/03/2025) Art. 20', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2025-03-21'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CLAUSULA_CONFIDENCIALIDAD', 'GENERAL', 'dudoso',
         null, null,
         '["Informacion confidencial delimitada (que incluye y que no)", "Plazo de la obligacion definido; si hay datos personales, la confidencialidad subsiste tras terminar la relacion (LFPDPPP 2025, Art. 20)", "Controles o mecanismos para que toda persona que intervenga en el tratamiento guarde confidencialidad (LFPDPPP 2025, Art. 20)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LFPDPPP2025-20-CONFIDENCIALIDAD'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CCF-1797-TERMINACION', 'MX', 'contractual', 'Terminacion: no al arbitrio de una sola parte', 'La validez y el cumplimiento de los contratos no puede dejarse al arbitrio de uno de los contratantes; las causales y mecanica de terminacion deben ser claras y bilaterales.',
   'Codigo Civil Federal, Art. 1797', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
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

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LAC-30-REGISTRO-RPAS', 'MX', 'regulatorio', 'Registro de RPAS ante AFAC (no servicio publico)', 'Un sistema de aeronave pilotada a distancia (RPAS) que no preste ''servicio publico'' (transporte aereo con itinerarios/frecuencias/horarios) debe registrarse ante la Agencia Federal de Aviacion Civil (AFAC) y sujetarse a las disposiciones tecnico-administrativas respectivas (NOM-107-SCT3-2019). Un delivery comercial operado por una empresa privada normalmente no encaja en ''servicio publico'' en el sentido de esta Ley, por lo que aplica el regimen de registro, no de concesion. NOM-107-SCT3-2019 num. 4.10.3 prohibe dejar caer/arrojar objetos que puedan danar personas o bienes — condiciona directamente el mecanismo de entrega.',
   'Ley de Aviacion Civil, Art. 30 (reformado DOF 03-05-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAC.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2023-05-03'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DRONES_DELIVERY', 'GENERAL', 'permitido',
         null, null,
         '["Registro del RPAS ante la Agencia Federal de Aviacion Civil (AFAC), via SIIAU/SICT", "Cumplir NOM-107-SCT3-2019: categoria por peso (Micro <=2kg, Pequeno 2-25kg, Grande >25kg) y sus limitaciones operativas", "No dejar caer ni arrojar objetos que puedan danar personas o propiedad al momento de la entrega (NOM-107-SCT3-2019, num. 4.10.3)", "Confirmar si la ruta de entrega requiere operacion BVLOS (mas alla de linea de vista) — solo permitida para RPAS Grande bajo condiciones especificas de la norma"]'::jsonb, '["No existe una categoria regulatoria especifica de ''drone delivery'' en la Ley: se evalua bajo el regimen general de RPAS sin servicio publico"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LAC-30-REGISTRO-RPAS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LAC-74-SEGURO-RPAS', 'MX', 'regulatorio', 'Seguro de responsabilidad civil obligatorio para RPAS', 'Toda persona operadora de una aeronave (incluye RPAS) que transite en espacio aereo nacional debe contratar y mantener vigente un seguro que cubra danos a terceros, carga y equipaje. El contrato de seguro requiere aprobacion previa de AFAC antes de iniciar operaciones (plazo de respuesta de AFAC: 15 dias habiles). NOTA DE VIGENCIAS: NOM-107-SCT3-2019 (2019) cita este requisito como ''articulo 72'' de la Ley; la Ley vigente (reforma consolidada DOF 14-11-2025) ubica la obligacion en el Articulo 74 tras renumeraciones posteriores — se cita el numero vigente, no el de la NOM.',
   'Ley de Aviacion Civil, Art. 74 (reformado DOF 03-05-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAC.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2023-05-03'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DRONES_DELIVERY', 'GENERAL', 'permitido',
         null, null,
         '["Contratar y mantener vigente poliza de seguro de responsabilidad civil por danos a terceros, carga y equipaje (LAC Art. 74)", "Obtener la aprobacion de AFAC sobre el contrato de seguro ANTES de iniciar operaciones (LAC Art. 74)", "Portar copia de la poliza vigente en la estacion de control durante la operacion (NOM-107-SCT3-2019)"]'::jsonb, '["Operar sin poliza vigente o sin aprobacion de AFAC deja la operacion fuera de cumplimiento — sancionable conforme al capitulo de infracciones de la Ley", "NOM-107-SCT3-2019 cita ''articulo 72''; el articulo vigente hoy es el 74 (renumeracion posterior a 2019) — usar 74"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LAC-74-SEGURO-RPAS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISF-93-AUTORIZACION-AGENTE', 'MX', 'regulatorio', 'Autorizacion de la CNSF para actuar como agente de seguros', 'Se considera agente de seguros a la persona fisica o moral que interviene en la contratacion de seguros (intercambio de propuestas y aceptacion, comercializacion, asesoramiento para celebrar/conservar/modificar polizas). Para ejercer esa actividad se requiere autorizacion previa de la Comision Nacional de Seguros y Fianzas (CNSF); la Comision puede suspender (hasta 2 anios) o revocar la autorizacion, ademas de aplicar amonestaciones y multas. Los requisitos especificos de la autorizacion (examen, credencial, inscripcion) los fija el reglamento respectivo de la CNSF, no la Ley misma — no verificados en este texto primario.',
   'Ley de Instituciones de Seguros y de Fianzas, Art. 91 y 93', 'http://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2013-04-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'AGENTES_SEGUROS', 'GENERAL', 'permitido',
         null, null,
         '["Obtener autorizacion de la Comision Nacional de Seguros y Fianzas (CNSF) antes de intermediar cualquier contrato de seguro (LISF Art. 93)", "Verificar directamente con la CNSF los requisitos especificos de la autorizacion (examen, credencial/cedula, inscripcion, garantia o fianza personal del agente si aplica): la Ley los remite a ''el reglamento respectivo'' y no los detalla — investigado en el texto primario de la LISF (Titulo Cuarto, Capitulo Segundo, Art. 91-103) y NO se encontro un requisito de garantia/fianza de fidelidad para el agente como persona (las ''fianzas de fidelidad'' que menciona la Ley, Art. 36 y 170, son un RAMO de producto de Institucion de Fianzas, no una garantia que el agente deba constituir); si existe, vive en disposiciones de la CNSF (reglamento/Circular Unica) aun no verificadas contra fuente primaria — pendiente de cotejo"]'::jsonb, '["Ejercer como agente de seguros SIN autorizacion de la CNSF infringe el Art. 93 LISF: la Comision puede suspender (hasta 2 anios) o revocar la autorizacion y aplicar amonestaciones/multas"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LISF-93-AUTORIZACION-AGENTE'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISF-94-DEBER-INFORMACION-AGENTE', 'MX', 'regulatorio', 'Deberes de informacion del agente de seguros y prohibicion de datos falsos', 'El agente de seguros debe informar de manera amplia y detallada al contratante sobre el alcance real de la cobertura y como conservarla o darla por terminada, y debe proporcionar a la Institucion de Seguros la informacion precisa y relevante del riesgo que conozca. Tiene prohibido proporcionar datos falsos o adversos sobre las Instituciones.',
   'Ley de Instituciones de Seguros y de Fianzas, Art. 94', 'http://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2013-04-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'AGENTES_SEGUROS', 'GENERAL', null,
         null, null,
         '["Informar de manera amplia y detallada al contratante el alcance real de la cobertura del seguro y como conservarla o darla por terminada (LISF Art. 94, fraccion I)", "Proporcionar a la Institucion de Seguros la informacion precisa y relevante del riesgo que el agente conozca (LISF Art. 94, fraccion I)"]'::jsonb, '["Prohibido proporcionar datos falsos o adversos sobre las Instituciones de Seguros (LISF Art. 94, fraccion III)"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LISF-94-DEBER-INFORMACION-AGENTE'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISF-25-93-RAMOS-AGENTE', 'MX', 'regulatorio', 'La autorizacion del agente de seguros es por ramo, no generica', 'El Art. 93 dice que las autorizaciones de agente ''podran otorgarse para realizar actividades de intermediacion en las operaciones y ramos... que determine la Comision''. El catalogo de operaciones y ramos de seguro esta en el Art. 25: I. Vida; II. Accidentes y enfermedades (accidentes personales, gastos medicos, salud); III. Danios (responsabilidad civil y riesgos profesionales, maritimo y transportes, incendio, agricola y de animales, automoviles, credito, caucion, credito a la vivienda, garantia financiera, riesgos catastroficos, diversos, y los especiales que declare la Secretaria). No existe un ramo llamado ''aviacion'' o ''drones'' en este catalogo: un seguro de RPAS/drones normalmente encajaria en Danios (posiblemente ''responsabilidad civil y riesgos profesionales'' u otro subramo/ramo especial), pero la clasificacion exacta no esta en el texto de la Ley y debe confirmarse con la CNSF o la aseguradora antes de operar.',
   'Ley de Instituciones de Seguros y de Fianzas, Art. 25 y 93', 'http://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2013-04-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'AGENTES_SEGUROS', 'GENERAL', null,
         null, null,
         '["Confirmar ante la CNSF el/los ramo(s) especifico(s) de seguro (Art. 25 LISF: Vida / Accidentes y enfermedades / Danios) para los que se solicita o se tiene autorizacion como agente — la autorizacion NO es generica para ''seguros'' en general (LISF Art. 93)", "Para un seguro de drones/RPAS: NO hay ramo explicito de ''aviacion'' en el catalogo del Art. 25 — confirmar con la CNSF o la aseguradora bajo que ramo/subramo de Danios se clasificaria antes de cotizar u operar (no verificado en este texto primario)"]'::jsonb, '["Intermediar seguros fuera del/los ramo(s) para los que el agente tiene autorizacion equivale a operar sin autorizacion para ese ramo (mismo regimen sancionador del Art. 93 LISF)"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LISF-25-93-RAMOS-AGENTE'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LFPDPPP2025-6-14-CONTACTO-CORPORATIVO', 'MX', 'datos-personales', 'Licitud y aviso de privacidad en datos de contacto corporativo (prospeccion B2B)', 'El tratamiento de datos de contacto de representantes o personal de una empresa para prospeccion B2B debe ser licito, sin medios enganosos y respetando la expectativa razonable de privacidad (Arts. 5 y 6); el responsable debe informar el tratamiento mediante aviso de privacidad (Art. 14). El dato de contacto corporativo sigue siendo dato personal cuando identifica a una persona fisica.',
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 5, 6 y 14', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2025-03-21'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DATOS_CONTACTO_CORPORATIVO', 'GENERAL', 'permitido',
         null, null,
         '["Aviso de privacidad publicado y accesible que cubra la finalidad de prospeccion B2B (Arts. 14 y 15)", "Finalidad B2B informada y acorde con la expectativa razonable de privacidad (Art. 6)", "Mecanismo para que el titular limite el uso o divulgacion de sus datos (Art. 15 fraccion IV)"]'::jsonb, '[]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LFPDPPP2025-6-14-CONTACTO-CORPORATIVO'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LFPDPPP2025-14-17-CONTACTO-PF', 'MX', 'datos-personales', 'Datos de contacto de persona fisica para prospeccion: aviso previo y base de licitud', 'Tratar correo o telefono personal de una persona fisica exige informar el tratamiento mediante aviso de privacidad (Arts. 14 y 16); si los datos no se obtuvieron directamente del titular, el responsable debe darselo a conocer (Art. 17). La base de licitud del tratamiento debe estar documentada (Arts. 5 y 6). Tratamiento diferenciado del contacto corporativo.',
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 14, 16 y 17', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2025-03-21'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DATOS_CONTACTO_PERSONA_FISICA', 'GENERAL', 'dudoso',
         null, null,
         '["Aviso de privacidad dado a conocer al titular antes del tratamiento para prospeccion (Arts. 14 y 16)", "Si el dato no se obtuvo directamente del titular, darle a conocer el aviso de privacidad (Art. 17)", "Base de licitud del tratamiento documentada (Arts. 5 y 6)"]'::jsonb, '["Sin aviso de privacidad publicado no hay via licita para prospeccion a persona fisica"]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LFPDPPP2025-14-17-CONTACTO-PF'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LFPDPPP2025-35-36-TRANSFERENCIA-INTL', 'MX', 'datos-personales', 'Transferencia de datos a terceros nacionales o extranjeros (proveedores de enriquecimiento)', 'Transferir datos personales a terceros distintos del encargado exige comunicar al receptor el aviso de privacidad y las finalidades del tratamiento; el aviso debe contener una clausula de aceptacion o negativa de la transferencia y el receptor asume las obligaciones del responsable (Art. 35). Solo procede sin consentimiento en los supuestos del Art. 36, que no incluyen la prospeccion comercial.',
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 35 y 36', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2025-03-21'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DATOS_TRANSFERENCIA_INTL', 'GENERAL', 'dudoso',
         null, null,
         '["Clausulas contractuales con el receptor que le trasladen las obligaciones del responsable (Art. 35)", "Clausula de aceptacion de la transferencia en el aviso de privacidad O consentimiento del titular, salvo supuestos del Art. 36", "Acuerdo de tratamiento de datos del proveedor receptor verificado antes de transferir"]'::jsonb, '["Transferencia a proveedor extranjero sin clausulas ni consentimiento: la prospeccion comercial NO esta en los supuestos de excepcion del Art. 36"]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LFPDPPP2025-35-36-TRANSFERENCIA-INTL'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LFPDPPP2025-9-II-FUENTE-PUBLICA', 'MX', 'datos-personales', 'Datos de fuentes de acceso publico oficiales (DENUE, listados 69-B del SAT)', 'No se requiere consentimiento del titular cuando los datos personales figuren en fuentes de acceso publico (Art. 9 fraccion II): bases de datos consultables publicamente por disposicion de ley, sin mas exigencia que en su caso una contraprestacion, y sin procedencia ilicita (Art. 3 fraccion X). La licitud reducida NO elimina los demas principios: licitud, finalidad y proporcionalidad del Art. 5 siguen aplicando al tratamiento posterior.',
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 3 fraccion X y 9 fraccion II', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v2 2026-07 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom/LFPDPPP (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD.',
   '2025-03-21'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DATOS_FUENTE_PUBLICA', 'GENERAL', 'permitido',
         null, null,
         '["Uso conforme a la finalidad y naturaleza de la fuente publica oficial (DENUE del INEGI, listados 69-B del SAT)", "Registrar la fuente y la fecha de consulta de cada dato obtenido"]'::jsonb, '["Licitud reducida, NO eliminada: los principios del Art. 5 (licitud, finalidad, proporcionalidad) siguen aplicando al tratamiento posterior"]'::jsonb, '{}'::jsonb
  from reglas r where r.clave = 'MX-LFPDPPP2025-9-II-FUENTE-PUBLICA'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

commit;
