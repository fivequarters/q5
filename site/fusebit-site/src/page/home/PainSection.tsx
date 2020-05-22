import React, { useState, useEffect } from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { Drawer } from '@5qtrs/drawer';
import { ScrollEvent } from '@5qtrs/scroll-event';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitCharacterFace, FusebitCharacter, FusebitCharacterType } from '@5qtrs/fusebit-character';
import { FusebitCard } from '@5qtrs/fusebit-card';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';

// ------------------
// Internal Constants
// ------------------

let painClicked = false;

const heading = 'We feel your pain';
const subHeading =
  'Every day we hear from SaaS companies like yours that are stuck and can’t deliver the integrations customers want:';

const pains = [
  {
    heading: 'Sales take long and deals are lost',
    text:
      'Inability to rapidly deliver missing integrations or support custom functionality prevents your sales team from closing',
    height: 90,
    scrollY: 350,
  },
  {
    heading: 'Integrations get stuck in the product backlog',
    text: 'My engineers are busy with the core product and integrations never get done',
    height: 70,
    scrollY: 350,
  },
  {
    heading: '80% solved isn’t solved at all',
    text:
      'You don’t need hundreds of generic integrations that you’ll never use, just the ten your customers actually want, delivered on your timeline',
    height: 90,
    scrollY: 0,
  },
  {
    heading: 'It’s harder than it looks',
    text:
      'Dealing with separate auth mechanisms, changing schemas, rate limits, and everything else your integration partners throw at you makes building an in-house platform an expensive and risky investment',
    height: 150,
    scrollY: 450,
  },
  {
    heading: 'Integrations go down and engineers stay up',
    text:
      'Fighting broken integrations in production without great metrics, logging, and alerting burns out your team and hurts your bottom line',
    height: 90,
    scrollY: 0,
  },
];

const personaCardMap = [
  { personaIndex: 0, pain: 0 },
  { personaIndex: 1, pain: 1 },
  { personaIndex: 1, pain: 2 },
  { personaIndex: 2, pain: 3 },
  { personaIndex: 2, pain: 4 },
];

const personaTitles = ['Account Manager', 'Product Manager', 'Engineering Lead'];

// ------------------
// Internal Functions
// ------------------

function getPersonaFromIndex(personaIndex: number): FusebitCharacterType {
  switch (personaIndex) {
    case 1:
      return FusebitCharacterType.manOne;
    case 2:
      return FusebitCharacterType.manTwo;
    default:
      return FusebitCharacterType.womanOne;
  }
}

// --------------
// Internal Types
// --------------

type PainCardProps = {
  personaIndex: number;
  contentIndex: number;
  isMobile?: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
} & BoxProps;

type PainCardSetProps = {
  isMobile?: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
};

type PersonaFaceProps = {
  personaIndex: number;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
};

// -------------------
// Internal Components
// -------------------

function PainCard({ isMobile, personaIndex, contentIndex, activeIndex, setActiveIndex, ...rest }: PainCardProps) {
  const inActive = activeIndex !== personaIndex;

  function onClick() {
    painClicked = true;
    setActiveIndex(personaIndex);
  }

  function onScrollTo(scrollUp: boolean) {
    if (!painClicked) {
      if (scrollUp) {
        setActiveIndex(personaIndex);
      } else if (personaIndex > 0) {
        setActiveIndex(personaIndex - 1);
      }
    }
  }

  const cardText = (
    <Box vertical paddingTop={15}>
      <FusebitText type={FusebitTextType.bodySmall}>{pains[contentIndex].text}</FusebitText>
    </Box>
  );

  return (
    <Box {...rest}>
      {pains[contentIndex].scrollY && !painClicked && !isMobile ? (
        <ScrollEvent top={pains[contentIndex].scrollY} onScrollTo={onScrollTo} />
      ) : null}
      <FusebitCard
        vertical
        padding={20}
        width={isMobile ? '100%' : 400}
        maxWidth={isMobile ? undefined : '75vw'}
        minWidth={isMobile ? undefined : 10}
        inActive={inActive}
        onClick={onClick}
      >
        <Box width="100%">
          <FusebitText
            type={FusebitTextType.bodySmall}
            weight={FusebitTextWeight.bold}
            color={inActive ? FusebitColor.gray : FusebitColor.black}
          >
            {pains[contentIndex].heading}
          </FusebitText>
        </Box>
        {isMobile ? (
          cardText
        ) : (
          <Drawer vertical open={!inActive} height={pains[contentIndex].height} scroll rate={8} width="100%">
            {cardText}
          </Drawer>
        )}
      </FusebitCard>
    </Box>
  );
}

