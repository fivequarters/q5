import React from 'react';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSection } from '@5qtrs/fusebit-page';
import { FusebitLinkCard, FusebitLinkCardType } from '@5qtrs/fusebit-link-card';
import { FusebitPostCard, FusebitPostCardType, FusebitPostCardProps } from '@5qtrs/fusebit-blog';
import { posts } from '../blog/posts';
import FactoryFourImage from '../../../assets/img/industry-insight-ff.png';

// ------------------
// Internal Constants
// ------------------

// -------------------
// Internal Components
// -------------------

function HorizontalRule() {
  return <Box background={FusebitColor.light} width="100%" height={1} marginTop={20} marginBottom={20} />;
}

function BlissfullyCard() {
  return (
    <FusebitLinkCard
      href="https://www.blissfully.com/saas-trends/2019-annual/"
      title="2019 SaaS Trends Report"
      imageSrc="https://www.blissfully.com/wp-content/uploads/2019-saas-trends-header-v2.png"
      subtitle="Blissfully identifies trends in SaaS spend and usage"
      type={FusebitLinkCardType.small}
    />
  );
}

function FactoryFourCard() {
  return (
    <FusebitLinkCard
      href="https://factoryfour.com/blog/2019/09/13/Service-Model/"
      title="Rethinking Customer Service at FactoryFour"
      imageSrc={FactoryFourImage}
      subtitle="Technologies like Fusebit enable our customer to slash implementation time and lower support cost"
      type={FusebitLinkCardType.small}
    />
  );
}

function CardWithOverlay({ text, ...rest }: { text: string } & FusebitPostCardProps) {
  return (
    <Box overlay width="100%" height={0}>
      <FusebitPostCard {...rest} type={FusebitPostCardType.medium} />
      <Box
        offsetX={10}
        offsetY={10}
        borderRadius={25}
        padding={5}
        paddingLeft={10}
        paddingRight={10}
        background={FusebitColor.cyan}
      >
        <FusebitText type={FusebitTextType.bodySmall} weight={FusebitTextWeight.bold}>
          {text}
        </FusebitText>
      </Box>
    </Box>
  );
}

function MobileVersion() {
  return (
    <Box vertical marginBottom={40} marginTop={40}>
      <FusebitText type={FusebitTextType.header2}>Industry Insights</FusebitText>
      <Box expand center width="100%" height={560} marginTop={20}>
        <CardWithOverlay text="NEW" {...posts[0].meta} />
      </Box>
      <HorizontalRule />
      <Box expand center width="100%" minWidth={300} height={560}>
        <CardWithOverlay text="POPULAR" {...posts[1].meta} />
      </Box>
      <HorizontalRule />
      <FusebitPostCard {...posts[2].meta} type={FusebitPostCardType.small} />
      <HorizontalRule />
      <FusebitPostCard {...posts[3].meta} type={FusebitPostCardType.small} />
      <HorizontalRule />
      <BlissfullyCard />
      <HorizontalRule />
      <FactoryFourCard />
    </Box>
  );
}

function NonMobileVersion() {
  return (
    <Box vertical marginTop={80} width="calc(100% + 60px)" marginLeft={-30} marginRight={-30}>
      <Box marginLeft={60} marginBottom={-20}>
        <FusebitText type={FusebitTextType.header2}>Industry Insights</FusebitText>
      </Box>
      <Box center gap={60} width="100%">
        <Box expand center width="100%" minWidth={300} height={540}>
          <CardWithOverlay text="NEW" {...posts[0].meta} />
        </Box>
        <Box expand center width="100%" minWidth={300} height={540}>
          <CardWithOverlay text="POPULAR" {...posts[1].meta} />
        </Box>
        <Box expand width="100%" minWidth={300}>
          <Box expand maxWidth={500} marginRight={10}>
            <FusebitPostCard {...posts[2].meta} type={FusebitPostCardType.small} />
            <HorizontalRule />
          </Box>
          <Box expand maxWidth={500} marginRight={10}>
            <FusebitPostCard {...posts[3].meta} type={FusebitPostCardType.small} />
            <HorizontalRule />
          </Box>
          <Box expand maxWidth={500} marginRight={10}>
            <BlissfullyCard />
            <HorizontalRule />
          </Box>
          <Box expand maxWidth={500} marginRight={10}>
            <FactoryFourCard />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// --------------
// Exported Types
// --------------

// -------------------
// Exported Components
// -------------------

export function IndustryInsightsSection() {
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
