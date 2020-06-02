import React, { useRef, useLayoutEffect } from 'react';
import styled from 'styled-components';
import Prism from 'prismjs';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';
import './languages';

// -------------------
// Internal Components
// -------------------

const Code = styled.code`
  color: black;
  background: none;
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 1em;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;
  tab-size: 4;
  hyphens: none;
  text-shadow: none;

  /* Inline code */
  &:not(pre) > code[class*='language-'] {
    padding: 0.1em;
    border-radius: 0.3em;
    white-space: normal;
  }

  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: slategray;
  }

  .token.punctuation {
    color: #999;
  }

  .namespace {
    opacity: 0.7;
  }

  .token.property,
  .token.tag,
  .token.boolean,
  .token.number,
  .token.constant,
  .token.symbol,
  .token.deleted {
    color: #905;
  }

  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin,
  .token.inserted {
    color: #690;
  }

  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string {
    color: #9a6e3a;
  }

  .token.atrule,
  .token.attr-value,
  .token.keyword {
    color: #07a;
  }

  .token.function,
  .token.class-name {
    color: #dd4a68;
  }

  .token.regex,
  .token.important,
  .token.variable {
    color: #e90;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }
  .token.italic {
    font-style: italic;
  }

  .token.entity {
    cursor: help;
  }
`;

// --------------
// Exported Types
// --------------

export enum FusebitCodeLanguage {
  js = 'js',
  markup = 'markup',
  css = 'css',
  ts = 'ts',
  json = 'json',
  jsx = 'jsx',
  bash = 'bash',
  none = 'none',
}

export type FusebitCodeProps = {
  language?: FusebitCodeLanguage;
  noMargin?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitCode({
  children,
  noMargin,
  marginTop,
  marginBottom,
  borderRadius,
  language,
  background,
  padding,
  ...rest
}: FusebitCodeProps) {
  const codeRef = useRef(null);

  useLayoutEffect(() => {
    if (codeRef && codeRef.current && language !== FusebitCodeLanguage.none) {
      Prism.highlightElement(codeRef.current as any);
    }
  }, [children]);

  return (
    <Box
      vertical
      background={background || FusebitColor.lightBlue}
      padding={padding || 20}
      borderRadius={borderRadius || 10}
      marginTop={marginTop || noMargin ? undefined : 20}
      marginBottom={marginBottom || noMargin ? undefined : 20}
      scroll
      {...rest}
    >
      <Code ref={codeRef} className={`language-${language || FusebitCodeLanguage.js}`}>
        {children || ''}
      </Code>
    </Box>
  );
}
