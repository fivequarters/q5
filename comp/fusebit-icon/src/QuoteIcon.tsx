import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type QuoteIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function QuoteIcon({ size, color, expand, ...rest }: QuoteIconProps) {
  size = !expand && !size ? 18 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 24 17" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M23.0155 3.4C20.392 3.57 18.156 5.12833 17.0828 7.28167H20.4814C21.8826 7.28167 23.0453 8.35833 23.0453 9.71833V14.5633C23.0453 15.895 21.9125 17 20.4814 17H15.3238C13.9226 17 12.7599 15.9233 12.7599 14.5633V9.71833C12.7599 4.36333 17.3511 0 22.9857 0C22.9857 0 23.9994 0 23.9994 0.963333C23.9994 0.963333 23.9994 1.13333 23.9994 2.40833C24.0292 3.4 23.0155 3.4 23.0155 3.4ZM10.2258 3.4C7.60228 3.57 5.36632 5.12833 4.29305 7.28167H7.69172C9.09292 7.28167 10.2556 8.35833 10.2556 9.71833V14.5633C10.2556 15.895 9.12274 17 7.69172 17H2.56391C1.1627 17 0 15.9233 0 14.5633V9.71833C0 4.36333 4.59118 0 10.2258 0C10.2258 0 11.2394 0 11.2394 0.963333C11.2394 0.963333 11.2394 1.13333 11.2394 2.40833C11.2394 3.4 10.2258 3.4 10.2258 3.4Z"
          fill={color || FusebitColor.dark}
        />
      </svg>
    </Box>
  );
}
