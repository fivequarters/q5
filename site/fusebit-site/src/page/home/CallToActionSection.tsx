import React from 'react';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitEmail } from '@5qtrs/fusebit-contact';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';

// ------------------
// Internal Constants
// ------------------

const callToActionText = 'Sort out your integrations story today:';

// -------------------
// Internal Components
// -------------------

function MobileVersion({ onEmailSubmit }: CallToActionSectionProps) {
  return (
    <Box center middle marginBottom={10}>
      <Box center marginTop={20} marginBottom={20}>
        <FusebitText type={FusebitTextType.body} color={FusebitColor.white}>
          {callToActionText}
        </FusebitText>
      </Box>
      <FusebitEmail onTextSubmit={onEmailSubmit} size={18} />
    </Box>
  );
}

function NonMobileVersion({ onEmailSubmit }: CallToActionSectionProps) {
  return (
    <Box center middle gap={20} marginTop={20}>
      <Box>
        <FusebitText type={FusebitTextType.bodyLarge} weight={FusebitTextWeight.light} color={FusebitColor.white}>
          {callToActionText}
        </FusebitText>
      </Box>
      <FusebitEmail onTextSubmit={onEmailSubmit} width={500} />
    </Box>
  );
}

// --------------
// Exported Types
// --------------

export type CallToActionSectionProps = {
  onEmailSubmit?: (email: string) => void;
};

// -------------------
// Exported Components
// -------------------

export function CallToActionSection({ ...rest }: CallToActionSectionProps) {
  return (
    <FusebitSection maxWidth={1200} paddingBottom={20} center background={FusebitColor.dark}>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion {...rest} />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion {...rest} />
      </MediaQuery>
    </FusebitSection>
  );
}
