import { TopBar } from '@/components/TopBar';
import { MobiusMount } from '@/components/MobiusMount';
import { Hero } from '@/components/Hero';
import { Work } from '@/components/Work';
import { Connect } from '@/components/Connect';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <span id="top" />
      <MobiusMount />
      <TopBar />

      <main className="page">
        <Hero />
        <Work />
        <Connect />
        <Footer />
      </main>
    </>
  );
}
