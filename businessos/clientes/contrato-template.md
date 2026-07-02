# Plantilla de contrato de servicios (borrador — la redacta la vertical clientes)

> USO: la vertical clientes llena esta plantilla con lo acordado, la presenta a
> Elisa, y deja el JSON de cláusulas en `contratos_pending/` para que el grafo lo
> valide (host-job `validar-contratos.py`). El grafo marca banderas CON FUENTE;
> **aprobar y firmar es siempre de Elisa**. Esto no es asesoría legal.

## CONTRATO DE PRESTACIÓN DE SERVICIOS

**Partes.** [NOMBRE PRESTADOR], (el "Prestador") y [CLIENTE, razón social, RFC]
(el "Cliente"), quienes acreditan capacidad para obligarse.

**1. Objeto.** El Prestador se obliga a [DESCRIPCIÓN PRECISA DEL SERVICIO Y
ENTREGABLES]. Todo alcance no listado queda fuera y se cotiza por separado.

**2. Condiciones de pago.** Contraprestación de [MONTO + MONEDA], pagadera
[calendario de pagos: p. ej. 50% anticipo, 50% contra entrega]. Cada pago se
factura con CFDI. Retenciones aplicables según el tipo de contraparte.

**3. Vigencia y terminación.** Vigencia del contrato: [PLAZO]. Cualquiera de las
partes puede darlo por terminado con preaviso de [N] días; a la terminación se
cubren los pagos devengados y se devuelven materiales e información. Causales de
terminación claras y bilaterales (no potestativas de una sola parte).

**4. Confidencialidad.** Las partes guardarán confidencialidad sobre la
información marcada como confidencial [delimitar qué incluye]. Plazo: [N años].
Si se tratan datos personales, la obligación subsiste tras terminar la relación.

**5. Pena convencional.** En caso de [INCUMPLIMIENTO ESPECÍFICO], la parte que
incumpla pagará [MONTO], que en ningún caso excede el valor de la obligación
principal.

**6. Ley aplicable.** Leyes de [JURISDICCIÓN: México/Colombia] y tribunales de
[CIUDAD], renunciando a cualquier otro fuero.

Firmas: ______________ (Prestador)  ______________ (Cliente)  Fecha: __________

---

### Forma del JSON para `contratos_pending/`

```json
{
  "cliente": "ACME S.A.",
  "titulo": "Consultoria 2026",
  "jurisdiccion": "MX",
  "clausulas": [
    {"titulo": "Objeto", "texto": "El Prestador se obliga a ..."},
    {"titulo": "Condiciones de pago", "texto": "Contraprestacion de ... con CFDI ..."},
    {"titulo": "Vigencia y terminacion", "texto": "... preaviso de 30 dias ..."},
    {"titulo": "Confidencialidad", "texto": "Las partes guardaran confidencialidad ..."},
    {"titulo": "Pena convencional", "texto": "En caso de ... pagara ..."}
  ]
}
```
