import React from 'react';
import { Box } from '@5qtrs/box';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { Image } from '@5qtrs/image';
import { FusebitCard } from '@5qtrs/fusebit-card';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitSocialButton, FusebitSocialType } from '@5qtrs/fusebit-social';
import { AccoladeOneIcon, AccoladeTwoIcon, AccoladeThreeIcon } from '@5qtrs/fusebit-icon';
import { FusebitPage, FusebitSection, FusebitBreak } from '@5qtrs/fusebit-page';
import Tomek from '../../assets/img/tomek-full-4.png';
import Yavor from '../../assets/img/yavor-full-4.png';
import Benn from '../../assets/img/benn-full.png';

// -------------------
// Exported Components
// -------------------

export function About() {
  return (
    <FusebitPage header="Who We Are">
      <FusebitSection marginBottom={60}>
        <Box width="100%" marginBottom={80}>
          <Box expand={1.3} marginRight={40} minWidth={300} marginBottom={40}>
            Fusebit empowers SaaS businesses to deliver the integrations their customers want, without distracting
            engineering teams from core feature development. Our software platform is based on learnings from dozens of
            SaaS companies just like yours, and built on top of years of industry experience and proven technologies.
            <FusebitBreak />
            Our overall vision is to democratize integration development, remove friction, and shorten time-to-market
            across the developer spectrum.
            <FusebitBreak />
            Prior to co-founding Fusebit, the team worked together for years on cloud technologies, platforms, and
            products across Microsoft and Auth0. We are excited to contribute our collective experience to bringing
            Fusebit to market.
          </Box>
          <Box expand width="100%" minWidth={300}>
            <FusebitCard width="100%" padding={20} marginBottom={20}>
              <Box middle noWrap>
                <AccoladeOneIcon size={50} marginRight={20} color={FusebitColor.red} />
                Built by pioneers in cloud, integrations, and serverless, with proven enterprise software record
              </Box>
            </FusebitCard>
            <FusebitCard width="100%" padding={20} marginBottom={20}>
              <Box middle noWrap>
                <AccoladeTwoIcon size={50} marginRight={20} color={FusebitColor.red} />
                Deep experience in delivering extensibility and integrations, from corporations to startup unicorns
              </Box>
            </FusebitCard>
            <FusebitCard width="100%" padding={20}>
              <Box middle noWrap>
                <AccoladeThreeIcon size={50} marginRight={20} color={FusebitColor.red} />
                Rooted in careful analysis of SaaS vendor requirements and pain points
              </Box>
            </FusebitCard>
          </Box>
        </Box>
        <Box width="100%" marginTop={40}>
          <Box center expand vertical minWidth={260} marginBottom={60}>
            <Box overlay height={220} width={0}>
              <Box offsetX={-165} offsetY={-5}>
                <svg width={216} height={300} viewBox="0 0 100 100">
                  <circle cx={50} cy={50} r={30} fill={FusebitColor.red} />
                </svg>
              </Box>
              <Image offsetX={-100} src={Tomek} width={216} />
            </Box>
            <Box vertical center marginTop={10}>
              <FusebitText center type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
                Tomasz Janczuk
              </FusebitText>
              <FusebitText center>Co-founder {'&'} CEO</FusebitText>
              <Box marginTop={10}>
                <FusebitSocialButton
                  type={FusebitSocialType.linkedIn}
                  href="https://www.linkedin.com/in/tjanczuk"
                  small
                  invertColor
                />
                <FusebitSocialButton
                  type={FusebitSocialType.twitter}
                  href="https://twitter.com/tjanczuk"
                  marginLeft={10}
                  small
                  invertColor
                />
              </Box>
            </Box>
          </Box>
          <Box width={30} height={0} />
          <Box vertical center expand minWidth={260} marginBottom={60}>
            <Box overlay height={220} width={0}>
              <Box offsetX={-60} offsetY={0}>
                <svg width={216} height={300} viewBox="0 0 100 100">
                  <circle cx={50} cy={50} r={30} fill={FusebitColor.orange} />
                </svg>
              </Box>
              <Image offsetX={-120} src={Yavor} width={220} />
            </Box>
            <Box vertical center marginTop={10}>
              <FusebitText center type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
                Yavor Georgiev
              </FusebitText>
              <FusebitText center>Co-founder {'&'} CPO</FusebitText>
              <Box marginTop={10}>
                <FusebitSocialButton
                  type={FusebitSocialType.linkedIn}
                  href="http://linkedin.com/in/yavorg"
                  small
                  invertColor
                />
                <FusebitSocialButton
                  type={FusebitSocialType.twitter}
                  href="https://twitter.com/YavorGeorgiev"
                  marginLeft={10}
                  small
                  invertColor
                />
              </Box>
            </Box>
          </Box>
          <Box width={30} height={0} />
          <Box vertical center expand minWidth={260} marginBottom={60}>
            <Box overlay height={220} width={0}>
              <Box offsetX={-45} offsetY={0}>
                <svg width={216} height={300} viewBox="0 0 100 100">
                  <circle cx={50} cy={50} r={30} fill={FusebitColor.cyan} />
                </svg>
              </Box>
              <Image offsetX={-110} src={Benn} width={220} />
            </Box>
            <Box vertical center marginTop={10}>
              <FusebitText center type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
                Benn Bollay
              </FusebitText>
              <FusebitText center>Co-founder {'&'} CTO</FusebitText>
              <Box marginTop={10}>
                <FusebitSocialButton
                  type={FusebitSocialType.linkedIn}
                  href="https://www.linkedin.com/in/bennbollay"
                  small
                  invertColor
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </FusebitSection>
    </FusebitPage>
  );
}
