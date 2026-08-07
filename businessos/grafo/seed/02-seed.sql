-- 02-seed.sql — GENERADO por gen_seed_sql.py desde reglas_mx.json. NO EDITAR A MANO.
-- source_version: seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.
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
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('CONSTITUCION_SOCIEDADES', 'Constitucion de sociedades mercantiles', 'Constituir una sociedad mercantil (SA, S de RL, etc.): escritura o poliza, fedatario, estatutos e inscripcion en el Registro Publico de Comercio', array['constitucion de sociedad', 'constituir una sociedad', 'constituir una empresa', 'acta constitutiva', 'escritura constitutiva', 'estatutos sociales', 'sociedad anonima', 'sociedad de responsabilidad limitada', 'registro publico de comercio']::text[], array['sociedad por acciones simplificada']::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('SAS_CONSTITUCION', 'Sociedad por acciones simplificada (SAS)', 'Constitucion y limites de la SAS: via electronica gratuita ante la Secretaria de Economia, solo personas fisicas, tope de ingresos anuales', array['sociedad por acciones simplificada', 'acciones simplificada', 'sas']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('ASAMBLEAS_SOCIETARIAS', 'Asambleas y gobierno societario', 'Asambleas de socios/accionistas (ordinarias y extraordinarias), convocatorias, actas y organos de administracion y vigilancia', array['asamblea de accionistas', 'asamblea de socios', 'asamblea ordinaria', 'asamblea extraordinaria', 'convocatoria de asamblea', 'acta de asamblea', 'consejo de administracion', 'comisario']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('DIVIDENDOS_UTILIDADES', 'Dividendos, utilidades y reserva legal', 'Reparto de utilidades y dividendos a socios/accionistas y constitucion de la reserva legal', array['dividendo', 'dividendos', 'pago de dividendos', 'reparto de utilidades', 'distribucion de utilidades', 'reserva legal']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('FUSION_ESCISION', 'Fusion y escision de sociedades', 'Fusionar o escindir sociedades mercantiles: acuerdos, publicidad, plazos y derechos de oposicion de acreedores', array['fusion', 'fusion de sociedades', 'fusionar', 'escision', 'escision de sociedades', 'escindir']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('GRUPOS_HOLDING', 'Grupos de sociedades y holdings', 'Estructuras de sociedad controladora/tenedora con subsidiarias o filiales (holding)', array['holding', 'sociedad controladora', 'controladora', 'tenedora de acciones', 'subsidiaria', 'subsidiarias', 'grupo de sociedades', 'grupo empresarial', 'filial', 'filiales']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('REGISTRO_ACCIONES_BC', 'Registro de acciones y beneficiario controlador', 'Libro de registro de acciones, transmisiones y la obligacion de identificar al beneficiario controlador', array['registro de acciones', 'libro de registro de acciones', 'transmision de acciones', 'cesion de acciones', 'beneficiario controlador', 'beneficiarios controladores']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('CONCENTRACIONES_COFECE', 'Concentraciones economicas (COFECE)', 'Adquisiciones, fusiones o tomas de control que pueden requerir autorizacion previa de la Comision Federal de Competencia Economica', array['concentracion economica', 'notificacion de concentracion', 'cofece', 'adquisicion de empresa', 'adquisicion de empresas', 'compra de empresa', 'comprar una empresa', 'adquirir una sociedad', 'tomar control de una empresa']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;
insert into categorias_gasto (clave, nombre, descripcion, keywords, exclusiones) values
  ('PODERES_REPRESENTACION', 'Representacion y poderes de la sociedad', 'Representacion legal de la sociedad y otorgamiento/revocacion de poderes a apoderados', array['poder notarial', 'poderes notariales', 'apoderado', 'apoderado legal', 'representante legal', 'otorgar poderes', 'otorgamiento de poderes', 'revocacion de poderes']::text[], '{}'::text[])
  on conflict (clave) do update set nombre = excluded.nombre,
    descripcion = excluded.descripcion, keywords = excluded.keywords,
    exclusiones = excluded.exclusiones;

-- Bajas explicitas: reglas RETIRADAS del seed (el upsert no borra).
-- Idempotente; on delete cascade en impactos borra los suyos.
delete from reglas where clave = any (array['MX-LFPDPPP-21-CONFIDENCIALIDAD']::text[]);

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LISR-27-I', 'MX', 'fiscal', 'Estricta indispensabilidad y donativos', 'Las deducciones deben ser estrictamente indispensables para los fines de la actividad del contribuyente, salvo donativos no onerosos ni remunerativos a donatarias autorizadas, deducibles hasta el 7% de la utilidad fiscal del ejercicio anterior.',
   'LISR Art. 27, fraccion I', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 27, fraccion III', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 27, fraccion V (y Art. 106 ultimo parrafo)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 27, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 28, fraccion V', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 28, fraccion XIII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 28, fraccion XXVII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Art. 28, fraccion XXXII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LISR Arts. 31-34; Art. 34, fraccion VII', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Criterio Normativo SAT (viaticos)', 'https://www.sat.gob.mx/normatividad/criterios-normativos#viaticos', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'CFF Art. 28', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'CFF Art. 30', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'NIF C-6 (CINIF), Propiedades, planta y equipo', 'https://www.cinif.org.mx/', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'NIF D-5 (CINIF), Arrendamientos', 'https://www.cinif.org.mx/', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Estatuto Tributario (CO), Art. 107', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Estatuto Tributario (CO), Art. 771-2', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Estatuto Tributario (CO), Art. 104', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_tributario.html', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Codigo Civil Federal, Arts. 1794-1796', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Codigo Civil Federal, Art. 1843', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Codigo de Comercio, Art. 78', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'CFF Arts. 29 y 29-A', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LFPDPPP (nueva ley, DOF 20/03/2025) Art. 20', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Codigo Civil Federal, Art. 1797', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Ley de Aviacion Civil, Art. 30 (reformado DOF 03-05-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAC.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Ley de Aviacion Civil, Art. 74 (reformado DOF 03-05-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAC.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Ley de Instituciones de Seguros y de Fianzas, Art. 91 y 93', 'http://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Ley de Instituciones de Seguros y de Fianzas, Art. 94', 'http://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'Ley de Instituciones de Seguros y de Fianzas, Art. 25 y 93', 'http://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 5, 6 y 14', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 14, 16 y 17', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 35 y 36', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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
   'LFPDPPP (nueva ley, DOF 20/03/2025) Arts. 3 fraccion X y 9 fraccion II', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
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

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-5-6-CONSTITUCION', 'MX', 'regulatorio', 'Constitucion de sociedades mercantiles: fedatario publico, contenido de la escritura e inscripcion en el RPC', 'Las sociedades se constituyen ante fedatario publico y sus modificaciones se hacen constar en la misma forma (Art. 5o); el fedatario no autoriza estatutos contrarios a la Ley. La escritura o poliza constitutiva debe contener los elementos del Art. 6o (socios, objeto, denominacion, duracion —que puede ser indefinida—, capital, aportaciones, domicilio, administracion, etc.). Las sociedades inscritas en el Registro Publico de Comercio tienen personalidad juridica distinta de los socios (Art. 2o); las NO inscritas que se exterioricen frente a terceros tambien tienen personalidad, pero quienes actuen por una sociedad irregular responden frente a terceros de forma subsidiaria, solidaria e ilimitada. La SAS se constituye por su propio procedimiento (Capitulo XIV).',
   'LGSM, Arts. 2o, 5o y 6o (texto vigente, ultima reforma DOF 20-10-2023; Art. 5 reformado DOF 13-06-2014 y adicionado DOF 14-03-2016)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1934-08-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CONSTITUCION_SOCIEDADES', 'GENERAL', 'permitido',
         null, null,
         '["Constituirse ante fedatario publico (notario o corredor publico) — Art. 5o", "La escritura/poliza debe contener los requisitos del Art. 6o (nombres de socios, objeto, denominacion, duracion, capital y aportaciones, domicilio, forma de administracion y facultades, nombramiento de administradores, reparto de utilidades, fondo de reserva)", "Inscribir la sociedad en el Registro Publico de Comercio para tener personalidad juridica plena y evitar el regimen de sociedad irregular (Art. 2o)"]'::jsonb, '["Sociedad irregular (no inscrita): quienes realicen actos juridicos en su nombre responden subsidiaria, solidaria e ilimitadamente frente a terceros", "La SAS NO se constituye por esta via: tiene procedimiento electronico propio (Capitulo XIV, ver categoria SAS_CONSTITUCION)"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-5-6-CONSTITUCION'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-260-263-SAS', 'MX', 'regulatorio', 'SAS: constitucion electronica, solo personas fisicas y tope de ingresos anuales', 'La sociedad por acciones simplificada se constituye con una o mas PERSONAS FISICAS (una persona moral no puede ser accionista), mediante el sistema electronico de la Secretaria de Economia (Art. 263). Los ingresos totales anuales no pueden rebasar $7,678,849.94 (cantidad ACTUALIZADA por Acuerdo DOF 26-12-2025; se actualiza cada 1 de enero); si se rebasa, la SAS debe transformarse en otro regimen societario (Art. 260). Un accionista de SAS no puede ser simultaneamente accionista de control de otra sociedad mercantil (Art. 260 en relacion con el Art. 2 fr. III de la Ley del Mercado de Valores). La SAS esta exceptuada de la reserva legal (Art. 20).',
   'LGSM, Arts. 260 a 263 (SAS adicionada DOF 14-03-2016; tope actualizado por Acuerdo DOF 26-12-2025) y Art. 20', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '2016-03-14'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'SAS_CONSTITUCION', 'GENERAL', 'permitido',
         null, null,
         '["Todos los accionistas deben ser personas fisicas obligadas solo al pago de sus aportaciones (Art. 260)", "Constituirse por el sistema electronico de la Secretaria de Economia conforme a sus reglas generales (Art. 263)", "Vigilar el tope de ingresos totales anuales; al rebasarlo, transformarse en otro tipo societario (Art. 260, segundo parrafo)", "Verificar que ningun accionista tenga control simultaneo de otra sociedad mercantil (Art. 260 primer parrafo)"]'::jsonb, '["NO apta como vehiculo de holding: las personas morales no pueden ser accionistas de una SAS", "El tope se actualiza cada 1 de enero (factor de actualizacion): cotejar el Acuerdo vigente en DOF antes de asesorar", "La vacatio legis de la reforma que creo la SAS (DOF 14-03-2016) fue de 6 meses: entrada en vigor operativa posterior a la publicacion — cotejar transitorios"]'::jsonb, '{"tope_ingresos_anuales_mxn": 7678849.94, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-260-263-SAS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-178-182-ASAMBLEAS', 'MX', 'regulatorio', 'Asamblea de accionistas: organo supremo y asamblea ordinaria anual obligatoria', 'La Asamblea General de Accionistas es el organo supremo de la sociedad (Art. 178); los estatutos pueden prever resoluciones fuera de asamblea por unanimidad con la misma validez. Son ordinarias las asambleas que tratan asuntos distintos de los del Art. 182 (Art. 180). La Asamblea Ordinaria debe reunirse al menos una vez al ano dentro de los CUATRO MESES siguientes a la clausura del ejercicio social, para discutir/aprobar el informe de los administradores (con el informe del comisario), nombrar administradores y comisarios y determinar sus emolumentos (Art. 181). Los asuntos del Art. 182 (reformas de estatutos, fusion, escision, etc.) exigen asamblea extraordinaria.',
   'LGSM, Arts. 178, 180, 181 y 182 (texto vigente, ultima reforma DOF 20-10-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1934-08-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'ASAMBLEAS_SOCIETARIAS', 'GENERAL', 'permitido',
         null, null,
         '["Celebrar la asamblea ordinaria anual dentro de los 4 meses posteriores al cierre del ejercicio (Art. 181)", "En la ordinaria anual: discutir/aprobar/modificar el informe de los administradores tomando en cuenta el del comisario, nombrar administradores y comisarios y fijar emolumentos (Art. 181, fracciones I-III)", "Tratar los asuntos del Art. 182 (reforma de estatutos, fusion, escision, cambio de objeto, etc.) SOLO en asamblea extraordinaria"]'::jsonb, '["Resoluciones fuera de asamblea: validas solo si los estatutos lo preven y son por unanimidad de quienes representan la totalidad de las acciones con derecho a voto (Art. 178)"]'::jsonb, '{"plazo_meses_asamblea_anual": 4, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-178-182-ASAMBLEAS'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-186-CONVOCATORIA-PSM', 'MX', 'regulatorio', 'Convocatoria de asambleas: publicacion en el sistema electronico de la Secretaria de Economia (PSM)', 'La convocatoria para asambleas generales debe hacerse mediante la publicacion de un aviso en el sistema electronico establecido por la Secretaria de Economia (Publicaciones de Sociedades Mercantiles, PSM), con la anticipacion que fijen los estatutos o, en su defecto, QUINCE DIAS antes de la fecha de la reunion (Art. 186). Durante ese plazo la informacion y documentos relacionados con la orden del dia deben estar a disposicion de los accionistas.',
   'LGSM, Art. 186 (texto vigente, ultima reforma DOF 20-10-2023; publicidad societaria electronica via Art. 50 Bis del Codigo de Comercio)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '2014-06-13'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'ASAMBLEAS_SOCIETARIAS', 'GENERAL', 'permitido',
         null, null,
         '["Publicar el aviso de convocatoria en el PSM (psm.economia.gob.mx) con la anticipacion estatutaria o minimo 15 dias antes de la asamblea (Art. 186)", "Mantener a disposicion de los accionistas la informacion de la orden del dia durante todo el plazo de convocatoria"]'::jsonb, '["Una convocatoria mal publicada expone los acuerdos a nulidad; la asamblea totalitaria (100% del capital presente) puede sesionar sin convocatoria previa (Art. 188)"]'::jsonb, '{"dias_minimos_convocatoria": 15, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-186-CONVOCATORIA-PSM'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-19-20-UTILIDADES-RESERVA', 'MX', 'regulatorio', 'Reparto de utilidades: estados financieros aprobados, perdidas absorbidas y reserva legal del 5%', 'La distribucion de utilidades solo puede hacerse DESPUES de que la asamblea apruebe los estados financieros que las arrojen, y no puede hacerse mientras las perdidas de ejercicios anteriores no hayan sido restituidas o absorbidas (o reducido el capital); cualquier estipulacion en contrario no produce efecto legal (Art. 19). De las utilidades netas debe separarse anualmente el 5% como minimo para formar el fondo de reserva, hasta que importe la QUINTA PARTE del capital social; el fondo debe reconstituirse si disminuye (Art. 20). La SAS esta exceptuada de la reserva legal.',
   'LGSM, Arts. 19 y 20 (Art. 20 reformado DOF 14-03-2016; texto vigente, ultima reforma DOF 20-10-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1934-08-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'DIVIDENDOS_UTILIDADES', 'GENERAL', 'permitido',
         null, null,
         '["Estados financieros del ejercicio aprobados por la asamblea ANTES de decretar el reparto (Art. 19)", "Perdidas de ejercicios anteriores restituidas o absorbidas (o capital reducido) antes de distribuir (Art. 19)", "Separar anualmente al menos el 5% de las utilidades netas a reserva legal hasta alcanzar 1/5 del capital social; reconstituirla si disminuye (Art. 20)"]'::jsonb, '["Reparto en contravencion del Art. 19: tanto la sociedad como sus acreedores pueden repetir contra quienes lo recibieron (responsabilidad de accionistas y administradores)", "El tratamiento FISCAL del dividendo (ISR, retencion) es dimension fiscal — no cubierto por esta regla"]'::jsonb, '{"reserva_legal_pct_anual": 5, "reserva_legal_tope_pct_capital": 20, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-19-20-UTILIDADES-RESERVA'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-222-225-FUSION', 'MX', 'regulatorio', 'Fusion de sociedades: acuerdo, inscripcion, publicidad y plazo de oposicion de acreedores', 'La fusion debe ser decidida por cada sociedad en la forma que corresponda a su naturaleza (Art. 222 — en la SA, asamblea extraordinaria conforme al Art. 182). Los acuerdos de fusion se inscriben en el Registro Publico de Comercio y se publican en el sistema electronico de la Secretaria de Economia, junto con el ultimo balance de cada sociedad y, para las que se extinguen, el sistema de extincion de su pasivo (Art. 223). La fusion NO surte efectos sino hasta TRES MESES despues de la inscripcion; en ese plazo cualquier acreedor puede oponerse judicialmente y la fusion se suspende hasta sentencia firme (Art. 224). Surte efectos de inmediato si se pacta el pago de todas las deudas, se deposita su importe en institucion de credito o consta el consentimiento de todos los acreedores (Art. 225).',
   'LGSM, Arts. 222 a 225 (Art. 223 reformado DOF 13-06-2014; texto vigente, ultima reforma DOF 20-10-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1934-08-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'FUSION_ESCISION', 'GENERAL', 'permitido',
         null, null,
         '["Acuerdo de fusion adoptado por cada sociedad segun su naturaleza (en SA: asamblea extraordinaria, Arts. 182 y 222)", "Inscribir los acuerdos en el Registro Publico de Comercio y publicarlos en el PSM con el ultimo balance de cada sociedad (Art. 223)", "Respetar el plazo de 3 meses post-inscripcion antes de que surta efectos, salvo pago/deposito/consentimiento de acreedores (Arts. 224-225)"]'::jsonb, '["Una fusion entre competidores o que acumule activos puede ademas requerir autorizacion PREVIA de COFECE (ver categoria CONCENTRACIONES_COFECE)", "Los efectos fiscales de la fusion (enajenacion, CFF 14-B) son dimension fiscal — cotejo aparte"]'::jsonb, '{"plazo_efectos_meses": 3, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-222-225-FUSION'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-228BIS-ESCISION', 'MX', 'regulatorio', 'Escision de sociedades: resolucion de asamblea, publicidad y oposicion (45 dias)', 'Hay escision cuando una sociedad (escindente) divide la totalidad o parte de su activo, pasivo y capital en dos o mas partes aportadas en bloque a sociedades de nueva creacion (escindidas), extinguiendose o no (Art. 228 Bis). Solo puede acordarse por resolucion de la asamblea con los requisitos de quorum de reforma estatutaria; la resolucion (con la informacion prescrita) se protocoliza, se inscribe en el RPC y un extracto se publica en el sistema electronico de la Secretaria de Economia, quedando el texto completo a disposicion de socios y acreedores durante 45 DIAS NATURALES desde la inscripcion y publicacion; en ese plazo socios o acreedores que representen los porcentajes de ley pueden oponerse judicialmente.',
   'LGSM, Art. 228 Bis (adicionado DOF 11-06-1992; publicidad electronica reformada DOF 13-06-2014; texto vigente, ultima reforma DOF 20-10-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1992-06-11'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'FUSION_ESCISION', 'GENERAL', 'permitido',
         null, null,
         '["Resolucion de asamblea con los requisitos de quorum de una reforma de estatutos (Art. 228 Bis, fr. I-II)", "Protocolizar, inscribir en el RPC y publicar el extracto en el PSM con la informacion de la fr. IV", "Mantener el texto completo a disposicion de socios y acreedores 45 dias naturales desde inscripcion y publicacion (Art. 228 Bis, fr. V)"]'::jsonb, '["La escision es tambien un supuesto de enajenacion FISCAL salvo cumplimiento del CFF 14-B — dimension fiscal, cotejo aparte"]'::jsonb, '{"plazo_disposicion_dias_naturales": 45, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-228BIS-ESCISION'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-128-129-REGISTRO-ACCIONES', 'MX', 'regulatorio', 'Registro de acciones: libro obligatorio, titularidad por inscripcion y aviso al PSM', 'Las sociedades anonimas deben llevar un registro de acciones con nombre, nacionalidad y domicilio del accionista, acciones que le pertenecen, exhibiciones y transmisiones (Art. 128). La sociedad considera dueno de las acciones a quien aparece inscrito en ese registro y debe inscribir, a peticion de cualquier titular, las transmisiones (Art. 129). De cada inscripcion debe publicarse un AVISO en el sistema electronico de la Secretaria de Economia conforme al Art. 50 Bis del Codigo de Comercio (parrafo adicionado DOF 14-06-2018); la Secretaria debe mantener CONFIDENCIALES nombre, nacionalidad y domicilio del accionista del aviso, con acceso solo para autoridades que lo requieran.',
   'LGSM, Arts. 128 y 129 (parrafo de aviso electronico adicionado DOF 14-06-2018; texto vigente, ultima reforma DOF 20-10-2023)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '2018-06-14'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'REGISTRO_ACCIONES_BC', 'GENERAL', 'permitido',
         null, null,
         '["Llevar el libro de registro de acciones con el contenido del Art. 128", "Inscribir las transmisiones a peticion del titular; la sociedad solo reconoce como dueno al inscrito (Art. 129)", "Publicar el aviso de cada inscripcion en el PSM (Art. 129, segundo parrafo, en relacion con el Art. 50 Bis del Codigo de Comercio)"]'::jsonb, '["El aviso al PSM NO hace publica la identidad del accionista: la Secretaria la mantiene confidencial salvo requerimiento de autoridad", "Obligacion paralela e independiente: identificar al beneficiario controlador (CFF 32-B Ter, ver regla MX-CFF-32BTER-BENEFICIARIO-CONTROLADOR)"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-128-129-REGISTRO-ACCIONES'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-CFF-32BTER-BENEFICIARIO-CONTROLADOR', 'MX', 'regulatorio', 'Beneficiario controlador: obligacion de identificarlo, conservar la informacion y darla al SAT', 'Todas las personas morales, fiduciarias, fideicomitentes o fideicomisarios y partes de otras figuras juridicas estan obligadas a OBTENER y CONSERVAR, como parte de su contabilidad, la informacion fidedigna, completa y actualizada de sus BENEFICIARIOS CONTROLADORES, y a proporcionarla al SAT cuando la requiera, en la forma y terminos de las reglas de caracter general (Art. 32-B Ter, vigente desde el 1 de enero de 2022). El incumplimiento (no obtener, no conservar, no presentar o presentar incompleta/con errores) es infraccion del Art. 84-M con multas del Art. 84-N. En una estructura de holding la obligacion aplica a CADA sociedad del grupo.',
   'CFF, Arts. 32-B Ter, 32-B Quater, 32-B Quinquies, 84-M y 84-N (adicionados DOF 12-11-2021, vigentes 01-01-2022; texto vigente, ultima reforma DOF 09-04-2026)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '2022-01-01'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'REGISTRO_ACCIONES_BC', 'GENERAL', 'permitido',
         null, null,
         '["Identificar al o los beneficiarios controladores de cada persona moral/fideicomiso conforme a los criterios del Art. 32-B Quater", "Obtener y conservar la informacion como parte de la contabilidad, y mantenerla actualizada", "Entregarla al SAT a requerimiento, en la forma y plazos de las reglas generales (RMF) vigentes", "En grupos/holdings: cumplir la obligacion en CADA sociedad del grupo, no solo en la controladora"]'::jsonb, '["Las multas por incumplimiento (Art. 84-N) son elevadas y POR beneficiario no identificado: cotejar montos vigentes en el CFF/DOF antes de asesorar", "Los criterios operativos (que informacion, formatos, plazos) viven en la Resolucion Miscelanea Fiscal: cotejar la RMF del ejercicio"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-CFF-32BTER-BENEFICIARIO-CONTROLADOR'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LFCE-86-90-CONCENTRACIONES', 'MX', 'regulatorio', 'Concentraciones: autorizacion PREVIA de COFECE al superar los umbrales del Art. 86 (reformados DOF 16-07-2025)', 'Deben ser AUTORIZADAS por la COFECE antes de llevarse a cabo las concentraciones que superen los umbrales del Art. 86 (REFORMADOS DOF 16-07-2025): (I) operaciones por mas de 16 millones de veces el valor diario de la UMA; (II) acumulacion del 30% o mas de activos/acciones de un agente economico con ventas anuales o activos en Mexico por mas de 16 millones de UMA; (III) acumulacion de activos o capital social por mas de 7.4 millones de UMA cuando en la concentracion participan agentes con ventas o activos conjuntos por mas de 40 millones de UMA. Los actos realizados en contravencion NO producen efectos juridicos, sin perjuicio de las sanciones. Una holding que adquiere subsidiarias o consolida activos puede detonar estos umbrales.',
   'LFCE, Arts. 86 a 90 (fracciones I-III del Art. 86 reformadas DOF 16-07-2025; texto vigente, ultima reforma DOF 14-11-2025)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFCE.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '2025-07-16'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'CONCENTRACIONES_COFECE', 'GENERAL', 'permitido',
         null, null,
         '["Calcular ANTES de cerrar la operacion si se supera algun umbral del Art. 86 (en UMA diaria vigente)", "Si se supera: notificar y obtener la autorizacion de COFECE ANTES de ejecutar la concentracion (Arts. 86 y 90)", "No ejecutar actos de la concentracion (cierre, tomas de control) mientras la autorizacion este pendiente"]'::jsonb, '["Los actos en contravencion NO producen efectos juridicos y hay sanciones — el riesgo no es solo multa, es la nulidad de la operacion", "Umbrales RECIEN reformados (DOF 16-07-2025): material anterior a esa fecha cita umbrales viejos (18/48/8.4 millones de UMA) — no usarlo", "El valor de la UMA se actualiza cada ano (INEGI): el umbral en pesos cambia anualmente aunque la Ley no cambie"]'::jsonb, '{"umbral_operacion_uma": 16000000, "umbral_acumulacion_pct": 30, "umbral_agente_uma": 16000000, "umbral_acumulacion_uma": 7400000, "umbral_participantes_conjuntos_uma": 40000000, "verificar": true}'::jsonb
  from reglas r where r.clave = 'MX-LFCE-86-90-CONCENTRACIONES'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-10-REPRESENTACION-PODERES', 'MX', 'regulatorio', 'Representacion de la sociedad y otorgamiento de poderes', 'La representacion de toda sociedad mercantil corresponde a su administrador o administradores, quienes pueden realizar todas las operaciones inherentes al objeto social, salvo lo que expresamente establezcan la Ley y el contrato social (Art. 10). Para que surtan efectos los poderes que otorgue la sociedad por acuerdo de asamblea u organo colegiado de administracion, basta la protocolizacion ante notario de la parte del acta donde conste el acuerdo, con los requisitos que el propio articulo detalla. Las clases de poderes (pleitos y cobranzas, actos de administracion, actos de dominio) se rigen por el Art. 2554 del Codigo Civil Federal.',
   'LGSM, Art. 10 (texto vigente, ultima reforma DOF 20-10-2023), en relacion con el Art. 2554 del Codigo Civil Federal', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1934-08-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'PODERES_REPRESENTACION', 'GENERAL', 'permitido',
         null, null,
         '["Los poderes de la sociedad se otorgan por acuerdo de asamblea u organo de administracion; protocolizar ante notario la parte conducente del acta (Art. 10)", "Delimitar la clase de poder conforme al CCF Art. 2554 (pleitos y cobranzas, administracion, dominio) y las limitaciones expresas que se quieran imponer"]'::jsonb, '["El detalle de formalidades del poder (CCF Arts. 2554-2555) es legislacion civil federal: cotejar el texto vigente del CCF antes de asesorar un caso concreto"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-10-REPRESENTACION-PODERES'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

insert into reglas (clave, jurisdiccion, dimension, titulo, texto_resumen,
                    fuente_cita, fuente_url, source_version, vigente_desde, vigente_hasta) values
  ('MX-LGSM-HOLDING-TENEDORA', 'MX', 'regulatorio', 'Sociedad controladora/tenedora (holding): permitida bajo el regimen societario general, sin tipo especial en la LGSM', 'La LGSM no regula un tipo societario especial de ''holding'': una controladora/tenedora se constituye bajo cualquiera de los tipos del Art. 1o (tipicamente SA o S de RL) cuyo OBJETO SOCIAL (Art. 6o, fr. II) prevea la tenencia y administracion de acciones o participaciones de otras sociedades. Cada sociedad del grupo conserva personalidad juridica propia (Art. 2o) y sus propias obligaciones societarias (asambleas, registro de acciones, beneficiario controlador). NOTA de frontera: el regimen fiscal OPCIONAL para grupos de sociedades (integradora/integradas, LISR Arts. 59-71) es dimension FISCAL y es opt-in con requisitos propios; las adquisiciones del grupo pueden detonar notificacion de concentracion ante COFECE; la SAS no sirve como vehiculo (solo personas fisicas).',
   'LGSM, Arts. 1o, 2o y 6o (texto vigente, ultima reforma DOF 20-10-2023); frontera fiscal: LISR Arts. 59-71 (no dictaminada aqui)', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', 'seed v4 2026-07-30 — LISR/CFF (MX), ET (CO), NIF CINIF, CCF/CCom (MX); verificar contra fuente oficial (DOF/DIAN) antes de produccion; regulatorio MX 2026-07: Ley de Aviacion Civil (reforma consolidada DOF 14-11-2025) + NOM-107-SCT3-2019, Ley de Instituciones de Seguros y de Fianzas (texto vigente DOF 14-11-2025, Art. 91/93/94 sin evidencia de reforma posterior a su publicacion original DOF 04-04-2013) — verificado contra texto primario, no contra blogs de terceros. Fase 8b (2026-07-10): categoria AGENTES_SEGUROS + exclusiones en el clasificador para que no colisione con DRONES_DELIVERY (incidente real en #dep-legal). datos-personales MX 2026-07-30: LFPDPPP NUEVA LEY (publicada DOF 20-03-2025, vigente 21-03-2025, texto vigente con ultima reforma DOF 14-11-2025; la ley de 2010 quedo ABROGADA por el Transitorio Segundo del Decreto; autoridad de proteccion de datos: Secretaria Anticorrupcion y Buen Gobierno — INAI extinto, Art. 3 fraccion XV). Arts. 3-X, 5, 6, 9-II, 14, 15, 16, 17, 20, 35 y 36 verificados contra el PDF oficial de Diputados (LeyesBiblio), no contra blogs. La regla MX-LFPDPPP-21-CONFIDENCIALIDAD (ley 2010) se retira via _bajas y la sustituye MX-LFPDPPP2025-20-CONFIDENCIALIDAD. corporativo-mercantil MX 2026-08-06 (Fase A): LGSM texto vigente (ultima reforma DOF 20-10-2023, cantidades actualizadas por Acuerdo DOF 26-12-2025 — tope SAS $7,678,849.94 leido del PDF oficial), CFF (ultima reforma DOF 09-04-2026, Arts. 32-B Ter/84-M cotejados) y LFCE (ultima reforma DOF 14-11-2025; umbrales del Art. 86 REFORMADOS DOF 16-07-2025 a 16M/30%+16M/7.4M+40M UMA, leidos del PDF oficial — los umbrales pre-reforma 18M/48M/8.4M quedan obsoletos). Arts. 2, 5, 6, 10, 19, 20, 128, 129, 178, 180-182, 186, 222-225, 228 Bis y 260-263 LGSM verificados contra el PDF de Diputados (LeyesBiblio), no contra blogs ni memoria.',
   '1934-08-04'::date, null)
  on conflict (clave) do update set jurisdiccion = excluded.jurisdiccion,
    dimension = excluded.dimension, titulo = excluded.titulo,
    texto_resumen = excluded.texto_resumen, fuente_cita = excluded.fuente_cita,
    fuente_url = excluded.fuente_url, source_version = excluded.source_version,
    vigente_desde = excluded.vigente_desde, vigente_hasta = excluded.vigente_hasta;
insert into impactos (regla_id, categoria, regimen, veredicto_base,
                      tope_monto, tope_pct, requisitos, banderas, parametros)
  select r.id, 'GRUPOS_HOLDING', 'GENERAL', 'permitido',
         null, null,
         '["Constituir la controladora bajo un tipo del Art. 1o (SA/S de RL) con objeto social que prevea tenencia y administracion de participaciones (Art. 6o, fr. II)", "Cumplir en CADA sociedad del grupo sus obligaciones societarias propias: asamblea anual, registro de acciones, reserva legal, beneficiario controlador", "Evaluar ANTES de cada adquisicion si se detonan los umbrales de concentracion de la LFCE (ver CONCENTRACIONES_COFECE)"]'::jsonb, '["El regimen opcional fiscal de grupos (LISR 59-71: integradora con >80% de participacion) es OPT-IN, dimension fiscal — requiere dictamen aparte, esta regla no lo otorga", "La SAS no puede ser vehiculo de holding ni subsidiaria con socio persona moral (Art. 260)", "Consolidacion CONTABLE (NIF B-8) es dimension contable — no cubierta por esta regla"]'::jsonb, '{"verificar": false}'::jsonb
  from reglas r where r.clave = 'MX-LGSM-HOLDING-TENEDORA'
  on conflict (regla_id, categoria, regimen) do update set
    veredicto_base = excluded.veredicto_base, tope_monto = excluded.tope_monto,
    tope_pct = excluded.tope_pct, requisitos = excluded.requisitos,
    banderas = excluded.banderas, parametros = excluded.parametros;

commit;
