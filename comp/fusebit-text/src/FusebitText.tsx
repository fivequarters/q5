import React from 'react';
import styled from 'styled-components';
import { FusebitColor } from '@5qtrs/fusebit-color';

// ------------------
// Internal Functions
// ------------------

function getWidth(width: any) {
  if (typeof width === 'string') {
    return width;
  }
  return width !== undefined ? `${width}px` : 'auto';
}

function getMinWidth(minWidth: any, width: any) {
  if (typeof minWidth === 'string') {
    return minWidth;
  }
  return minWidth !== undefined || typeof width === 'number' ? `${minWidth || width}px` : 'auto';
}

function getMaxWidth(maxWidth: any, width: any) {
  if (typeof maxWidth === 'string') {
    return maxWidth;
  }
  return maxWidth !== undefined || typeof width === 'number' ? `${maxWidth || width}px` : 'auto';
}

// -------------------
// Internal Components
// -------------------

type FusebitResolvedTextProps = {
  inline: boolean;
  color: string;
  hover: string;
  font: string;
  weight: number;
  fontSize: number;
  lineHeight: number;
  center?: boolean;
} & React.BaseHTMLAttributes<HTMLSpanElement>;

const Container = styled.span<FusebitResolvedTextProps>`
  color: ${(props) => props.color};
  display: ${(props) => (props.inline ? 'inline-block' : 'block')};
  font-family: ${(props) => `'${props.font}'`}, sans-serif;
  font-weight: ${(props) => props.weight};
  line-height: ${(props) => props.lineHeight}px;
  font-size: ${(props) => props.fontSize}px;
  text-align: ${(props) => (props.center ? 'center' : 'inherit')};
  &:hover {
    ${(props) => (props.hover ? `color: ${props.hover};` : '')}
  }
`;

// --------------
// Exported Types
// --------------

export const fusebitFonts = 'Nunito Sans:200,400,600,700,900;Poppins:200,400,600,700,900';

export enum FusebitTextWeight {
  light = 200,
  regular = 400,
  medium = 600,
  bold = 700,
  black = 900,
}

export enum FusebitTextType {
  header1 = 'header1',
  header2 = 'header2',
  header3 = 'header3',
  header4 = 'header4',
  bodyLarge = 'bodyLarge',
  body = 'body',
  bodySmall = 'bodySmall',
}

export enum FusebitTextFontSize {
  header1 = 42,
  header2 = 38,
  header3 = 22,
  header4 = 18,
  bodyLarge = 20,
  body = 16,
  bodySmall = 14,
}

export enum FusebitTextLineHeight {
  header1 = 54,
  header2 = 44,
  header3 = 32,
  header4 = 24,
  bodyLarge = 32,
  body = 26,
  bodySmall = 24,
}

export enum FusebitTextFont {
  primary = 'Nunito Sans',
  secondary = 'Poppins',
  nunitoSans = 'Nunito Sans',
  poppins = 'Poppins',
}

export type FusebitTextProps = {
  color?: FusebitColor;
  hover?: FusebitColor;
  font?: FusebitTextFont;
  weight?: FusebitTextWeight;
  type?: FusebitTextType;
  fontSize?: number;
  lineHeight?: number;
  inline?: boolean;
  center?: boolean;
  width?: string | number;
  maxWidth?: string | number;
  minWidth?: string | number;
} & React.BaseHTMLAttributes<HTMLSpanElement>;

// -------------------
// Exported Components
// -------------------

export function FusebitText({
  color,
  hover,
  font,
  weight,
  type,
  fontSize,
  lineHeight,
  inline,
  center,
  width,
  minWidth,
  maxWidth,
  style,
  children,
  ...rest
}: FusebitTextProps) {
  color = color || FusebitColor.black;
  type = type || FusebitTextType.body;

  switch (type) {
    case FusebitTextType.bodyLarge:
      font = font || FusebitTextFont.secondary;
      weight = weight || FusebitTextWeight.regular;
      lineHeight = lineHeight || FusebitTextLineHeight.bodyLarge;
      fontSize = fontSize || FusebitTextFontSize.bodyLarge;
      inline = inline !== undefined ? inline : true;
      break;
    case FusebitTextType.bodySmall:
      font = font || FusebitTextFont.secondary;
      weight = weight || FusebitTextWeight.regular;
      lineHeight = lineHeight || FusebitTextLineHeight.bodySmall;
      fontSize = fontSize || FusebitTextFontSize.bodySmall;
      inline = inline !== undefined ? inline : true;
      break;
    case FusebitTextType.header1:
      font = font || FusebitTextFont.primary;
      weight = weight || FusebitTextWeight.black;
      lineHeight = lineHeight || FusebitTextLineHeight.header1;
      fontSize = fontSize || FusebitTextFontSize.header1;
      inline = inline !== undefined ? inline : false;
      break;
    case FusebitTextType.header2:
      font = font || FusebitTextFont.primary;
      weight = weight || FusebitTextWeight.bold;
      lineHeight = lineHeight || FusebitTextLineHeight.header2;
      fontSize = fontSize || FusebitTextFontSize.header2;
      inline = inline !== undefined ? inline : false;
      break;
    case FusebitTextType.header3:
      font = font || FusebitTextFont.secondary;
      weight = weight || FusebitTextWeight.bold;
      lineHeight = lineHeight || FusebitTextLineHeight.header3;
      fontSize = fontSize || FusebitTextFontSize.header3;
      inline = inline !== undefined ? inline : false;
      break;
    case FusebitTextType.header4:
      font = font || FusebitTextFont.secondary;
      weight = weight || FusebitTextWeight.bold;
      lineHeight = lineHeight || FusebitTextLineHeight.header4;
      fontSize = fontSize || FusebitTextFontSize.header4;
      inline = inline !== undefined ? inline : false;
      break;
    default:
      font = font || FusebitTextFont.secondary;
      weight = weight || FusebitTextWeight.regular;
      lineHeight = lineHeight || FusebitTextLineHeight.body;
      fontSize = fontSize || FusebitTextFontSize.body;
      inline = inline !== undefined ? inline : true;
      break;
  }

  if (width || minWidth || maxWidth) {
    const newStyle: { [index: string]: any } = {};
    if (style) {
      for (const key in style) {
        newStyle[key] = (style as any)[key];
      }
    }
    style = newStyle;

    if (width) {
      style.width = getWidth(width);
    }

    if (minWidth || width) {
      style.minWidth = getMinWidth(minWidth, width);
    }
    if (maxWidth || width) {
      style.maxWidth = getMaxWidth(maxWidth, width);
    }
  }

  return (
    <Container
      color={color}
      hover={hover || ''}
      font={font}
      weight={weight}
      lineHeight={lineHeight}
      fontSize={fontSize}
      inline={inline}
      center={center}
      style={style}
      {...rest}
    >
      {children}
    </Container>
  );
}
