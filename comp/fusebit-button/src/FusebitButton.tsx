import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga';
import styled, { keyframes } from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitLink, FusebitLinkProps } from '@5qtrs/fusebit-link';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';

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

type ButtonProps = {
  small: boolean;
  color: FusebitColor;
  clickColor?: FusebitColor;
  outline: boolean;
  padding: number;
  tabUsage: boolean;
} & BoxProps;

const ripple = keyframes`
  0% {
    transform: scale(0, 0);
    opacity: 1;
  }
  20% {
    transform: scale(25, 25);
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(100, 100);
  }
`;

const Button = styled(Box)<ButtonProps>`
  position: relative;
  overflow: hidden;
  border-radius: 500px;
  height: ${(props) => (props.small ? 40 : 48)}px;
  text-align: center;
  vertical-align: middle;
  border: ${(props) => (props.outline ? `1px solid ${props.color}` : 'none')};
  background-color: ${(props) => (props.outline ? FusebitColor.white : props.color)};
  padding: 0 ${(props) => props.padding}px;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);

  &:hover {
    cursor: pointer;
  }

  &:focus {
    outline: none;
  }

  &.focus {
    ${(props) => (props.tabUsage ? 'box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);' : '')}
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: ${(props) =>
      props.clickColor || (props.outline ? opacity(props.color, 0.1) : 'rgba(255, 255, 255, 0.3)')};
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
  }

  &.clicked::after {
    animation: ${ripple} 1s ease-out;
  }
`;

// --------------
// Exported Types
// --------------

export type FusebitButtonProps = {
  click?: boolean;
  small?: boolean;
  color?: FusebitColor;
  clickColor?: FusebitColor;
  disabledColor?: FusebitColor;
  noFocus?: boolean;
  outline?: boolean;
  disabled?: boolean;
  padding?: number;
  gaCategory?: string;
  gaAction?: string;
  gaLabel?: string;
} & BoxProps &
  FusebitLinkProps;

// -------------------
// Exported Components
// -------------------

export function FusebitButton({
  click,
  color,
  clickColor,
  disabledColor,
  small,
  outline,
  disabled,
  noFocus,
  onClick,
  onKeyUp,
  onFocusCapture,
  onBlurCapture,
  padding,
  gaCategory,
  gaAction,
  gaLabel,
  children,
  className,
  tabIndex,
  href,
  to,
  openTab,
  ...rest
}: FusebitButtonProps) {
  const [clicked, setClicked] = useState(false);
  const [__, render] = useState(false);
  const [focus, setFocus] = useState(false);

  function onClickCore() {
    setClicked(true);
    if (gaCategory) {
      ReactGA.event({
        category: gaCategory,
        action: gaAction || 'button-click',
        label: gaLabel || undefined,
      });
    }
  }

  function onClickWrapped(event: any) {
    if (!disabled) {
      if (onClick) {
        onClick(event);
      }
      if (!event.defaultPrevented) {
        onClickCore();
      }
    }
  }

  function onFocusCaptureWrapped(event: any) {
    if (onFocusCapture) {
      onFocusCapture(event);
    }

    if (!event.defaultPrevented) {
      setFocus(true);
      lastFocus = render;
      if (tabUsage) {
        render((current) => !current);
      }
    }
  }

  function onBlurCaptureWrapped(event: any) {
    if (onBlurCapture) {
      onBlurCapture(event);
    }

    if (!event.defaultPrevented) {
      setFocus(false);
    }
  }

  function onKeyUpWrapped(event: any) {
    if (!disabled) {
      if (onKeyUp) {
        onKeyUp(event);
      }
      if (!event.defaultPrevented && event.key === 'Enter') {
        onClickCore();
      }
    }
  }

  function onLinkFocus() {
    setFocus(true);
    lastFocus = render;
    if (tabUsage) {
      render((current) => !current);
    }
  }

  function onLinkBlur() {
    setFocus(false);
  }

  if (!listenerAdded) {
    listenerAdded = true;
    document.body.addEventListener('keyup', keyupListener);
  }

  if (click && !clicked) {
    onClickCore();
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (clicked) {
      timeout = setTimeout(() => setClicked(false), 500);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [clicked]);

  const isLink = href || to;
  const resolvedColor = disabled ? disabledColor || FusebitColor.gray : color || FusebitColor.red;

  const button = (
    <Button
      tabIndex={isLink || noFocus ? -1 : tabIndex || 0}
      middle
      center
      {...rest}
      className={[clicked ? 'clicked' : '', focus && !noFocus ? 'focus' : '', className].join(' ')}
      padding={padding === undefined ? (small ? 18 : 24) : padding}
      small={small || false}
      color={resolvedColor}
      clickColor={clickColor}
      outline={outline || false}
      onClick={onClickWrapped}
      onFocusCapture={onFocusCaptureWrapped}
      onBlurCapture={onBlurCaptureWrapped}
      onKeyUp={onKeyUpWrapped}
      tabUsage={tabUsage}
    >
      <FusebitText
        color={outline ? resolvedColor : FusebitColor.white}
        weight={FusebitTextWeight.bold}
        type={small ? FusebitTextType.bodySmall : FusebitTextType.body}
      >
        {children}
      </FusebitText>
    </Button>
  );

  return isLink ? (
    <FusebitLink
      noFocus
      href={href}
      to={to}
      openTab={openTab}
      onFocusCapture={onLinkFocus}
      onBlurCapture={onLinkBlur}
      onClick={onClickWrapped}
    >
      {button}
    </FusebitLink>
  ) : (
    button
  );
}
