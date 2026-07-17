'use client';
import { LandingProvider } from './context';
import { TopNav } from './sections/TopNav';
import { Hero } from './sections/Hero';
import { Ticker } from './sections/Ticker';
import { Steps } from './sections/Steps';
import { Cards } from './sections/Cards';
import { DeckBuilder } from './sections/DeckBuilder';
import { Panel } from './sections/Panel';
import { Protocol } from './sections/Protocol';
import { Agenda } from './sections/Agenda';
import { Footer } from './sections/Footer';
import { DemoModal } from './sections/DemoModal';
import { ChatWidget } from './sections/ChatWidget';

export function LandingClient() {
  return (
    <LandingProvider>
      <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
        <TopNav />
        <main>
          <Hero />
          <Ticker />
          <Steps />
          <Cards />
          <DeckBuilder />
          <Panel />
          <Protocol />
          <Agenda />
        </main>
        <Footer />
        <DemoModal />
        <ChatWidget />
      </div>
    </LandingProvider>
  );
}
