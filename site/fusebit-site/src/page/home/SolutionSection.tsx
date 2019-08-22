import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitLogo } from '@5qtrs/fusebit-logo';
import { FusebitAcmeGraphic } from '@5qtrs/fusebit-acme';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';

// ------------------
// Internal Constants
// ------------------

const heading = 'Attract and retain customers with the integrations they want';
const subHeading = 'Integrations tailored to your SaaS and done in no time';

// -------------------
// Internal Components
// -------------------

function MobileVersion() {
  return (
    <Box vertical>
      <Box width="100%" center marginTop={20} padding={10} background={FusebitColor.dark} borderRadius={10} noWrap>
        <FusebitLogo markColor={FusebitColor.white} size={80} />
      </Box>
      <Box marginTop={30}>
        <FusebitText fontSize={32} type={FusebitTextType.header2} weight={FusebitTextWeight.black}>
          {heading}
        </FusebitText>
      </Box>
      <Box marginTop={20}>
        <FusebitText type={FusebitTextType.bodyLarge}>{subHeading}</FusebitText>
      </Box>
      <Box marginTop={50} right width="100%">
        <FusebitAcmeGraphic width="100%" margin={-20} />
      </Box>
    </Box>
  );
}

function NonMobileVersion() {
  return (
    <Box width="100%">
      <Box overlay right width="100%" marginTop={30}>
        <Box center width="100%">
          <Box maxWidth={1200} gap={30} width="100%">
            <Box expand vertical minWidth={420}>
              <Box padding={20} background={FusebitColor.dark} width="20vw" minWidth={200} borderRadius={10} noWrap>
                <FusebitLogo markColor={FusebitColor.white} expand />
              </Box>
              <Box marginTop={30} />
              <FusebitText type={FusebitTextType.header2} weight={FusebitTextWeight.black}>
                {heading}
              </FusebitText>
              <Box marginTop={30} />
              <FusebitText type={FusebitTextType.bodyLarge}>{subHeading}</FusebitText>
            </Box>
            <Box expand minWidth={400} />
          </Box>
        </Box>
      </Box>
      <Box right width="100vw" marginRight={-20} marginTop={30}>
        <Box expand minWidth={450} maxHeight={380} minHeight={300} height="calc(500px - 23vw)" />
        <Box right expand marginLeft={30} marginBottom={-30}>
          <FusebitAcmeGraphic expand minWidth={450} />
        </Box>
      </Box>
    </Box>
  );
}

// -------------------
// Exported Components
// -------------------

export function SolutionSection() {
  return (
    <FusebitSection paddingBottom={40} maxWidth="100%" background={FusebitColor.orange}>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion />
      </MediaQuery>
    </FusebitSection>
  );
}
