// Identidad del agente conectado al chat. Configurable por env para que cada
// operador nombre a SU agente (el avatar visual es el Bot de la marca).
// NEXT_PUBLIC_* se inline-a en build: usar siempre la expresion estatica completa.
export const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME || 'Agent'
