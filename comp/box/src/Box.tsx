import React from 'react';
import styled from 'styled-components';

// ------------------
// Internal Functions
// ------------------

function ignore(event: any) {
  event.stopPropagation();
}

function getAlignItems(props: BoxProps) {
  if (props.vertical) {
    return props.center ? 'center' : props.right ? 'flex-end' : 'flex-start';
  }
  return props.middle ? 'center' : props.bottom ? 'flex-end' : 'flex-start';
}

function getJustifyContent(props: BoxProps) {
  if (props.vertical) {
    return props.middle ? 'center' : props.bottom ? 'flex-end' : 'flex-start';
  }
  return props.center ? 'center' : props.right ? 'flex-end' : 'flex-start';
}

function getWidth(width: any) {
  if (typeof width === 'string') {
    return width;
  }
  return width !== undefined ? `${width}px` : 'auto';
}

function getHeight(height: any) {
  if (typeof height === 'string') {
    return height;
  }
  return height !== undefined ? `${height}px` : 'auto';
}

function getMinWidth(minWidth: any, width: any) {
  if (typeof minWidth === 'string') {
    return minWidth;
  }
  return minWidth !== undefined || typeof width === 'number' ? `${minWidth || width}px` : 'auto';
}

function getMinHeight(minHeight: any, height: any) {
  if (typeof minHeight === 'string') {
    return minHeight;
  }
  return minHeight !== undefined || typeof height === 'number' ? `${minHeight || height}px` : 'auto';
}

function getMaxWidth(maxWidth: any, width: any) {
  if (typeof maxWidth === 'string') {
    return maxWidth;
  }
  return maxWidth !== undefined || typeof width === 'number' ? `${maxWidth || width}px` : 'auto';
}

function getMaxHeight(maxHeight: any, height: any) {
  if (typeof maxHeight === 'string') {
    return maxHeight;
  }
  return maxHeight !== undefined || typeof height === 'number' ? `${maxHeight || height}px` : 'auto';
}

function getCursor(props: BoxProps) {
  if (props.noClick) {
    return '&:hover { cursor: default; }';
  }

  return props.onClick !== undefined ? '&:hover { cursor: pointer; }' : undefined;
}

function getOffsetX(props: ExtendedBoxProps) {
  if (props.offsetX) {
    return props.parentRight ? `right: ${props.offsetX}px;` : `left: ${props.offsetX}px;`;
  }
  return undefined;
}

function getOffsetY(props: ExtendedBoxProps) {
  if (props.offsetY) {
    return props.parentBottom ? `bottom: ${props.offsetY}px;` : `top: ${props.offsetY}px;`;
  }
  return undefined;
}

function getMargin(props: ExtendedBoxProps) {
  const margins = [0, 0, 0, 0];
  if (props.margin !== undefined) {
    margins[0] = props.margin;
    margins[1] = props.margin;
    margins[2] = props.margin;
    margins[3] = props.margin;
  }
  if (props.marginTop !== undefined) {
    margins[0] += props.marginTop;
  }
  if (props.marginRight !== undefined) {
    margins[1] += props.marginRight;
  }
  if (props.marginBottom !== undefined) {
    margins[2] += props.marginBottom;
  }
  if (props.marginLeft !== undefined) {
    margins[3] += props.marginLeft;
  }
  if (margins[1] != margins[3]) {
    return `${margins.join('px ')}px`;
  }

  if (margins[0] != margins[2]) {
    return `${margins[0]}px ${margins[1]}px ${margins[2]}px`;
  }

  if (margins[0] != margins[1]) {
    return `${margins[0]}px ${margins[1]}px`;
  }

  return `${margins[0]}px`;
}

