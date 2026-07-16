'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getStrings, type Lang, type Shopper, type Strings } from '@/shared/i18n/strings';
import { agentById } from './agents';

export type PanelTab = 'ops' | 'fin' | 'proj';

interface LandingContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  mode: Shopper;
  setMode: (m: Shopper) => void;
  t: Strings;

  deck: string[];
  inDeck: (id: string) => boolean;
  toggleDeck: (id: string) => void;
  removeFromDeck: (id: string) => void;

  panelTab: PanelTab;
  setPanelTab: (tab: PanelTab) => void;

  openId: string | null;
  demoStep: number;
  openDemo: (id: string) => void;
  closeDemo: () => void;
  replayDemo: () => void;
  modalAddDeck: () => void;

  slot: string | null;
  setSlot: (s: string | null) => void;
  confirmed: boolean;
  setConfirmed: (b: boolean) => void;
}

const LandingContext = createContext<LandingContextValue | null>(null);

export function useLanding(): LandingContextValue {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error('useLanding debe usarse dentro de <LandingProvider>');
  return ctx;
}

export function LandingProvider({
  children,
  defaultLang = 'es',
  defaultShopper = 'human',
}: {
  children: ReactNode;
  defaultLang?: Lang;
  defaultShopper?: Shopper;
}) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [mode, setMode] = useState<Shopper>(defaultShopper);
  const [deck, setDeck] = useState<string[]>([]);
  const [panelTab, setPanelTab] = useState<PanelTab>('ops');
  const [openId, setOpenId] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const inDeck = useCallback((id: string) => deck.includes(id), [deck]);
  const toggleDeck = useCallback(
    (id: string) => setDeck((d) => (d.includes(id) ? d.filter((x) => x !== id) : d.concat(id))),
    [],
  );
  const removeFromDeck = useCallback((id: string) => setDeck((d) => d.filter((x) => x !== id)), []);

  const openDemo = useCallback((id: string) => {
    setOpenId(id);
    setDemoStep(1);
  }, []);
  const closeDemo = useCallback(() => setOpenId(null), []);
  const replayDemo = useCallback(() => setDemoStep(1), []);

  const scrollToDeck = useCallback(() => {
    const el = typeof document !== 'undefined' ? document.getElementById('deck') : null;
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
  }, []);

  const modalAddDeck = useCallback(() => {
    setOpenId((current) => {
      if (current) setDeck((d) => (d.includes(current) ? d : d.concat(current)));
      return null;
    });
    scrollToDeck();
  }, [scrollToDeck]);

  // Avanza la demo del modal mientras está abierto (intervalo autolimpiante).
  useEffect(() => {
    if (!openId) return;
    const ag = agentById(openId);
    if (!ag) return;
    const iv = setInterval(() => {
      setDemoStep((s) => (s >= ag.demo.length ? s : s + 1));
    }, 950);
    return () => clearInterval(iv);
  }, [openId]);

  const value: LandingContextValue = {
    lang,
    setLang,
    mode,
    setMode,
    t: getStrings(lang),
    deck,
    inDeck,
    toggleDeck,
    removeFromDeck,
    panelTab,
    setPanelTab,
    openId,
    demoStep,
    openDemo,
    closeDemo,
    replayDemo,
    modalAddDeck,
    slot,
    setSlot,
    confirmed,
    setConfirmed,
  };

  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}
