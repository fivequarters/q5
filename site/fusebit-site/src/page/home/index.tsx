import React from 'react';
import { FusebitPage } from '@5qtrs/fusebit-page';
import { HeroSection, HeroSectionProps } from './HeroSection';
import { PainSection } from './PainSection';
import { SolutionSection } from './SolutionSection';
import { BenefitsSection } from './BenefitsSection';
import { CallToActionSection, CallToActionSectionProps } from './CallToActionSection';
import { TestimonialSection } from './TestimonialSection';
import { IndustryInsightsSection } from './IndustryInsights';

// --------------
// Exported Types
// --------------

export type HomeProps = CallToActionSectionProps & HeroSectionProps;

// -------------------
// Exported Components
// -------------------

export function Home({ onEmailSubmit, ...rest }: HomeProps) {
  return (
    <FusebitPage>
      <HeroSection {...rest} />
      <PainSection />
      <SolutionSection />
      <BenefitsSection />
      <CallToActionSection onEmailSubmit={onEmailSubmit} />
      <TestimonialSection />
      <IndustryInsightsSection />
    </FusebitPage>
  );
}
