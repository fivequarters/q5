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

const heading = 'Attract and retain customers with the integrations they want';
const subHeading = 'Integrations tailored to your SaaS and done in no time';
const benefits = [
  {
    heading: 'Buy, don’t build',
    text: 'Fusebit provides powerful building blocks that free your engineering team from development and maintenance',
    icon: <PuzzleIcon color={FusebitColor.white} />,
  },
  {
    heading: '100% fit',
    text:
      'Integrations do exactly what your users want, and are customizable through Node.js code, leveraging the full npm ecosystem',
    icon: <EmptyTagIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Fast time to market',
    text: 'The Fusebit platform building blocks allow rapid rollout of new integrations within days, not months',
    icon: <FourBoxesIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Built for scale',
    text: 'Security, reliability, and monitoring are built in, not an afterthought',
    icon: <ShieldIcon color={FusebitColor.white} />,
  },
  {
    heading: 'Don’t get woken up',
    text: 'Our financially-backed SLA ensures your integrations are always up',
    icon: <NetworkFileIcon color={FusebitColor.white} />,
  },
  {
    heading: 'We’ll do it as a team',
    text: 'We have the expertise and will work with you every step of the way',
    icon: <OrgChartIcon color={FusebitColor.white} />,
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
