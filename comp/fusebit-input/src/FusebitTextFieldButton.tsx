import React, { useState, useEffect } from 'react';
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

// -------------------
// Internal Components
// -------------------

const Input = styled.input`
  color: ${() => FusebitColor.dark};
  border: none;
  font-family: ${() => `'${FusebitTextFont.secondary}'`}, sans-serif;
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
  &.focus {
    box-shadow: 0px 0px 3px 2px rgba(0, 123, 255, 0.7);
  }
`;

// --------------
// Exported Types
// --------------

export type FusebitTextFieldButtonProps = {
  placeholder?: string;
  buttonText?: string;
  errorText?: string;
  buttonColor?: FusebitColor;
  buttonDisabled?: boolean;
  buttonDisabledColor?: FusebitColor;
  initialValue?: string;
  regexValidator?: RegExp;
  size?: number;
  gaCategory?: string;
  gaAction?: string;
  gaLabel?: string;
  onTextSubmit?: (value: string) => void;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitTextFieldButton({
  width,
  size,
  onChange,
  placeholder,
  initialValue,
  regexValidator,
  buttonText,
  errorText,
  buttonColor,
  buttonDisabled,
  buttonDisabledColor,
  className,
  onClick,
  onSubmit,
  onTextSubmit,
  onFocusCapture,
  onBlurCapture,
  gaCategory,
  gaAction,
  gaLabel,
  ...rest
}: FusebitTextFieldButtonProps) {
  const [value, setValue] = useState(initialValue || '');
  const [isValid, setIsValid] = useState(regexValidator === undefined);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showError, setShowError] = useState(false);

  function onSubmitCore() {
    if (isValid) {
      if (onTextSubmit) {
        onTextSubmit(value);
      }
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 20);
    } else if (errorText) {
      setShowError(true);
    }
  }

  function onChangeWrapped(event: any) {
    if (onChange) {
      onChange(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    const current = event.target.value;
    if (showError) {
      setShowError(false);
    }
    setValue(current);
    setIsValid(!regexValidator || regexValidator.test(current));
  }

  function onClickWrapped(event: any) {
    if (!submitted) {
      if (onClick) {
        onClick(event);
        if (event.defaultPrevented) {
          return;
        }
      }
      onSubmitCore();
    }
  }

  function onSubmitWrapped(event: any) {
    if (onSubmit) {
      onSubmit(event);
      if (event.defaultPrevented) {
        return;
      }
    }
    event.preventDefault();
    onSubmitCore();
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
    lastFocus = undefined;
    setFocused(false);
    if (onBlurCapture) {
      onBlurCapture(event);
    }
  }

  useEffect(() => {
    let timeout: NodeJS.Timer | undefined;
    if (showError) {
      timeout = setTimeout(() => setShowError(false), 5000);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [showError]);

  if (!listenerAdded) {
    listenerAdded = true;
    document.body.addEventListener('keyup', keyupListener);
  }

  return (
    <Box {...rest}>
      <form onSubmit={onSubmitWrapped}>
        <StyledBox
          width={width || 300}
          gap={5}
          noWrap
          background={FusebitColor.white}
          className={[focused ? 'focus' : '', className].join(' ')}
        >
          <Box vertical expand padding={10} style={{ marginLeft: 15, marginTop: 5, overflowY: 'hidden' }}>
            <Input
              type="text"
              placeholder={placeholder}
              size={size}
              value={value}
              autoCapitalize="none"
              onChange={onChangeWrapped}
              onFocusCapture={onFocusCaptureWrapped}
              onBlurCapture={onBlurCaptureWrapped}
            />
            {errorText && showError ? (
              <Box overlay height={0} width={width || 300} color="unset">
                <Box width="100%" offsetY={-8}>
                  <FusebitText fontSize={12} type={FusebitTextType.bodySmall} color={FusebitColor.red}>
                    {errorText}
                  </FusebitText>
                </Box>
              </Box>
            ) : (
              undefined
            )}
          </Box>
          <FusebitButton
            disabled={buttonDisabled}
            color={buttonColor}
            disabledColor={buttonDisabledColor}
            onClick={onClickWrapped}
            click={submitted}
            gaCategory={gaCategory}
            gaAction={gaAction}
            gaLabel={gaLabel}
            noFocus
          >
            {buttonText}
          </FusebitButton>
        </StyledBox>
      </form>
    </Box>
  );
}
