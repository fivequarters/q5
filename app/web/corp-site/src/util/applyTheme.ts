import { getTheme } from './getTheme';

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
    if (theme.color) {
      result += `color: ${theme.color};`;
    }
    if (theme.hover) {
      result += `&:hover { color: ${theme.hover}; }`;
    }
  }
  return result;
}
