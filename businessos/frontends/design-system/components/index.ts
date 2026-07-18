// A2A Factory Design System — barril de componentes.
// Todos los componentes son CSS-var driven: dependen de los tokens en tokens/*.css,
// que la app consumidora debe importar en su hoja global.
export { Button } from './core/Button';
export type { ButtonProps } from './core/Button';
export { PillToggle } from './core/PillToggle';
export type { PillToggleProps } from './core/PillToggle';
export { Badge } from './core/Badge';
export type { BadgeProps } from './core/Badge';
export { EnergyChip } from './core/EnergyChip';
export type { EnergyChipProps } from './core/EnergyChip';
export { StatBar } from './core/StatBar';
export type { StatBarProps } from './core/StatBar';
export { Tabs } from './core/Tabs';
export type { TabsProps } from './core/Tabs';
export { AgentCard } from './modules/AgentCard';
export type { AgentCardProps } from './modules/AgentCard';
export { TerminalWindow } from './modules/TerminalWindow';
export type { TerminalWindowProps, TerminalLine } from './modules/TerminalWindow';
export { KpiCard } from './modules/KpiCard';
export type { KpiCardProps } from './modules/KpiCard';
