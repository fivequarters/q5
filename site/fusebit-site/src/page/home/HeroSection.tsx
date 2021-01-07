import React from 'react';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType } from '@5qtrs/fusebit-text';
import { FusebitHeroGraphic } from '@5qtrs/fusebit-hero';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';

// ------------------
// Internal Constants
// ------------------

const heroText = (
  <>
    Build <span style={{ color: FusebitColor.red }}>application integrations</span> with our fast and easy APIs
  </>
);

// -------------------
// Internal Components
// -------------------

function MobileVersion({ ...rest }: HeroSectionProps) {
  return (
    <Box vertical marginBottom={60}>
      <FusebitText fontSize={32} lineHeight={40} type={FusebitTextType.header1}>
        {heroText}
      </FusebitText>
      <FusebitHeroGraphic marginTop={20} expand stretch {...rest} />
    </Box>
  );
}

function NonMobileVersion({ ...rest }: HeroSectionProps) {
  return (
    <Box middle center gap={40} marginBottom={80} width="100%">
      <Box expand minWidth={360} maxWidth={800}>
        <FusebitText type={FusebitTextType.header1}>{heroText}</FusebitText>
      </Box>
      <FusebitHeroGraphic expand={2} minWidth="55%" maxWidth="80%" {...rest} />
    </Box>
  );
}

// --------------
// Exported Types
// --------------

export type HeroSectionProps = {
  animationOff?: boolean;
  onAnimationDone?: () => void;
};

// -------------------
// Exported Components
// -------------------

export function HeroSection({ ...rest }: HeroSectionProps) {
  return (
    <FusebitSection maxWidth={1200} marginBottom={40}>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion {...rest} />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion {...rest} />
      </MediaQuery>
    </FusebitSection>
  );
}
