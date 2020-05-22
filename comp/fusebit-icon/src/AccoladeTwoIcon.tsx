import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type AccoladeTwoIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function AccoladeTwoIcon({ size, color, expand, ...rest }: AccoladeTwoIconProps) {
  size = !expand && !size ? 18 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 43 39" fill="none">
        <path
          d="M16.5873 33.423C16.059 28.8459 11.4104 28.9524 11.4104 28.9524C11.4104 28.9524 12.0443 33.6359 16.5873 33.423Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M10.6709 34.9132C10.6709 34.9132 13.6291 38.5322 17.4326 35.9776C14.58 32.3585 10.6709 34.9132 10.6709 34.9132Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M9.82547 31.1877C10.565 26.6106 6.02203 25.5462 6.02203 25.5462C6.02203 25.5462 5.38812 30.1232 9.82547 31.1877Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M4.33179 31.9328C4.33179 31.9328 6.55046 36.084 10.7765 34.1681C8.66348 30.1233 4.33179 31.9328 4.33179 31.9328Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M0.950928 24.8011C0.950928 24.8011 1.05658 29.4846 5.59958 29.9104C5.49392 25.2269 0.950928 24.8011 0.950928 24.8011Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M4.75415 24.8011C7.92369 21.9272 5.28241 18.3081 5.28241 18.3081C5.28241 18.3081 2.11287 21.2885 4.75415 24.8011Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M2.32429 23.4174C4.22601 19.479 0.528223 17.2437 0.528223 17.2437C0.528223 17.2437 -1.3735 21.1821 2.32429 23.4174Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M2.11312 9.57983C2.11312 9.57983 -0.528157 13.1989 2.74703 16.0728C5.3883 12.5602 2.11312 9.57983 2.11312 9.57983Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M7.39541 10.7507C7.39541 10.7507 3.27502 12.4538 4.54283 16.605C8.66322 15.0084 7.39541 10.7507 7.39541 10.7507Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M6.44465 3.93839C6.44465 3.93839 2.53556 5.96079 4.12032 10.0056C8.02941 8.08965 6.44465 3.93839 6.44465 3.93839Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M12.4668 5.42859C12.4668 5.42859 8.02941 5.21571 7.39551 9.57985C11.7272 9.89918 12.4668 5.42859 12.4668 5.42859Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M12.4669 0C12.4669 0 8.13518 0.745098 8.45213 5.10924C12.6782 4.47059 12.4669 0 12.4669 0Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M12.2556 4.36414C16.4817 5.10924 17.6438 0.851535 17.6438 0.851535C17.6438 0.851535 13.3121 0.106437 12.2556 4.36414Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M26.4128 33.423C30.9558 33.6359 31.5897 28.9524 31.5897 28.9524C31.5897 28.9524 27.0467 28.8459 26.4128 33.423Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M25.5676 35.9776C29.3711 38.5322 32.3293 34.9132 32.3293 34.9132C32.3293 34.9132 28.4202 32.3585 25.5676 35.9776Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M33.1744 31.1877C37.6118 30.1233 36.9779 25.4398 36.9779 25.4398C36.9779 25.4398 32.4349 26.6107 33.1744 31.1877Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M32.2236 34.1681C36.4497 36.084 38.6684 31.9328 38.6684 31.9328C38.6684 31.9328 34.3367 30.1233 32.2236 34.1681Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M37.5061 29.8039C42.0491 29.4846 42.1547 24.6947 42.1547 24.6947C42.1547 24.6947 37.5061 25.2269 37.5061 29.8039Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M37.6118 18.3081C37.6118 18.3081 34.9706 21.8207 38.1401 24.8011C40.887 21.2885 37.6118 18.3081 37.6118 18.3081Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M40.6757 23.4174C44.3735 21.1821 42.4717 17.2437 42.4717 17.2437C42.4717 17.2437 38.7739 19.479 40.6757 23.4174Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M40.887 9.57983C40.887 9.57983 37.6118 12.5602 40.2531 16.0728C43.5282 13.0924 40.887 9.57983 40.887 9.57983Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M38.3514 16.605C39.6192 12.4538 35.4988 10.7507 35.4988 10.7507C35.4988 10.7507 34.3366 15.0084 38.3514 16.605Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M38.8796 10.112C40.4644 6.06721 36.5553 4.0448 36.5553 4.0448C36.5553 4.0448 34.9705 8.08962 38.8796 10.112Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M30.5331 5.42859C30.5331 5.42859 31.2726 9.79274 35.6043 9.57985C34.9704 5.21571 30.5331 5.42859 30.5331 5.42859Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M34.6536 5.10924C34.9705 0.745098 30.5332 0 30.5332 0C30.5332 0 30.3219 4.47059 34.6536 5.10924Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M30.8501 4.36414C29.7936 0.106437 25.4619 0.851535 25.4619 0.851535C25.4619 0.851535 26.5184 5.10924 30.8501 4.36414Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M21.3526 38.2479C22.928 38.2479 24.2052 36.9612 24.2052 35.3739C24.2052 33.7867 22.928 32.5 21.3526 32.5C19.7771 32.5 18.5 33.7867 18.5 35.3739C18.5 36.9612 19.7771 38.2479 21.3526 38.2479Z"
          fill={color || FusebitColor.black}
        />
        <path
          d="M16.6898 24.168C19.3077 24.168 21.0578 21.942 21.0578 19.1C21.0578 16.23 19.3077 14.032 16.7178 14.032C14.1138 14.032 12.3498 16.258 12.3498 19.1C12.3498 21.97 14.0718 24.168 16.6898 24.168ZM16.7178 22.222C15.4158 22.222 14.5618 20.892 14.5618 19.1C14.5618 17.28 15.4018 15.978 16.6898 15.978C17.9778 15.978 18.8458 17.322 18.8458 19.1C18.8458 20.906 18.0198 22.222 16.7178 22.222ZM22.3696 24H29.6216V22.138H25.3516L26.9476 20.906C28.6836 19.562 29.5236 18.75 29.5236 17.112C29.5236 15.25 28.1796 14.06 26.1496 14.06C24.3996 14.06 23.4616 14.774 22.4956 16.09L24.0076 17.308C24.7356 16.412 25.2536 15.992 26.0096 15.992C26.7796 15.992 27.3256 16.44 27.3256 17.266C27.3256 18.078 26.8496 18.61 25.6316 19.618L22.3696 22.292V24Z"
          fill={color || FusebitColor.black}
        />
      </svg>
    </Box>
  );
}
