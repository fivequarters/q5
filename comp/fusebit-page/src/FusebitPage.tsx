import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType } from '@5qtrs/fusebit-text';
import { BackgroundDetail } from './BackgroundDetail';
import { FusebitSection } from './FusebitSection';

// --------------
// Exported Types
// --------------

export type FusebitPageProps = {
  header?: string;
  updatedOn?: string;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitPage({ width, minHeight, marginTop, header, updatedOn, children, ...rest }: FusebitPageProps) {
  return (
    <Box vertical width="100%">
      <MediaQuery mediaType={MediaType.mobile}>
        <BackgroundDetail isMobile />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <BackgroundDetail />
      </MediaQuery>
      <Box vertical center width={width || '100%'} minHeight={minHeight || 800} marginTop={marginTop || 40} {...rest}>
        {header ? (
          <FusebitSection marginBottom={60}>
            <FusebitText type={FusebitTextType.header1}>{header}</FusebitText>
            {updatedOn ? <FusebitText type={FusebitTextType.bodySmall}>Last updated on {updatedOn}</FusebitText> : null}
          </FusebitSection>
        ) : null}
        {children}
      </Box>
    </Box>
  );
}
