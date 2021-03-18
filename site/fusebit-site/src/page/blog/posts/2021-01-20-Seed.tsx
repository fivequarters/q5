import { FusebitAuthor } from '@5qtrs/fusebit-blog';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitBreak as Break, FusebitQuote as Quote, FusebitSection as Section } from '@5qtrs/fusebit-page';
import React from 'react';
import SmallImage from '../../../../assets/img/twitter-blog-funding-announcement-2.png';
import LargeImage from '../../../../assets/img/twitter-blog-funding-announcement.png';

// -------------------
// Exported Components
// -------------------

const meta = {
  postId: 'seed-round',
  title: 'Fusebit Raises Seed Round',
  subtitle: 'To Help Developers Build Powerful Product Integrations',
  year: 2021,
  month: 1,
  day: 20,
  summary: [
    'Four Rivers, a San Francisco-based firm specializing in',
    'investments in the developer tools space, led the $3.3 million round,',
    'with participation from Seattle’s Founders’ Co-op. Angel investors include',
    'Eugenio Pace and Jonathan Gelsey, current and former CEO of Auth0',
  ].join(' '),
  imageSrc: SmallImage,
  largeImageSrc: LargeImage,
  author: FusebitAuthor.tomek,
  shareText: 'Fusebit raises $3.3M seed round to help developers build powerful integrations',
};

function Post() {
  return (
    <>
      <Section>
        SEATTLE, WA -- Fusebit (https://fusebit.io), a Seattle-based developer platform for product integrations, has
        today announced the close of $3.3 million in seed-round funding.
      </Section>
      <Section>
        Four Rivers, a San Francisco-based firm specializing in investments in the developer tools space, led the $3.3
        million round, with participation from Seattle’s Founders’ Co-op. Angel investors include Eugenio Pace and
        Jonathan Gelsey, the current and former CEO of Auth0.
      </Section>
      <Section>
        Founded by Auth0, Microsoft, and Apple alumni with deep roots in developer tools, Fusebit enables SaaS
        engineering teams to quickly add powerful integrations to their products, while optimizing for developer joy and
        productivity. The Fusebit platform abstracts third-party APIs and runs infrastructure at scale so that SaaS
        vendors can deliver the integrations their customers need, while focusing more time on their core businesses.
      </Section>
      <Section>
        <Quote small>
          SaaS vendors increasingly realize that providing powerful product integrations to their users helps them
          differentiate themselves from the competition and increases retention. Leveraging Fusebit can dramatically
          accelerate time-to-market and reduce TOC by eliminating the need to build a dedicated engineering team and
          develop in-house expertise.
          <Break />
          <i>Tomasz Janczuk, Fusebit CEO</i>
        </Quote>
      </Section>
      <Section>
        Fusebit’s platform has already found early traction with high-growth companies like Hyperproof, a Bellevue-based
        compliance operations platform.
      </Section>
      <Section>
        <Quote small>
          Our integration needs are very custom and complex. The Fusebit platform stood out from the alternatives
          because of its power, flexibility, and speed in bringing integrations to production.
          <Break />
          <i>Craig Unger, Hyperproof CEO</i>
        </Quote>
      </Section>
      <Section>Other customers include Factory Four, a manufacturing system vendor based in Los Angeles.</Section>
      <Section>
        <Quote small>
          Fusebit has become an indispensable part of all of our customers’ deployments. Without Fusebit, we would not
          be able to keep up with the unique integration requirements of manufacturing’s fragmented software ecosystem.
          <Break></Break>
          <i>Alex Mathews, Factor Four CEO</i>
        </Quote>
      </Section>
      <Section>
        This round of funding will fuel product development and the overall infrastructure needed to support its growing
        developer customer base. Incorporating lessons from developer-focused product companies, the team is expanding
        their product-led growth effort through developer communities.
      </Section>
      <Section>
        <Quote small>
          We see an accelerating trend of unbundling in SaaS application development in which parts of the solution are
          delivered by partners instead of being built in-house. Fusebit wants to lead that trend when it comes to
          integrations, just like Stripe did for payments, and Twilio for messaging.
          <Break />
          <i>Tomasz Janczuk, Fusebit CEO</i>
        </Quote>
      </Section>
      <Section>
        Fusebit has embraced the remote working culture and hires based on talent, not location. If you’re interested in
        a highly rewarding work environment, please reach out to{' '}
        <Link href="mailto:contact@fusebit.io">contact@fusebit.io</Link> to inquire about engineering roles and
        developer-focused marketing roles.
      </Section>
    </>
  );
}

export default { Post, meta };
