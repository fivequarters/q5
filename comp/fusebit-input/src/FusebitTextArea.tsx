import React, { useState } from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { FusebitTextFont, FusebitTextFontSize, FusebitTextLineHeight } from '@5qtrs/fusebit-text';

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

const TextArea = styled.textarea`
  color: ${() => FusebitColor.dark};
  border: none;
  font-family: ${() => `'${FusebitTextFont.secondary}'`}, sans-serif;
  font-size: ${() => `'${FusebitTextFont.secondary}'`}, sans-serif;
  line-height: ${() => FusebitTextLineHeight.body}px;
  font-size: ${() => FusebitTextFontSize.body}px;
  outline: none;
  resize: none;
  &::placeholder {
    color: ${() => FusebitColor.gray};
  }
`;

const StyledBox = styled(Box)`
  border-radius: 25px;
  border: 1px solid ${() => opacity(FusebitColor.gray, 0.3)};
  padding: 10px 18px;
  &.focus {
    box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);
  }
`;

// --------------
// Exported Types
// --------------

export type FusebitTextAreaProps = {
  placeholder?: string;
  initialValue?: string;
  cols?: number;
  rows?: number;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitTextArea({
  width,
  cols,
  rows,
  onChange,
  placeholder,
  initialValue,
  className,
  onFocusCapture,
  onBlurCapture,
  ...rest
}: FusebitTextAreaProps) {
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
    <StyledBox
      width={width || 300}
      noWrap
      background={FusebitColor.white}
      className={[focused ? 'focus' : '', className].join(' ')}
      scroll
      {...rest}
    >
      <Box expand>
        <form onSubmit={ignore}>
          <TextArea
            placeholder={placeholder}
            cols={cols || 30}
            rows={rows || 5}
            onChange={onChangeWrapped}
            onFocusCapture={onFocusCaptureWrapped}
            onBlurCapture={onBlurCaptureWrapped}
            value={value}
          />
        </form>
      </Box>
    </StyledBox>
  );
}
