import React from 'react';
import { Box } from '@5qtrs/box';
import { FusebitText as Text, FusebitTextType as TextType, FusebitTextWeight as TextWeight } from '@5qtrs/fusebit-text';
import { FusebitColor as Color } from '@5qtrs/fusebit-color';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import {
  FusebitPage as Page,
  FusebitSection as Section,
  FusebitQuote as Quote,
  FusebitBreak as Break,
} from '@5qtrs/fusebit-page';
import { FusebitButton } from '@5qtrs/fusebit-button';

// -------------------
// Exported Components
// -------------------

export function Careers() {
  return (
    <Page header="Careers at Fusebit">
      <Section>
        At Fusebit, we are singularly focused on creating a developer-centric platform for application integrations. You
        will be an early contributor in helping us shape how SaaS developers can easily integrate and maintain thousands
        of integrations with other applications. Everything we do is centered on creating developer joy. It is a hard
        problem to solve that requires smart, creative people who love developer products.
      </Section>

      <Section>
        <Box center middle width="100%" padding={20} maxWidth={1200}>
          <FusebitButton
            outline
            marginLeft={30}
            href={'https://angel.co/company/fusebitio/jobs'}
            gaCategory="CTA"
            gaAction="Clicked jobs button"
            gaLabel={location.pathname}
          >
            Open positions
          </FusebitButton>
        </Box>
      </Section>

      <Section header="A great place to work">
        Fusebit was founded by early architects of Auth0 integration technology and who helped shape the award-winning
        culture. We aim to do the same at Fusebit.
        <ul>
          <li>Remote first philosophy, with reimbursement of coworking space if desired.</li>
          <li>Competitive pay</li>
          <li>Stock options reflecting your early contributions in shaping the Company</li>
          <li>Comprehensive health benefits</li>
          <li>Generous parental and family leave</li>
          <li>Unlimited vacation with a minimum of 3 weeks per year (yes, you need to chill every now and then)</li>
          <li>Annual company offsite</li>
        </ul>
      </Section>

      <Section header="Balance">
        There’s life at work and there’s life outside of work. We want everyone to have time with family, travel, give
        time back to the community, and have the financial resources and support they need.
      </Section>

      <Section header="Diversity">
        A world where anyone can belong anywhere starts with a workplace where you feel welcome and can contribute your
        best work. Fusebit is proud to be an Equal Employment Opportunity employer. All individuals seeking employment
        at Fusebit are considered without regard to race, color, religion, national origin, age, sex, marital status,
        ancestry, physical or mental disability, veteran status, gender identity, sexual orientation, or any other
        legally protected characteristic.
      </Section>
      <Section>
        <Break />
      </Section>
    </Page>
  );
}
