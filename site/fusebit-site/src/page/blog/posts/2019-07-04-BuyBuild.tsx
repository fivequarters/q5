import React from 'react';
import { Image } from '@5qtrs/image';
import { FusebitAuthor } from '@5qtrs/fusebit-blog';
import { FusebitSection as Section, FusebitBreak as Break, FusebitQuote as Quote } from '@5qtrs/fusebit-page';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import MainImage from '../../../../assets/img/blog-buy-build-main.jpg';
import WorkersImage from '../../../../assets/img/blog-buy-build-workers.jpg';

// -------------------
// Exported Components
// -------------------

const meta = {
  postId: 'buy-then-build-and-integrate',
  title: 'Buy, Build, and Integrate',
  subtitle: 'Are you ready for the new way companies use your SaaS?',
  year: 2019,
  month: 7,
  day: 4,
  summary: [
    'It is 2019. A 250 person company uses an average of 123 SaaS applications,',
    'and replaces 39% of them every two years.',
    'As a SaaS vendor, how do you convert and retain your customers in this environment?',
  ].join(' '),
  imageSrc: MainImage,
  author: FusebitAuthor.tomek,
  shareText: 'Buy, build, and Integrate - Are you ready for the new way companies use your SaaS?',
};

function Post() {
  return (
    <>
      <Section id="intro">
        It is 2019. A 250 person company uses an average of 123 SaaS applications, and replaces 39% of them every two
        years. As a SaaS vendor, how do you convert and retain your customers in this environment?
      </Section>
      <Section id="saas-2019" header="How companies are using SaaS in 2019" tocText="Using SaaS in 2019">
        According to{' '}
        <Link href="https://www.blissfully.com/saas-trends/2019-annual/">Blissfully’s Annual SaaS Report</Link>,
        companies between 250-500 employees use an average of 123 SaaS applications. This number increases to 151 apps
        for companies over 500 employees, but even small businesses under 50 employees use on average 40 SaaS
        applications.
        <Break />
        The number of SaaS applications in a company’s ecosystem is likely going to increase. In its{' '}
        <Link href="https://www.datapine.com/blog/saas-trends/">SaaS Trends 2019</Link> report, datapine identifies the
        rise of Micro-SaaS as one of the six SaaS trends defining the software market today. Micro-SaaS platforms serve
        a very specific, narrow purpose, but thanks to their focus they excel on their promise compared to more generic
        and broad alternatives.
        <Quote>
          The era of monolithic software systems that address all business needs is ending. Companies are increasingly
          choosing the best building blocks from different vendors and stitching them together to satisfy their unique
          business processes.
        </Quote>
        Forrester identified this new software consumption model in its{' '}
        <Link href="https://www.forrester.com/report/Buy+Then+Build+The+New+World+Of+SaaS+Development/-/E-RES143875">
          Buy then Build: The New World of SaaS Development
        </Link>{' '}
        report.
        <Break />
        <Image src={WorkersImage} borderRadius={25} />
        <Break />
        Forrester observes that SaaS is fundamentally changing the way companies are making software procurement
        decisions. Most companies realize that no single software solution is going to fit their specific requirements
        exactly and completely. They choose to buy a collage of solutions that each swork very well for specific aspects
        of their operations and assume they will need to build an integration layer between them to support their unique
        business processes end to end.
      </Section>
      <Section id="saas-turnover" header="SaaS turnover">
        The same 250-500 employee company that uses 123 SaaS applications to support its business will replace a
        staggering 39% of them over a two year period, according to Blissfully. The number goes up to 46% for smaller
        companies.
        <Quote>An average company replaces about half of the SaaS applications it uses every two years.</Quote>
        There are multiple reasons for this high turnover rate. Once companies embrace the <i>buy then build</i>{' '}
        mindset, they are much more open to change and experimentation in order to better support their business
        processes. The cost structure of SaaS and the prevalence of freemium and trial offerings further reduce barriers
        to experimentation.
      </Section>
      <Section id="saas-survive" header="As a SaaS vendor, how do you survive?" tocText="Surviving as a SaaS Vendor?">
        How do you operate effectively in the environment where your platform is just one of many, and the turnover rate
        is very high? Offering the best-in-class solution for a specific problem is becoming table stakes and is no
        longer enough to ensure continued success.
        <Quote>
          Successful SaaS vendors embrace the <i>buy, build, and integrate</i> reality by providing standout integration
          and customization features in their platforms to increase conversion and retention.
        </Quote>
        Given the number of SaaS applications in an average company ecosystem and the need to make them work together,
        the ability to customize and integrate a SaaS platform is critical in the decision to buy. Flexible
        customization and integration features frequently make a difference in the ability of a SaaS vendor to close a
        deal and increase the conversion rate.
        <Break />
        Robust integration and customization mechanisms are also an effective strategy SaaS vendors can lean on to fight
        the high turnover rate in their customer’s portfolio. Once a SaaS platform is customized and integrated with the
        ecosystem, it becomes much less likely to be removed or replaced. Auth0, an identity platform provider, has seen
        retention rates 10x higher among customers who customized and integrated the solution compared to those who did
        not.
      </Section>
      <Section
        id="saas-integrate"
        header="How easy is it to integrate your SaaS?"
        tocText="Easily integrate your SaaS?"
      >
        Strong integration and customization story is central to your SaaS survival in the{' '}
        <i>buy, build, and integrate</i> era. You cannot afford to send your customers to other vendors to solve the
        integration problem.
        <Quote>
          <i>
            “SaaS providers should have bitten the bullet and given their customers integration capabilities, rather
            than forcing customers to buy them from third parties”
          </i>{' '}
          – Benoit Lheureux, VP Gartner
        </Quote>
        Visionary companies like{' '}
        <Link to="/blog/2019/06/08/twilio-segment-github-serverless-extensibility/">
          Twilio, Segment, Github, and Auth0
        </Link>{' '}
        get it, and provide a solid customization and integration solution as part of their core offering. Not all SaaS
        companies are willing to dedicate the substantial engineering resources necessary to develop and maintain a
        world-class integration solution for their platform in-house. For those companies, <Link to="/">Fusebit</Link>{' '}
        offers an embedded, white-labeled integration and customization platform that can be integrated and exposed to
        customers in days. Embrace the buy, build, and integrate reality - don’t become a turnover statistic.
      </Section>
    </>
  );
}

export default { Post, meta };
