import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

// ------------------
// Internal Constants
// ------------------

const pauseDelay = 50;
const timerDelay = 20;
const quarters: IAnimationQuarter[] = [
  {
    invert: true,
    visible: { before: true, after: false },
    first: { start: 90, end: 0 },
    second: { start: 270, end: 270 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: true, after: false },
    first: { start: 270, end: 180 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: true, after: false },
    first: { start: 180, end: 90 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: true, after: true },
    first: { start: 90, end: 0 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: true, after: true },
    first: { start: 0, end: -90 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: false, after: true },
    first: { start: -90, end: -180 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: false, after: true },
    first: { start: -180, end: -270 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: 0 },
  },
  {
    visible: { before: false, after: true },
    first: { start: 90, end: 90 },
    second: { start: 0, end: 0 },
    third: { start: 0, end: -90 },
  },
];

// --------------
// Internal Types
// --------------

interface IRotation {
  start: number;
  end: number;
}

interface IAnimationQuarter {
  invert?: boolean;
  visible: { before: boolean; after: boolean };
  first: IRotation;
  second: IRotation;
  third: IRotation;
}

interface IState {
  quarter: number;
  first: number;
  second: number;
  third: number;
  delay: number;
}

type QuarterProps = {
  size: number | string;
  strokeWidth: number;
  color: string;
  visible: boolean;
  first: number;
  second: number;
  third: number;
  invert?: boolean;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// ------------------
// Internal Functions
// ------------------

function newState(): IState {
  return {
    quarter: 0,
    first: quarters[0].first.start,
    second: quarters[0].second.start,
    third: quarters[0].third.start,
    delay: pauseDelay,
  };
}

function rotate(rotation: IRotation, degree: number, rate: number): number {
  const direction = rotation.start > rotation.end ? -1 : 1;
  let rotated = degree + rate * direction;
  if (direction > 0) {
    if (rotated > rotation.end) {
      rotated = rotation.end;
    } else if (rotated < rotation.start) {
      rotated = rotation.end;
    }
  } else {
    if (rotated < rotation.end) {
      rotated = rotation.end;
    } else if (rotated > rotation.start) {
      rotated = rotation.end;
    }
  }

  return rotated;
}

function updateState(state: IState, rate: number): IState {
  if (state.quarter === 0 && state.delay < pauseDelay) {
    state.delay++;
  } else {
    const step = quarters[state.quarter];
    if (state.first === step.first.end) {
      if (state.second === step.second.end) {
        if (state.third === step.third.end) {
          state.quarter = (state.quarter + 1) % quarters.length;
          state.first = quarters[state.quarter].first.start;
          state.second = quarters[state.quarter].second.start;
          state.third = quarters[state.quarter].third.start;
          state.delay = 0;
          return updateState(state, rate);
        } else {
          state.third = rotate(step.third, state.third, rate);
        }
      } else {
        state.second = rotate(step.second, state.second, rate);
      }
    } else {
      state.first = rotate(step.first, state.first, rate);
    }
  }

  return state;
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

function Quarter({ size, strokeWidth, color, visible, first, second, third, invert, ...rest }: QuarterProps) {
  return (
    <Wrapper {...rest} style={{ display: visible ? '' : 'none' }}>
      <svg width={size} height={size} viewBox="0 0 110 110">
        <path
          d="M 55 5 A 50 50 0 0 0 5 55 h 50 z"
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          transform={[
            `rotate(${invert ? second : first}, 55 55)`,
            `rotate(${invert ? first : second}, 5 55)`,
            `rotate(${third}, 55 5)`,
          ].join(' ')}
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
  rate = rate || 4;
  const [state, setState] = useState(newState());

  useEffect(() => {
    let timer: NodeJS.Timer;
    if (visible) {
      timer = setInterval(() => {
        setState(updateState(state, rate as number));
      }, timerDelay);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [visible]);

  const settings = { size: size || 50, strokeWidth: strokeWidth || 2, color: color || 'black' };

  const quarterElements = quarters.map((quarter: IAnimationQuarter, index: number) => {
    const animation = { visible: false, first: 0, second: 0, third: 0, invert: quarter.invert || false };

    if (index === state.quarter) {
      animation.visible = true;
      animation.first = state.first;
      animation.second = state.second;
      animation.third = state.third;
    } else if (index > state.quarter) {
      animation.visible = quarter.visible.before;
      animation.first = quarter.first.start;
      animation.second = quarter.second.start;
      animation.third = quarter.third.start;
    } else {
      animation.visible = quarter.visible.after;
      animation.first = quarter.first.end;
      animation.second = quarter.second.end;
      animation.third = quarter.third.end;
    }
    return <Quarter key={index} {...settings} {...animation} />;
  });

  style = style || {};
  style.width = size;
  style.height = size;
  style.display = visible ? '' : 'none';

  return (
    <Container {...rest} style={style}>
      {quarterElements}
    </Container>
  );
}
