import { createFileRoute } from '@tanstack/react-router'
import { LandingHeader } from '../features/landing/LandingHeader'
import { HeroSection } from '../features/landing/HeroSection'
import { FeaturesSection } from '../features/landing/FeaturesSection'
import { PricingSection } from '../features/landing/PricingSection'
import { ProductSection } from '../features/landing/ProductSection'
import { CtaSection } from '../features/landing/CtaSection'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <ProductSection />
        <CtaSection />
      </main>
    </div>
  )
}
