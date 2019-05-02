import { getTheme } from './getTheme';

function applyFont(result: string, font: any) {
  if (font.name) {
    result += `font-family: '${font.name}'`;
    if (font.type) {
      result += `, ${font.type};`;
    }
  }
  if (font.color) {
    result += `color: ${font.color};`;
  }
  if (font.size) {
    result += `font-size: ${font.size}px;`;
  }
  if (font.weight) {
    result += `font-weight: ${font.weight};`;
  }
  if (font.align) {
    result += `text-align: ${font.align};`;
  }
  if (font.variant) {
    result += `font-variant: ${font.variant};`;
  }
  return result;
}

export function applyTheme(props: any, ...path: Array<string | number>) {
  const theme = getTheme(props, ...path);
  let result = '';
  if (theme.styles) {
    result += theme.styles;
  }
  if (theme.background) {
    result += `background-color: ${theme.background};`;
  }
  if (theme.font) {
    const font = theme.font;
    result = applyFont(result, font);
    if (font.media) {
      for (const mediaSize in font.media) {
        result += `@media (max-width: ${mediaSize}) {`;
        result = applyFont(result, font.media[mediaSize]);
        result += '}';
      }
    }
    if (theme.color) {
      result += `color: ${theme.color};`;
    }
    if (theme.hover) {
      result += `&:hover { color: ${theme.hover}; }`;
    }
    if (theme.enabled) {
      result += `&.enabled { color: ${theme.enabled}; }`;
    }
    if (theme.enabledHover) {
      result += `&.enabled:hover { color: ${theme.enabledHover}; }`;
    }
    if (theme.placeholder) {
      result += `&::placeholder { color: ${theme.placeholder}; }`;
    }
  }
  return result;
}
