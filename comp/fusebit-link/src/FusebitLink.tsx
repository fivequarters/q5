import React, { useState } from 'react';
import ReactGA from 'react-ga';
import { HashLink as Link, HashLinkProps as RouterLinkProps } from 'react-router-hash-link';
import styled from 'styled-components';
import { FusebitColor, darken, lighten } from '@5qtrs/fusebit-color';

// ------------------
// Internal Variables
// ------------------

let listenerAdded = false;
let tabUsage = false;
let lastFocus: any;

// ------------------
// Internal Functions
// ------------------

function keyupListener(event: any) {
  if (event.which === 9) {
    tabUsage = true;
    lastFocus((current: boolean) => !current);
    document.body.removeEventListener('keyup', keyupListener);
  }
}

// -------------------
// Internal Components
// -------------------

type LinkProps = {
  color: FusebitColor;
  hover: FusebitColor;
  visited: FusebitColor;
} & React.BaseHTMLAttributes<HTMLAnchorElement>;

type ExtendedRouterLinkProps = {
  color: FusebitColor;
  hover: FusebitColor;
  visited: FusebitColor;
} & RouterLinkProps;

const StyledAnchor = styled.a<LinkProps>`
  color: ${props => props.color};
  position: relative;
  text-decoration: none;
  border-radius: 5px;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);

  &:hover,
  &:visited:hover {
    color: ${props => props.hover};
    cursor: pointer;
  }

  &:visited {
    color: ${props => props.visited};
  }

  &:focus,
  &:active {
    outline: none;
  }

  &.tabUsage:focus::after {
    border-radius: 5px;
    box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0px;
    left: -3px;
    width: 100%;
    height: 100%;
    padding: 0 3px;
  }
`;

const StyledOutboundLink = styled(ReactGA.OutboundLink)<ExtendedRouterLinkProps>`
  color: ${props => props.color};
  position: relative;
  text-decoration: none;
  border-radius: 5px;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);

  &:hover,
  &:visited:hover {
    color: ${props => props.hover};
    cursor: pointer;
  }

  &:visited {
    color: ${props => props.visited};
  }

  &:focus,
  &:active {
    outline: none;
  }

  &.tabUsage:focus::after {
    border-radius: 5px;
    box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0px;
    left: -3px;
    width: 100%;
    height: 100%;
    padding: 0 3px;
  }
`;

const StyledLink = styled(Link)<ExtendedRouterLinkProps>`
  color: ${props => props.color};
  position: relative;
  text-decoration: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);

  &:hover,
  &:visited:hover {
    color: ${props => props.hover};
    cursor: pointer;
  }

  &:visited {
    color: ${props => props.visited};
  }

  &:focus,
  &:active {
    outline: none;
  }

  &.tabUsage:focus::after {
    border-radius: 5px;
    box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0px;
    left: -3px;
    width: 100%;
    height: 100%;
    padding: 0 3px;
  }
`;

// --------------
// Exported Types
// --------------

export type FusebitLinkProps = {
  to?: string;
  href?: string;
  openTab?: boolean;
  color?: FusebitColor;
  hover?: FusebitColor;
  noHover?: boolean;
  visited?: FusebitColor;
  noVisit?: boolean;
  noFocus?: boolean;
  gaCategory?: string;
  gaAction?: string;
  gaLabel?: string;
  scrollOffset?: number;
} & React.BaseHTMLAttributes<HTMLAnchorElement>;

// -------------------
// Exported Components
// -------------------

export function FusebitLink({
  onClick,
  onFocusCapture,
  to,
  href,
  openTab,
  color,
  hover,
  noHover,
  visited,
  noVisit,
  noFocus,
  gaCategory,
  gaAction,
  gaLabel,
  children,
  className,
  tabIndex,
  scrollOffset,
  ...rest
}: FusebitLinkProps) {
  const [__, render] = useState(false);

  function gaEvent() {
    if (gaCategory) {
      ReactGA.event({ category: gaCategory, action: gaAction || 'link-click', label: gaLabel });
    }
  }

  function onClickWrapped(event: any) {
    if (onClick) {
      onClick(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    gaEvent();
  }

  function onFocusCaptureWrapped(event: any) {
    lastFocus = render;
    if (tabUsage) {
      render(current => !current);
    }
    if (onFocusCapture) {
      onFocusCapture(event);
    }
  }

  function onScroll(element: any) {
    if (element) {
      window.scrollTo(0, element.getBoundingClientRect().top + window.pageYOffset - (scrollOffset || 100));
    }
  }

  if (!listenerAdded) {
    listenerAdded = true;
    document.body.addEventListener('keyup', keyupListener);
  }

  className = tabUsage && !noFocus ? `${className} tabUsage` : className;
  color = color || FusebitColor.red;
  hover = noHover ? color : hover || lighten(color || FusebitColor.cyan, 15);
  visited = noVisit ? color : visited || darken(color || FusebitColor.orange, 15);

  return to ? (
    <StyledLink
      tabIndex={tabIndex || 0}
      to={to || ''}
      className={className}
      color={color}
      hover={hover}
      visited={visited}
      onClick={onClickWrapped}
      target={openTab ? '_blank' : '_self'}
      onFocusCapture={onFocusCaptureWrapped}
      scroll={onScroll}
      {...rest}
    >
      {children}
    </StyledLink>
  ) : href && href.toLowerCase().indexOf('http') === 0 ? (
    <StyledOutboundLink
      tabIndex={tabIndex || 0}
      to={href}
      eventLabel={gaLabel || href}
      className={className}
      color={color}
      hover={hover}
      visited={visited}
      target={openTab ? '_blank' : '_self'}
      onFocusCapture={onFocusCaptureWrapped}
      {...rest}
    >
      {children}
    </StyledOutboundLink>
  ) : (
    <StyledAnchor
      tabIndex={tabIndex || 0}
      href={href || undefined}
      className={className}
      color={color}
      hover={hover}
      visited={visited}
      target={openTab ? '_blank' : '_self'}
      onClick={onClickWrapped}
      onFocusCapture={onFocusCaptureWrapped}
      {...rest}
    >
      {children}
    </StyledAnchor>
  );
}
