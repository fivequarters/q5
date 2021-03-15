import React from 'react';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextWeight, FusebitTextType } from '@5qtrs/fusebit-text';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitCard } from '@5qtrs/fusebit-card';
import { QuoteIcon } from '@5qtrs/fusebit-icon';
import { FusebitSection } from '@5qtrs/fusebit-page';
import AlexFactoryFour from '../../../assets/img/alex-factoryfour.webp';
import LogoFactoryFour from '../../../assets/img/logo-factoryfour.png';

// ------------------
// Internal Constants
// ------------------

const alexName = 'Alex Mathews';
const alexTitle = 'CEO, FactoryFour';
const alexQuote =
  'Fusebit takes the burden of integrations off of our customers, reducing a month long development cycle to a 15 minute coding exercise';
const enableHeading = 'For FactoryFour, Fusebit enables:';
const enableOne = 'Specialized SKU calculations per manufacturer';
const enableTwo = 'Faster time to market integrating customer SaaS systems';
const enableThree = 'Shorter sales cycle with easy customization per customer';

// -------------------
// Internal Components
// -------------------

function BackgroundDetail() {
  return (
    <svg height="100%" viewBox="0 0 619 624" fill="none">
      <path
        d="M577.79 410.287L159.287 828.79C122.427 865.649 64.5045 865.649 27.6448 828.79C-9.21493 791.93 -9.21493 734.007 27.6448 697.148L446.148 278.645C483.007 241.785 540.93 241.785 577.79 278.645C614.649 315.504 614.649 373.427 577.79 410.287Z"
        fill="#FFA700"
      />
      <path
        d="M590.789 -10.7134L173.576 406.5C136.716 443.36 78.7941 443.36 41.9344 406.5C5.07469 369.64 5.07469 311.718 41.9344 274.858L459.148 -142.355C496.007 -179.215 553.93 -179.215 590.789 -142.355C627.649 -105.496 627.649 -47.5731 590.789 -10.7134Z"
        fill="#15D6CF"
      />
    </svg>
  );
}

function Bullet({ isMobile }: any) {
  return (
    <svg width={30} viewBox="0 0 20 20" fill="none">
      <circle cx={10} cy={isMobile ? 11 : 8} r={2} fill={FusebitColor.orange} />
    </svg>
  );
}

function EnablePoints({ isMobile }: any) {
  const marginTop = isMobile ? 10 : 5;
  const fontSize = isMobile ? 14 : undefined;
  return (
    <>
      <Box marginTop={marginTop} noWrap>
        <Bullet isMobile={isMobile} />
        <FusebitText fontSize={fontSize} type={FusebitTextType.bodySmall}>
          {enableOne}
        </FusebitText>
      </Box>
      <Box marginTop={marginTop} noWrap>
        <Bullet isMobile={isMobile} />
        <FusebitText fontSize={fontSize} type={FusebitTextType.bodySmall}>
          {enableTwo}
        </FusebitText>
      </Box>
      <Box marginTop={marginTop} noWrap>
        <Bullet isMobile={isMobile} />
        <FusebitText fontSize={fontSize} type={FusebitTextType.bodySmall}>
          {enableThree}
        </FusebitText>
      </Box>
    </>
  );
}

function MobileVersion() {
  return (
    <>
      <Box expand overlay width="100%" height={280}>
        <Box height={280}>
          <BackgroundDetail />
        </Box>
        <Box height={260} offsetY={20}>
          <img src={AlexFactoryFour} height={260} />
        </Box>
        <Box width={180} offsetY={40} offsetX={130}>
          <img src={LogoFactoryFour} width={180} />
        </Box>
        <Box width={140} offsetY={160} offsetX={160}>
          <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
            {alexName}
          </FusebitText>
          <FusebitText type={FusebitTextType.body}>{alexTitle}</FusebitText>
        </Box>
      </Box>

      <FusebitCard padding={30} expand>
        <Box vertical noWrap>
          <QuoteIcon />
          <Box marginTop={10} marginBottom={30}>
            <FusebitText fontSize={18} type={FusebitTextType.bodyLarge} weight={FusebitTextWeight.light}>
              {alexQuote}
            </FusebitText>
          </Box>
          <FusebitText type={FusebitTextType.body} fontSize={14} weight={FusebitTextWeight.bold}>
            {enableHeading}
          </FusebitText>
          <EnablePoints isMobile />
        </Box>
      </FusebitCard>
    </>
  );
}

function NonMobileVersion() {
  return (
    <Box expand center maxWidth={1200}>
      <Box overlay height={460} width={500} maxWidth="80vw" noWrap>
        <Box height={500}>
          <BackgroundDetail />
        </Box>
        <Box height={450} offsetY={50} offsetX={200}>
          <img src={AlexFactoryFour} height={450} />
        </Box>
        <Box width={180} offsetY={70} offsetX={50}>
          <img src={LogoFactoryFour} width={180} />
        </Box>
        <Box width={200} offsetY={190} offsetX={50}>
          <Box>
            <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
              {alexName}
            </FusebitText>
          </Box>
          <Box>
            <FusebitText type={FusebitTextType.body}>{alexTitle}</FusebitText>
          </Box>
        </Box>
      </Box>
      <Box expand center marginTop={40}>
        <FusebitCard padding={25} expand minWidth={500} maxWidth={700}>
          <Box vertical noWrap>
            <QuoteIcon />
            <Box marginTop={10} marginBottom={30}>
              <FusebitText fontSize={24} type={FusebitTextType.bodyLarge} weight={FusebitTextWeight.light}>
                {alexQuote}
              </FusebitText>
            </Box>
            <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
              {enableHeading}
            </FusebitText>
            <EnablePoints />
          </Box>
        </FusebitCard>
      </Box>
    </Box>
  );
}

// -------------------
// Exported Components
// -------------------

export function TestimonialSection() {
  return (
    <FusebitSection maxWidth={1200} paddingBottom={40} background={FusebitColor.lightBlue}>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion />
      </MediaQuery>
    </FusebitSection>
  );
}
