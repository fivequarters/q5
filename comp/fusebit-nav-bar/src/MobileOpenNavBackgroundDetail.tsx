import React from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';

// -------------------
// Internal Components
// -------------------

const StyledBox = styled(Box)`
  position: relative;
  pointer-events: none;
`;

// -------------------
// Exported Components
// -------------------

export function MobileOpenNavBackgroundDetail({ width, ...rest }: BoxProps) {
  return (
    <StyledBox width="100%" {...rest}>
      <svg
        width="361"
        height="416"
        viewBox="0 0 361 416"
        fill="none"
        style={{ position: 'absolute', top: -75, right: -20, pointerEvents: 'none' }}
      >
        <path
          opacity="0.3"
          d="M17.9717 398.057C-5.32392 374.799 -5.32392 337.107 17.9717 313.849L399.503 -67.0566C422.799 -90.3145 460.555 -90.3145 483.851 -67.0566C507.147 -43.7991 507.147 -6.10645 483.851 17.151L102.32 398.057C79.0238 421.315 41.2679 421.315 17.9717 398.057ZM611.028 144.12L356.674 398.057C333.378 421.315 295.622 421.315 272.326 398.057C249.03 374.799 249.03 337.107 272.326 313.849L526.68 59.912C549.976 36.6541 587.732 36.6541 611.028 59.912C634.324 83.1694 634.324 120.862 611.028 144.12Z"
          fill="none"
          stroke={FusebitColor.gray.toString()}
        />
      </svg>
    </StyledBox>
  );
}
