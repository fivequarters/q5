import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitText, FusebitTextType } from '@5qtrs/fusebit-text';
import { FusebitBreak } from './FusebitBreak';

// --------------
// Exported Types
// --------------

export enum FusebitHeaderType {
  page = 'header1',
  section = 'header3',
  subSection = 'header4',
}

export type FusebitHeaderProps = {
  type?: FusebitHeaderType;
  noBreak?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitHeader({ children, type, noBreak, width, ...rest }: FusebitHeaderProps) {
  type = type || FusebitHeaderType.section;
  return (
    <Box vertical width={width || '100%'} {...rest}>
      <FusebitText type={type as any}>{children}</FusebitText>
      {noBreak ? null : <FusebitBreak />}
    </Box>
  );
}
