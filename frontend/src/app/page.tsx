import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import BrandMarquee from '@/components/home/BrandMarquee';
import Stats from '@/components/home/Stats';
import Features from '@/components/home/Features';
import HowItWorks from '@/components/home/HowItWorks';
import VehicleShowcase from '@/components/home/VehicleShowcase';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <BrandMarquee />
        <Stats />
        <VehicleShowcase />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
