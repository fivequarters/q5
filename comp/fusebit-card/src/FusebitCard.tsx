import React from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';

// ------------------
// Internal Constants
// ------------------

const lightGray = opacity(FusebitColor.gray, 0.3);

// -------------------
// Internal Components
// -------------------

const StyledBox = styled(Box)`
  border-radius: 10px;
  border: 1px solid ${() => lightGray};
  &.active {
    box-shadow: 0 3px 6px ${lightGray};
    border: 1px solid ${() => lightGray};
  }
`;

// --------------
// Exported Types
// --------------

export type FusebitCardProps = {
  inActive?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitCard({ background, inActive, children, className, ...rest }: FusebitCardProps) {
  background = background || FusebitColor.white;
  return (
    <StyledBox background={background} className={[!inActive ? 'active' : '', className].join(' ')} {...rest}>
      {children}
    </StyledBox>
  );
}
