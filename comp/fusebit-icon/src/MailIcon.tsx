import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type MailIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function MailIcon({ size, color, expand, ...rest }: MailIconProps) {
  size = !expand && !size ? 26 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 72 57" fill="none">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M7.125 0H64.125C68.0437 0 71.25 3.20625 71.25 7.125V49.875C71.25 53.7938 68.0437 57 64.125 57H7.125C3.20625 57 0 53.7938 0 49.875L0.035625 7.125C0.035625 3.20625 3.20625 0 7.125 0ZM35.625 32.0625L64.125 14.25V7.125L35.625 24.9375L7.125 7.125V14.25L35.625 32.0625Z"
          fill="white"
        />
      </svg>
    </Box>
  );
}
