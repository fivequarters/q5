import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

// ------------------
// Internal Constants
// ------------------

const delayAtEnd = 1000;
const delayAtStart = 200;
const animations = [
  { start: 270, end: 270 },
  { start: 270, end: 360 },
  { start: 360, end: 450 },
  { start: 450, end: 540 },
  { start: 540, end: 630 },
  { start: 0, end: 90 },
];

// --------------
// Internal Types
// --------------

interface IRotationAnimation {
  start: number;
  end: number;
}

interface IQuarterProps {
  size: number | string;
  rate: number;
  visible: boolean;
  reverse: boolean;
  strokeWidth: number;
  color: string;
  primaryAnimation: IRotationAnimation;
  secondaryAnimation?: IRotationAnimation;
  onAnimationEnd: () => void;
}

// ------------------
// Internal Functions
// ------------------

function rotate(current: number, min: number, max: number, rate: number, reverse: boolean): number {
  let result = current + (reverse ? -rate : rate);
  if (result > max) {
    result = max;
  }
  if (result < min) {
    result = min;
  }
  return result;
}

function allFalse() {
  return [false, false, false, false, false];
}

function firstTrueRestFalse() {
  return [true, false, false, false, false];
}

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  position: relative;
`;

const Wrapper = styled.div`
  position: absolute;
  top: 0px;
  left: 0px;
`;

function Quarter({
  size,
  rate,
  visible,
  reverse,
  strokeWidth,
  color,
  primaryAnimation,
  secondaryAnimation,
  onAnimationEnd,
}: IQuarterProps) {
  const [primary, setPrimary] = useState(primaryAnimation.start);
  const onRotatePrimary = () =>
    setPrimary(rotate(primary, primaryAnimation.start, primaryAnimation.end, rate, reverse));

  const secondaryStart = secondaryAnimation ? secondaryAnimation.start : 0;
  const secondaryEnd = secondaryAnimation ? secondaryAnimation.end : 0;
  const [secondary, setSecondary] = useState(secondaryStart);
  const onRotateSecondary = () => setSecondary(rotate(secondary, secondaryStart, secondaryEnd, rate, reverse));

  useEffect(() => {
    if (visible) {
      if (reverse) {
        if (secondary === secondaryStart) {
          if (primary === primaryAnimation.start) {
            onAnimationEnd();
          } else {
            setTimeout(onRotatePrimary, rate);
          }
        } else {
          setTimeout(onRotateSecondary, rate);
        }
      } else {
        if (primary === primaryAnimation.end) {
          if (secondary === secondaryEnd) {
            onAnimationEnd();
          } else {
            setTimeout(onRotateSecondary, rate);
          }
        } else {
          setTimeout(onRotatePrimary, rate);
        }
      }
    }
  }, [primary, secondary, reverse, visible]);

  return (
    <Wrapper style={{ display: visible ? 'block' : 'none' }}>
      <svg width={size} height={size} viewBox="0 0 110 110">
        <path
          d="M 55 5 A 50 50 0 0 0 5 55 h 50 z"
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          transform={`rotate(${primary}, 55 55) rotate(${secondary}, 5 55)`}
        />
      </svg>
    </Wrapper>
  );
}

// --------------
// Exported Types
// --------------

export type CorpLogoDynamicProps = {
  size?: number | string;
  rate?: number;
  visible?: boolean;
  strokeWidth?: number;
  color?: string;
  onAnimationEnd?: () => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function CorpLogoDynamic({
  size,
  rate,
  visible,
  strokeWidth,
  color,
  style,
  onAnimationEnd,
  ...rest
}: CorpLogoDynamicProps) {
  const [reverse, setReverse] = useState(allFalse());
  const [quarterVisibility, setQuarterVisibility] = useState(firstTrueRestFalse());

  visible = visible === false ? false : true;

  function animationNext() {
    const currentReverse = reverse.findIndex(value => value === true);
    if (currentReverse === -1) {
      const nextIndex = quarterVisibility.findIndex(value => value === false);
      if (nextIndex === -1) {
        onLastAnimation();
      } else {
        quarterVisibility[nextIndex] = true;
        setQuarterVisibility(quarterVisibility);
      }
    } else {
      if (currentReverse === 0) {
        onLastAnimation();
      } else {
        quarterVisibility[currentReverse] = false;
        reverse[currentReverse - 1] = true;
        setQuarterVisibility(quarterVisibility);
        setReverse(reverse);
      }
    }
  }

  function onLastAnimation() {
    if (reverse[0] === true) {
      setTimeout(() => setReverse(allFalse()), delayAtStart);
    } else {
      setTimeout(() => {
        reverse[reverse.length - 1] = true;
        setReverse(reverse);
      }, delayAtEnd);
    }
  }

  size = size || 50;
  rate = rate || 4;
  strokeWidth = strokeWidth || 2;
  color = color || 'black';
  style = style || {};
  style.width = size;
  style.height = size;
  style.display = visible ? '' : 'none';

  return (
    <Container style={style}>
      <Quarter
        rate={rate}
        size={size}
        reverse={reverse[0]}
        strokeWidth={strokeWidth}
        color={color}
        visible={quarterVisibility[0]}
        primaryAnimation={animations[0]}
        onAnimationEnd={animationNext}
      />
      <Quarter
        rate={rate}
        size={size}
        reverse={reverse[1]}
        strokeWidth={strokeWidth}
        color={color}
        visible={quarterVisibility[1]}
        primaryAnimation={animations[1]}
        onAnimationEnd={animationNext}
      />
      <Quarter
        rate={rate}
        size={size}
        reverse={reverse[2]}
        strokeWidth={strokeWidth}
        color={color}
        visible={quarterVisibility[2]}
        primaryAnimation={animations[2]}
        onAnimationEnd={animationNext}
      />
      <Quarter
        rate={rate}
        size={size}
        reverse={reverse[3]}
        strokeWidth={strokeWidth}
        color={color}
        visible={quarterVisibility[3]}
        primaryAnimation={animations[3]}
        onAnimationEnd={animationNext}
      />
      <Quarter
        rate={rate}
        size={size}
        reverse={reverse[4]}
        visible={quarterVisibility[4]}
        strokeWidth={strokeWidth}
        color={color}
        primaryAnimation={animations[4]}
        secondaryAnimation={animations[5]}
        onAnimationEnd={animationNext}
      />
    </Container>
  );
}
