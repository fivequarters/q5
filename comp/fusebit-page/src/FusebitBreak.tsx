import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type FusebitBreakProps = {} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitBreak({ height, ...rest }: FusebitBreakProps) {
  return <Box height={20} width="100%" {...rest} />;
}
