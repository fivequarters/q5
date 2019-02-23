import { loadFonts } from '@5qtrs/font';
import { isObject, isString } from '@5qtrs/type';
import React, { useEffect } from 'react';
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
  fonts?: Array<string>;
  onReady?: () => void;
  children?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Body({ children, theme = {}, fonts = [], onReady, ...rest }: BodyProps) {
  const allFonts: Array<string> = [];
  allFonts.push(...fonts);
  if (theme.fonts && isObject(theme.fonts)) {
    for (const fontKey in theme.fonts) {
      if (fontKey) {
        const font = theme.fonts[fontKey];
        if (isString(font)) {
          allFonts.push(font);
        } else if (isObject(font) && font.name) {
          allFonts.push(font.weight ? `${font.name}:${font.weight}` : font.name);
        }
      }
    }
  }

  async function loadFontAsync() {
    await loadFonts(allFonts);
    if (onReady) {
      onReady();
    }
  }
  useEffect(() => {
    loadFontAsync();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <>
        <Global />
        <Container {...rest}>{children}</Container>
      </>
    </ThemeProvider>
  );
}