function getPadding(props: ExtendedBoxProps) {
  const paddings = [0, 0, 0, 0];
  if (props.padding !== undefined) {
    paddings[0] = props.padding;
    paddings[1] = props.padding;
    paddings[2] = props.padding;
    paddings[3] = props.padding;
  }
  if (props.paddingTop !== undefined) {
    paddings[0] += props.paddingTop;
  }
  if (props.paddingRight !== undefined) {
    paddings[1] += props.paddingRight;
  }
  if (props.paddingBottom !== undefined) {
    paddings[2] += props.paddingBottom;
  }
  if (props.paddingLeft !== undefined) {
    paddings[3] += props.paddingLeft;
  }
  if (paddings[1] != paddings[3]) {
    return `${paddings.join('px ')}px`;
  }

  if (paddings[0] != paddings[2]) {
    return `${paddings[0]}px ${paddings[1]}px ${paddings[2]}px`;
  }

  if (paddings[0] != paddings[1]) {
    return `${paddings[0]}px ${paddings[1]}px`;
  }

  return `${paddings[0]}px`;
}

// --------------
// Internal Types
// --------------

type ExtendedBoxProps = {
  childOverlay?: boolean;
  parentBottom?: boolean;
  parentRight?: boolean;
} & BoxProps;

// --------------
// Exported Types
// --------------

export type BoxProps = {
  vertical?: boolean;
  center?: boolean;
  middle?: boolean;
  right?: boolean;
  bottom?: boolean;
  expand?: boolean | number;
  stretch?: boolean;
  noWrap?: boolean;
  scroll?: boolean;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  margin?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  padding?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  color?: string;
  background?: string;
  borderRadius?: number;
  gap?: number;
  overlay?: boolean;
  offsetX?: number;
  offsetY?: number;
  noClick?: boolean;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export const StyledBox = styled.div<ExtendedBoxProps>`
  box-sizing: border-box;
  display: flex;
  flex-direction: ${props => (props.vertical ? 'column' : 'row')};
  flex-wrap: ${props => (props.noWrap || props.scroll ? 'nowrap' : 'wrap')};
  margin: ${getMargin};
  padding: ${getPadding};
  color: ${props => props.color || 'inherit'};
  background-color: ${props => props.background || 'inherit'};
  align-self: ${props => (props.stretch ? 'stretch' : 'unset')};
  align-items: ${getAlignItems};
  justify-content: ${getJustifyContent};
  ${getCursor}
  ${getOffsetX}
  ${getOffsetY}
  ${props => (props.borderRadius ? `border-radius: ${props.borderRadius}px;` : undefined)}
  ${props => (props.expand ? `flex: ${typeof props.expand === 'boolean' ? 1 : props.expand};` : undefined)}
  ${props => (props.scroll ? 'overflow: scroll;' : undefined)}
  ${props => (props.overlay ? 'position: relative;' : undefined)}
  ${props => (props.childOverlay ? 'position: absolute;' : undefined)}
`;

export function Box({
  background,
  onClick,
  noClick,
  overlay,
  bottom,
  right,
  gap,
  padding,
  children,
  style,
  width,
  minWidth,
  maxWidth,
  height,
  minHeight,
  maxHeight,
  ...rest
}: BoxProps) {
  const halfGap = (gap || 0) / 2;
  children = (gap
    ? React.Children.map(children, (child: any) =>
        child && child.props
          ? React.cloneElement(child, { margin: ((child.props && child.props.margin) || 0) + halfGap })
          : child
      )
    : children) as React.ReactNode;

  children = (overlay
    ? React.Children.map(children, (child: any) =>
        child && child.props
          ? React.cloneElement(child, {
              childOverlay: true,
              background: child.props.background || 'unset',
              parentBottom: bottom,
              parentRight: right,
            })
          : child
      )
    : children) as React.ReactNode;

  if (width || height || minWidth || minHeight || maxWidth || maxHeight) {
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
    if (height) {
      style.height = getHeight(height);
    }

    if (minWidth || width) {
      style.minWidth = getMinWidth(minWidth, width);
    }

    if (maxWidth || width) {
      style.maxWidth = getMaxWidth(maxWidth, width);
    }

    if (minHeight || height) {
      style.minHeight = getMinHeight(minHeight, height);
    }

    if (maxHeight || height) {
      style.maxHeight = getMaxHeight(maxHeight, height);
    }
  }

  return (
    <StyledBox
      overlay={overlay}
      background={background}
      bottom={bottom}
      right={right}
      padding={(padding || 0) + halfGap}
      onClick={noClick ? ignore : onClick}
      noClick={noClick}
      style={style}
      {...rest}
    >
      {children}
    </StyledBox>
  );
}
