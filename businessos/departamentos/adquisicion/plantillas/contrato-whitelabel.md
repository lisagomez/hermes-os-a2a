# Contrato de servicio — Departamento de software con IA (white-label)

**Cliente:** {{cliente}}
**Fecha:** {{fecha}}
**Precio mensual (USD):** {{precio}}

## Objeto

El proveedor pone a disposicion del cliente un departamento de desarrollo de
software operado por agentes de IA bajo supervision, con la marca del cliente:
un orquestador, un ejecutor en workspace aislado y un supervisor independiente
que re-verifica cada entrega con gates deterministas.

## Lo que el servicio ES y lo que NO es

El servicio es un departamento con DOS capas de control: supervision
automatica (gates re-ejecutados) y aprobacion humana obligatoria en todo lo
irreversible (deploys, dinero, comunicaciones a terceros). El servicio NO es
un agente autonomo sin supervision, y el proveedor no lo comercializa como tal.

## Aislamiento

Repositorio, datos, secretos y workspace de ejecucion del cliente permanecen
aislados de los de cualquier otro cliente del proveedor.

## Alcance del periodo

{{alcance}}

## Vigencia y terminacion

Vigencia mensual renovable desde la fecha de firma. Cualquiera de las partes
puede terminar con aviso de 30 dias naturales.

## Firmas (exclusivamente humanas)

Por el cliente: {{firma_cliente}}
Por el proveedor: {{firma_proveedor}}

---
*Este documento se genero rellenando la plantilla versionada
`adquisicion/plantillas/contrato-whitelabel.md`; toda modificacion fuera de los
campos variables invalida el borrador (gate `plantilla_contrato_intacta`).
Validado ademas por el grafo (dimension contractual) antes de la aprobacion
humana. La firma es exclusivamente humana.*
