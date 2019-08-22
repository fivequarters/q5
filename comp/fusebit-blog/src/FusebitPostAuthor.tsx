import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { Image } from '@5qtrs/image';
import { FusebitLink } from '@5qtrs/fusebit-link';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitPostMeta, FusebitAuthor } from './FusebitPostMeta';
import { FusebitPostDate } from './FusebitPostDate';
import TomekProfile from '../assets/img/tomek.png';
import YavorProfile from '../assets/img/yavor.png';
import RandallProfile from '../assets/img/randall.png';

// ------------------
// Internal Constants
// ------------------

const authors: { [index: string]: { name: string; imageSrc: string } } = {
  tomek: {
    name: 'Tomasz Janczuk',
    imageSrc: TomekProfile,
  },
  yavor: {
    name: 'Yavor Georgiev',
    imageSrc: YavorProfile,
  },
  randall: {
    name: 'Randall Tombaugh',
    imageSrc: RandallProfile,
  },
};

// --------------
// Exported Types
// --------------

export type FusebitPostAuthorProps = FusebitPostMeta & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitPostAuthor({ author, year, month, day, marginTop, ...rest }: FusebitPostAuthorProps) {
  return author ? (
    <Box marginTop={marginTop || 20} {...rest}>
      <FusebitLink to="/about">
        <Box middle>
          <Image src={authors[author].imageSrc} width={50} />
          <Box marginLeft={10} vertical>
            <FusebitText type={FusebitTextType.body}>{authors[author].name}</FusebitText>
            <FusebitPostDate year={year} month={month} day={day} />
          </Box>
        </Box>
      </FusebitLink>
    </Box>
  ) : null;
}
