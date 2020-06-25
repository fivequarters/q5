import React, { useState } from 'react';
import styled from 'styled-components';
import { ScrollStick } from '@5qtrs/scroll-stick';
import { Box, BoxProps } from '@5qtrs/box';

// -------------------
// Internal Components
// -------------------

const BoxStyled = styled(Box)<NavBarProps>`
  &.sticky {
    border-bottom: ${(props) => (props.noBorder ? '0;' : props.borderOnScroll || '1px solid #d5d8dc')};
  }
`;

// --------------
// Exported Types
// --------------

export type NavBarProps = {
  onStickyChange?: (isSticky: boolean) => void;
  borderOnScroll?: string;
  noBorder?: boolean;
  sticky?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function NavBar({ onStickyChange, sticky, className, height, children, ...rest }: NavBarProps) {
  const [isSticky, setSticky] = useState(false);

  function onStickyChangeWrapped(isNowSticky: boolean) {
    setSticky(isNowSticky);
    if (onStickyChange) {
      onStickyChange(isNowSticky);
    }
  }

  return (
    <ScrollStick sticky={sticky} useWindowScroll onStickyChange={onStickyChangeWrapped}>
      <BoxStyled {...rest} className={[sticky || isSticky ? 'sticky' : '', className].join(' ')}>
        {children}
      </BoxStyled>
    </ScrollStick>
  );
}
