import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitText, FusebitTextType } from '@5qtrs/fusebit-text';

// --------------
// Exported Types
// --------------

export type FusebitSectionProps = {
  header?: string;
  noBreak?: boolean;
  tocText?: string;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitSection({
  header,
  noBreak,
  paddingBottom,
  maxWidth,
  background,
  children,
  ...rest
}: FusebitSectionProps) {
  return (
    <Box
      width="100vw"
      center
      marginLeft={-20}
      marginRight={-20}
      paddingLeft={20}
      paddingRight={20}
      background={background}
      paddingBottom={paddingBottom || 20}
      {...rest}
    >
      <Box width="100%" vertical maxWidth={maxWidth || 1000}>
        {header ? (
          <Box marginBottom={noBreak ? undefined : 10} marginTop={20}>
            <FusebitText type={FusebitTextType.header3}>{header}</FusebitText>
          </Box>
        ) : null}
        <FusebitText width="100%">{children as React.ReactNode}</FusebitText>
      </Box>
    </Box>
  );
}