function PainCardSet({ isMobile, activeIndex, setActiveIndex }: PainCardSetProps) {
  const cards = [];
  let key = 0;

  for (const mapping of personaCardMap) {
    if (!isMobile || activeIndex === mapping.personaIndex) {
      cards.push(
        <PainCard
          key={key++}
          marginBottom={10}
          isMobile={isMobile}
          personaIndex={mapping.personaIndex}
          contentIndex={mapping.pain}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
        />
      );
    }
  }

  return <>{cards}</>;
}

function PersonaFace({ personaIndex, activeIndex, setActiveIndex }: PersonaFaceProps) {
  const active = activeIndex === personaIndex;

  function onClick() {
    painClicked = true;
    setActiveIndex(personaIndex);
  }

  return (
    <Box vertical center maxWidth={120} gap={20} onClick={onClick}>
      <FusebitCharacterFace characterType={getPersonaFromIndex(personaIndex)} active={active} />
      <Box maxWidth={100}>
        <FusebitText
          center
          weight={FusebitTextWeight.bold}
          type={FusebitTextType.bodySmall}
          color={active ? FusebitColor.red : FusebitColor.black}
        >
          {personaTitles[personaIndex]}
        </FusebitText>
      </Box>
    </Box>
  );
}

function MobileVersion() {
  const [activeIndex, setActiveIndex] = useState(0);

  function onScrollTo1(scrollUp: boolean) {
    if (!painClicked) {
      setActiveIndex(scrollUp ? 1 : 0);
    }
  }

  function onScrollTo2(scrollUp: boolean) {
    if (!painClicked) {
      setActiveIndex(scrollUp ? 2 : 1);
    }
  }

  return (
    <Box vertical>
      <Box expand marginBottom={40}>
        <FusebitText fontSize={32} weight={FusebitTextWeight.black} type={FusebitTextType.header2}>
          {heading}
        </FusebitText>
        <Box height={20} />
        <FusebitText type={FusebitTextType.bodyLarge}>{subHeading}</FusebitText>
      </Box>
      <Box center margin={-20} stretch>
        <PersonaFace personaIndex={0} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        <PersonaFace personaIndex={1} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        <PersonaFace personaIndex={2} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      </Box>
      <Box marginTop={40}>
        <ScrollEvent top={380} onScrollTo={onScrollTo1} />
        <ScrollEvent top={270} onScrollTo={onScrollTo2} />
        <PainCardSet isMobile activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      </Box>
    </Box>
  );
}

function NonMobileVersion() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Box middle center gap={30}>
      <Box expand center gap={20} minWidth={400}>
        <Box maxWidth={520}>
          <Box>
            <FusebitText type={FusebitTextType.header2} weight={FusebitTextWeight.black}>
              {heading}
            </FusebitText>
          </Box>
          <Box marginTop={50} maxWidth={520}>
            <FusebitText type={FusebitTextType.bodyLarge}>{subHeading}</FusebitText>
          </Box>
        </Box>
        <Box minWidth={400}>
          <PersonaFace personaIndex={0} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
          <PersonaFace personaIndex={1} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
          <PersonaFace personaIndex={2} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        </Box>
      </Box>
      <Box middle noWrap>
        <FusebitCharacter characterType={getPersonaFromIndex(activeIndex)} width={200} minWidth={100} maxWidth="20vw" />
        <Box vertical middle height={630} gap={10} noWrap>
          <PainCardSet activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        </Box>
      </Box>
    </Box>
  );
}

// -------------------
// Exported Components
// -------------------

export function PainSection() {
  return (
    <FusebitSection maxWidth={1200}>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion />
      </MediaQuery>
    </FusebitSection>
  );
}
