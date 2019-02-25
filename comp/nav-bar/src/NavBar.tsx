import { ScrollStick } from '@5qtrs/scroll-stick';
import React, { useState } from 'react';
import styled from 'styled-components';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  width: 100%;
  padding: 20px;
  &.sticky {
    border-bottom: 1px solid #d5d8dc;
  }
`;

// --------------
// Exported Types
// --------------

export type NavBarProps = {
  onStickyChange?: (isSticky: boolean) => void;
  sticky?: boolean;
  useWindowScroll?: boolean;
  children?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export const NavBarSpacer = styled.div`
  flex: 1;
`;

export function NavBar({ children, sticky, useWindowScroll, onStickyChange, className, ...rest }: NavBarProps) {
  const [isSticky, setSticky] = useState(false);

  function onChange(isNowSticky: boolean) {
    setSticky(isNowSticky);
    if (onStickyChange) {
      onStickyChange(isNowSticky);
    }
  }

  const adjustedClassName = `${className ? className + ' ' : ''}${isSticky ? 'sticky' : ''}`;
  const container = (
    <Container {...rest} className={adjustedClassName}>
      {children}
    </Container>
  );

  return !sticky ? (
    container
  ) : (
    <ScrollStick useWindowScroll={useWindowScroll} style={{ width: '100%' }} onStickyChange={onChange}>
      {container}
    </ScrollStick>
  );
}
