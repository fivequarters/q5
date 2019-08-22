import React, { useState, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitCharacterType } from './FusebitCharacter';

// ------------------
// Internal Functions
// ------------------

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  var angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  var start = polarToCartesian(x, y, radius, endAngle);
  var end = polarToCartesian(x, y, radius, startAngle);

  var largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  var d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');

  return d;
}

// -------------------
// Internal Components
// -------------------

const RelativeBox = styled(Box)`
  position: relative;
`;

const AbsoluteBox = styled(Box)`
  position: absolute;
  top: -2px;
  left: 2px;
`;

function manOne(size?: number) {
  return (
    <svg width={size || '100%'} viewBox="0 0 203 203" fill="none">
      <g transform="translate(5, 0)">
        <defs>
          <clipPath id="manOneClipPath">
            <circle cx="101.5" cy="96.5" r="96" />
          </clipPath>
        </defs>
        <g clipPath="url(#manOneClipPath)">
          <circle cx="101.5" cy="96.5" r="96" fill="#F0F7FF" />
          <g transform="scale(1.05,1.05)">
            <g transform="translate(-5, -10)">
              <path
                d="M108.555 192.265L107.7 162.776C107.7 162.776 143.606 165.629 151.287 161.647C151.287 161.647 158.874 113.101 149.252 85.605L73.4779 76.7598L67.942 120.813C65.3896 113.299 45.613 104.12 40.1059 114.879C28.1728 138.193 70.8409 153.89 70.8409 153.89L66.5083 192.62"
                fill="#E576C6"
              />
              <path
                d="M70.6114 123.409C63.3849 113.511 54.0293 110.771 51.4477 110.181C48.3002 96.0905 44.6023 59.6128 88.6741 53.8261C141.29 46.918 149.251 85.605 149.251 85.605L81.4741 84.7761V120.7L70.6114 123.409V123.409Z"
                fill="#FCBDA4"
              />
              <path
                opacity="0.402158"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M107.699 162.776L83.4875 157.595L107.582 173.839L107.699 162.776Z"
                fill="black"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M127.672 114.586L136.039 135L126.01 135.127L127.672 114.586Z"
                fill="#405FD3"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M118.132 120.387C118.631 123.136 116.801 125.768 114.047 126.264C111.292 126.762 108.655 124.936 108.157 122.188C107.659 119.439 109.488 116.808 112.242 116.31C114.997 115.813 117.633 117.638 118.132 120.387"
                fill="#0D0B6D"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M144.447 120.387C144.946 123.136 143.116 125.768 140.362 126.264C137.607 126.762 134.97 124.936 134.473 122.188C133.974 119.439 135.804 116.808 138.558 116.31C141.313 115.813 143.949 117.638 144.447 120.387"
                fill="#0D0B6D"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M117.268 140.907C117.268 140.907 120.773 146.579 127.714 146.098Z"
                fill="white"
              />
              <path
                d="M117.268 140.907C117.268 140.907 120.773 146.579 127.714 146.098"
                stroke="#252535"
                strokeWidth="4"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function womanOne(size?: number) {
  return (
    <svg width={size || '100%'} viewBox="0 0 212 212" fill="none">
      <g transform="translate(5, 17)">
        <defs>
          <clipPath id="womanOneClipPath">
            <circle cx="106" cy="84" r="100" />
          </clipPath>
        </defs>
        <g clipPath="url(#womanOneClipPath)">
          <circle cx="106" cy="84" r="100" fill="#F0F7FF" />
          <rect x="40" y="140" width="120" height="50" fill={FusebitColor.red} />
          <g transform="scale(1,1)">
            <g transform="translate(0, 15)">
              <path
                d="M0.000488281 115.396C0.000488281 102.814 47.1565 -1.83453 108.388 0.024469C193.333 2.60347 215.119 134.277 211.23 147.238C208.134 157.559 193.213 161.313 127.794 159.484C29.5385 156.736 0.000488281 126.664 0.000488281 115.396Z"
                fill="#2437A8"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M114.38 138.732C114.38 138.732 101.449 139.114 95.9385 136.104L113.693 147.251L114.38 138.732Z"
                fill="#CF3E83"
              />
              <path
                d="M112.05 53.0889C126.955 60.6155 150.427 74.4177 162.364 91.6369C160.275 106.503 155.169 126.439 143.197 134.4C136.607 138.78 124.607 139.32 114.378 138.73L112.038 167.77L79.6577 157.04C79.6577 157.04 82.8677 123.01 84.2577 110.7C77.5477 104.61 65.1177 100.79 65.0967 90.4501C65.0967 86.8801 67.1867 80.6801 74.9077 80.6701C85.2667 80.6601 83.7977 93.0701 83.7977 93.0701C94.2688 97.1476 104.964 66.091 112.05 53.0889L112.05 53.0889Z"
                fill="#BC9147"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M142.49 93.0508L149.89 110.991L141.304 110.819L142.49 93.0508Z"
                fill="#405FD3"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M134.611 93.829C134.426 97.413 132.319 100.205 129.903 100.066C127.487 99.927 125.678 96.909 125.863 93.325C126.047 89.741 128.155 86.949 130.571 87.088C132.987 87.227 134.796 90.245 134.611 93.829"
                fill="#0D0B6D"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M157.298 93.2567C157.113 96.8407 155.005 99.6327 152.59 99.4937C150.174 99.3547 148.364 96.3367 148.549 92.7527C148.734 89.1687 150.841 86.3757 153.257 86.5147C155.673 86.6537 157.482 89.6727 157.298 93.2567"
                fill="#0D0B6D"
              />
              <path
                d="M139.198 119.412C139.198 119.412 133.604 121.218 127.999 114.985"
                stroke="#1C295E"
                strokeWidth="3"
              />
              <path
                opacity="0.398182"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M114.359 138.732C114.359 138.732 101.428 139.114 95.917 136.104L113.672 147.251L114.359 138.732Z"
                fill="black"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function manTwo(size?: number) {
  return (
    <svg width={size || '100%'} viewBox="0 0 203 203" fill="none">
      <g transform="translate(5, 0)">
        <defs>
          <clipPath id="manTwoClipPath">
            <circle cx="101.5" cy="96.5" r="96" />
          </clipPath>
        </defs>
        <g clipPath="url(#manTwoClipPath)">
          <circle cx="101.5" cy="96.5" r="96" fill="#F0F7FF" />
          <g transform="scale(1, 1)">
            <g transform="translate(0, 10)">
              <path
                d="M108.555 191.845L107.699 162.483C107.699 162.483 143.606 165.324 151.287 161.359C151.287 161.359 159.567 118.111 149.251 85.6432L73.4784 76.8359L68.0874 120.132C65.535 112.651 45.6126 104.079 40.1055 114.792C28.1733 138.005 70.8405 153.635 70.8405 153.635L66.5079 192.198"
                fill="#5E93D1"
              />
              <path
                opacity="0.399344"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M107.699 162.483L83.4872 157.324L107.583 173.499L107.699 162.483Z"
                fill="black"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M127.671 114.5L136.039 134.826L126.011 134.953L127.671 114.5Z"
                fill="#2437A8"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M118.132 120.277C118.63 123.014 116.801 125.634 114.047 126.129C111.292 126.624 108.656 124.806 108.157 122.07C107.658 119.332 109.488 116.712 112.242 116.217C114.997 115.722 117.634 117.539 118.132 120.277"
                fill="#0D0B6D"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M144.447 120.277C144.946 123.014 143.116 125.634 140.362 126.129C137.607 126.624 134.971 124.806 134.472 122.07C133.974 119.332 135.803 116.712 138.557 116.217C141.312 115.722 143.949 117.539 144.447 120.277"
                fill="#0D0B6D"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M117.268 140.708C117.268 140.708 120.772 146.355 127.714 145.877Z"
                fill="white"
              />
              <path
                d="M117.268 140.708C117.268 140.708 120.772 146.355 127.714 145.877"
                stroke="#252535"
                strokeWidth="4"
              />
              <path
                d="M53.7665 110.879C50.4017 98.4451 38.2251 52.5508 39.6596 44.716C41.3201 35.636 47.6813 24.4894 80.3666 12.7982C108.06 2.89285 123.681 10.0655 128.413 16.1686C135.613 25.4552 149.251 85.6441 149.251 85.6441C149.251 85.6441 137.967 93.6233 97.9508 92.2471C97.9508 92.2471 103.49 116.185 80.7824 114.809C80.7824 114.809 83.2159 122.871 72.2269 125.406C66.1974 116.09 58.1956 112.324 53.7665 110.879V110.879Z"
                fill="#19141E"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function backgroundDetail(radius: number) {
  return radius > 0 ? (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <path d={describeArc(50, 50, 48, 0, radius)} stroke={FusebitColor.red} strokeWidth="4" strokeLinecap="round" />
    </svg>
  ) : null;
}

// --------------
// Exported Types
// --------------

export type FusebitCharacterFaceProps = {
  size?: number;
  characterType?: FusebitCharacterType;
  active?: boolean;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitCharacterFace({ size, active, expand, characterType, ...rest }: FusebitCharacterFaceProps) {
  const [radius, setRadius] = useState(0);
  const rate = 3;

  size = !expand && !size ? 75 : size;

  let character;
  switch (characterType) {
    case FusebitCharacterType.manTwo:
      character = manTwo(size);
      break;
    case FusebitCharacterType.womanOne:
      character = womanOne(size);
      break;
    default:
      character = manOne(size);
  }

  useLayoutEffect(() => {
    let animationFrame: number;
    if (active && radius < 90) {
      animationFrame = window.requestAnimationFrame(() => setRadius(radius + rate));
    } else if (!active && radius > 0) {
      animationFrame = window.requestAnimationFrame(() => setRadius(radius - rate));
    }
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [active, radius]);

  return (
    <RelativeBox center middle expand={!size} width={size || '100%'} {...rest}>
      {character}
      <AbsoluteBox width={size || '100%'}>{backgroundDetail(radius)}</AbsoluteBox>
    </RelativeBox>
  );
}
