import React, { useLayoutEffect } from 'react';
import styled from 'styled-components';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 999;
`;

// --------------
// Exported Types
// --------------

export type ModalProps = {
  visible?: boolean;
  children?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Modal({ children, visible, style, ...rest }: ModalProps) {
  useLayoutEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'visible';
      };
    }
  }, [visible]);

  style = style || {};
  style.display = visible ? '' : 'none';

  return (
    <Container {...rest} style={style}>
      {children}
    </Container>
  );
}
