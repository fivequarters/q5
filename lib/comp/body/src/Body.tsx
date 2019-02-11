import React from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';

// -------------------
// Internal Components
// -------------------

const Global = createGlobalStyle<{}>`
  html, body, #app {
    height: 100%;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0px;
  }
`;

const Container = styled.div`
  height: 100%;
`;

// -------------------
// Exported Interfaces
// -------------------

export type BodyProps = {
  theme?: any;
  children?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Body({ children, theme = {}, ...rest }: BodyProps) {
  return (
    <ThemeProvider theme={theme}>
      <>
        <Global />
        <Container {...rest}>{children}</Container>
      </>
    </ThemeProvider>
  );
}
