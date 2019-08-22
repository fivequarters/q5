import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitText, FusebitTextType } from '@5qtrs/fusebit-text';
import { FusebitColor } from '@5qtrs/fusebit-color';

// --------------
// Exported Types
// --------------

export type FusebitQuoteProps = {
  small?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitQuote({ margin, small, children, ...rest }: FusebitQuoteProps) {
  margin = margin || 20;
  const halfMargin = margin / 2;
  return (
    <Box margin={small ? halfMargin : margin} marginLeft={small ? 0 : -halfMargin} noWrap {...rest}>
      <Box width={2} marginRight={halfMargin} background={FusebitColor.red} style={{ borderRadius: 10 }} stretch />
      <Box margin={small ? undefined : halfMargin}>
        <FusebitText type={small ? FusebitTextType.body : FusebitTextType.bodyLarge}>{children}</FusebitText>
      </Box>
    </Box>
  );
}
