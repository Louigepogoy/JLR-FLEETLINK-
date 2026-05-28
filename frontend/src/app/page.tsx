import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import Stats from '@/components/home/Stats';
import Features from '@/components/home/Features';
import Testimonials from '@/components/home/Testimonials';
import VehicleShowcase from '@/components/home/VehicleShowcase';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <VehicleShowcase />
        <Features />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
