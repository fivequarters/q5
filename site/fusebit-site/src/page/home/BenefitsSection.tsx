import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import {
  PuzzleIcon,
  EmptyTagIcon,
  FourBoxesIcon,
  ShieldIcon,
  NetworkFileIcon,
  OrgChartIcon,
} from '@5qtrs/fusebit-icon';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';

// ------------------
// Internal Constants
// ------------------

const benefits = [
  {
    heading: 'Fast time to market',
    text: "Fusebit provides connectors to popular SaaS APIs and hosts your integrations at scale, so you don't have to",
    icon: <PuzzleIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Powerful and flexible',
    text:
      'Integrations do exactly what your users want, and are customizable through Node.js code, leveraging the full npm ecosystem',
    icon: <EmptyTagIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Embedded',
    text: 'Fusebit provides customizable white-label building blocks that fit seamlessly inside your product',
    icon: <FourBoxesIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Developer-first',
    text:
      'Our platform gives you powerful APIs and components to code against, supports source control, versioning, CI/CD, and everything else you expect',
    icon: <OrgChartIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Don’t get woken up',
    text: 'Health checks, throttling, and buffering infrastructure takes care of common issues while you sleep',
    icon: <NetworkFileIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Robust and secure',
    text: 'Designed with first-class security and privacy in mind, including private cloud hosting options',
    icon: <ShieldIcon color={FusebitColor.white} />,
  },
];

// --------------
// Internal Types
// --------------

type BenefitsListProps = {
  isMobile?: boolean;
} & BoxProps;

// -------------------
// Internal Components
// -------------------

function Benefit(benefit: any) {
  return (
    <>
      <Box middle noWrap marginBottom={20}>
        <Box background={FusebitColor.red} padding={12} marginRight={20} borderRadius={5}>
          {benefit.icon}
        </Box>
        <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
          {benefit.heading}
        </FusebitText>
      </Box>
      <FusebitText type={FusebitTextType.bodySmall}>{benefit.text}</FusebitText>{' '}
    </>
  );
}

function MobileVersion() {
  const elements = [];
  let key = 0;
  for (const benefit of benefits) {
    elements.push(
      <Box key={key++} marginTop={30} marginBottom={20} vertical>
        {Benefit(benefit)}
      </Box>
    );
  }

  return <Box>{elements}</Box>;
}

function NonMobileVersion() {
  const elements = [];
  let key = 0;
  for (const benefit of benefits) {
    elements.push(
      <Box key={key++} marginTop={20} marginRight={20} vertical expand minWidth={260} maxWidth={400}>
        {Benefit(benefit)}
      </Box>
    );
  }

  return <Box gap={30}>{elements}</Box>;
}

// -------------------
// Exported Components
// -------------------

export function BenefitsSection() {
  return (
    <FusebitSection maxWidth={1200} background={FusebitColor.orange}>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion />
      </MediaQuery>
    </FusebitSection>
  );
}
