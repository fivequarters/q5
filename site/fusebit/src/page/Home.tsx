import React from 'react';
import { Splash, Features, VP, Problem, FooterCTA, AboutUs } from '../comp';

// -------------------
// Exported Components
// -------------------

export function Home() {
  return (
    <>
      <Splash />
      <Problem />
      <Features />
      <VP />
      <FooterCTA />
      <AboutUs />
    </>
  );
}
