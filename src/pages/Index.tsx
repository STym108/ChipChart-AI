import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { CTASection } from '@/components/home/CTASection';
//the prompt is being made in file:
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
