import React, { useState } from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { FusebitButton } from '@5qtrs/fusebit-button';
import {
  FusebitText,
  FusebitTextType,
  FusebitTextFont,
  FusebitTextFontSize,
  FusebitTextLineHeight,
} from '@5qtrs/fusebit-text';

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
    if (lastFocus) {
      lastFocus((current: boolean) => !current);
    }
    document.body.removeEventListener('keyup', keyupListener);
  }
}

function ignore(event: any) {
  event.preventDefault();
}

// -------------------
// Internal Components
// -------------------

const Input = styled.input`
  color: ${() => FusebitColor.black};
  border: none;
  font-family: ${() => `'${FusebitTextFont.secondary}'`}, sans-serif;
  font-size: ${() => `'${FusebitTextFont.secondary}'`}, sans-serif;
  line-height: ${() => FusebitTextLineHeight.body}px;
  font-size: ${() => FusebitTextFontSize.body}px;
  outline: none;
  &::placeholder {
    color: ${() => FusebitColor.gray};
  }
  width: 100%;
  height: ${() => FusebitTextLineHeight.body}px;
`;

const StyledBox = styled(Box)`
  border-radius: 500px;
  border: 1px solid ${() => opacity(FusebitColor.gray, 0.3)};
  padding: 10px 18px;
  &.focus {
    box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);
  }
`;

// --------------
// Exported Types
// --------------

export type FusebitTextFieldProps = {
  placeholder?: string;
  initialValue?: string;
  size?: number;
  errorText?: string;
  invalid?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitTextField({
  width,
  size,
  onChange,
  placeholder,
  initialValue,
  className,
  onFocusCapture,
  onBlurCapture,
  errorText,
  invalid,
  ...rest
}: FusebitTextFieldProps) {
  const [value, setValue] = useState(initialValue || '');
  const [focused, setFocused] = useState(false);

  function onChangeWrapped(event: any) {
    if (onChange) {
      onChange(event);
      if (event.defaultPrevented) {
        return;
      }
    }
    const current = event.target.value;
    setValue(current);
  }

  function onFocusCaptureWrapped(event: any) {
    lastFocus = setFocused;
    if (tabUsage) {
      setFocused(true);
    }
    if (onFocusCapture) {
      onFocusCapture(event);
    }
  }

  function onBlurCaptureWrapped(event: any) {
    setFocused(false);
    lastFocus = undefined;
    if (onBlurCapture) {
      onBlurCapture(event);
    }
  }

  if (!listenerAdded) {
    listenerAdded = true;
    document.body.addEventListener('keyup', keyupListener);
  }

  return (
    <>
      <StyledBox
        width={width || 300}
        noWrap
        background={FusebitColor.white}
        className={[focused ? 'focus' : '', className].join(' ')}
        {...rest}
      >
        <Box expand scroll>
          <Input
            width="100%"
            type="text"
            placeholder={placeholder}
            size={size || 30}
            value={value}
            autoCapitalize="none"
            onChange={onChangeWrapped}
            onFocusCapture={onFocusCaptureWrapped}
            onBlurCapture={onBlurCaptureWrapped}
          />
        </Box>
      </StyledBox>
      {invalid ? (
        <Box right bottom width={width || 300} overlay background="unset" height={0}>
          <Box offsetX={20} background="unset">
            <FusebitText fontSize={12} type={FusebitTextType.bodySmall} color={FusebitColor.red}>
              {errorText || 'Invalid'}
            </FusebitText>
          </Box>
        </Box>
      ) : undefined}
    </>
  );
}
