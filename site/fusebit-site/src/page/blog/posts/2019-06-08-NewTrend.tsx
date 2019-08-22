import React from 'react';
import { Image } from '@5qtrs/image';
import { FusebitAuthor } from '@5qtrs/fusebit-blog';
import { FusebitSection as Section, FusebitBreak as Break, FusebitQuote as Quote } from '@5qtrs/fusebit-page';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import MainImage from '../../../../assets/img/blog-new-trend-main.png';
import TwilioImage from '../../../../assets/img/blog-new-trend-twilio.png';
import SegmentImage from '../../../../assets/img/blog-new-trend-segment.png';
import GithubImage from '../../../../assets/img/blog-new-trend-github.png';
import Auth0Image from '../../../../assets/img/blog-new-trend-auth0.png';

// -------------------
// Exported Components
// -------------------

const meta = {
  postId: 'twilio-segment-github-serverless-extensibility',
  title: 'Twilio, Segment, Github, and Auth0 are Setting a New Trend',
  subtitle: 'Is your SaaS left behind?',
  year: 2019,
  month: 6,
  day: 8,
  summary: [
    'Many businesses get ahead of the competition by focusing on the core of their product.',
    "They do it by reducing barriers in the customer's experience.",
    'Twilio, Segment, Auth0, and Github have done exactly that by spearheading a new pattern of',
    'platform integration and customization that utilizes serverless technologies.',
    'Is your SaaS left behind?',
  ].join(' '),
  imageSrc: MainImage,
  author: FusebitAuthor.tomek,
  shareText: 'Twilio, Segment, Github, and Auth0 are Setting a New Trend. Is your SaaS left behind?',
};

function Post() {
  return (
    <>
      <Section id="intro">
        Most people buy cars to get from A to B, not because they like driving. That’s why Uber and Lyft are so
        successful.
        <Break />
        Most people watch a movie to entertain themselves, not because they enjoy a trek to a local DVD rental place.
        That’s why Netflix streaming disrupted the video market.
        <Break />
        Many businesses get ahead of the competition by focusing on the core of their product. They do it by reducing
        barriers in the customer’s experience. Twilio, Segment, Auth0, and Github have done exactly that by spearheading
        a new pattern of platform integration and customization that utilizes serverless technologies.
      </Section>
      <Section id="serverless" header="Platform Extensibility in the Serverless Era" tocText="Platform Extensibility">
        Serverless technologies like AWS Lambda, Google Functions, or Azure Functions reduce the cost of running an
        application by shifting the operational burden from the application developer to the platform provider.
        Developers using serverless technologies spend more time writing code to solve business problems and less time
        maintaining, monitoring, scaling, and securing the infrastructure.
        <Break />
        Visionary companies like Twilio, Segment, Github, and Auth0 have embraced serverless technologies to
        dramatically improve the experience of integrating and customizing their platforms. They empower their customers
        and partners by offering an integrated, serverless scripting solution. This serverless extensibility pattern
        allows users to focus on the essence of the integration or customization logic expressed in code, rather than
        the devops work around it. It also gives users much more flexibility to fine-tune the behavior of the platform
        to meet their needs – more flexibility than they would have with any configuration-based feature, no matter how
        complex that feature may be.
        <Quote>
          <i>Serverless extensibility</i> removes friction from SaaS integration and customization. Customers and
          partners can fine tune a SaaS platform much faster than before, leading to higher conversion and retention.
        </Quote>
        Serverless extensibility is often used in places where webhooks were used before. Webhooks required the user to
        set up and run a web service. While flexible, this approach put a lot of burden on the end user. Instead,
        serverless extensibility allows the user to focus exclusively on the code of the custom business logic, with the
        operational burden of running it as a service assumed by the SaaS platform (and often delegated to one of the
        generic serverless compute providers).
        <Break />
        Users of a SaaS platform benefit from serverless extensibility in a number of ways:
        <ul>
          <li>Fast time to market when integrating and customizing the platform.</li>
          <li>Reduced cost of ownership from the removed operational burden.</li>
          <li>No need for a separate relationship with a third party provider to support platform customization.</li>
        </ul>
        The SaaS platform itself benefits with an improved business dynamic:
        <ul>
          <li>Increased conversion rates thanks to much lower adoption barriers.</li>
          <li>Higher retention rates, since users who have customized a platform are less likely to leave.</li>
        </ul>
        Let’s have a look at how Twilio, Segment, Github, and Auth0 embraced the serverless extensibility pattern in
        practice.
      </Section>
      <Section id="twilio" header="Twilio Functions">
        Twilio has a longstanding reputation as a developer-friendly company. Their call-to-action on the landing page
        is Get your API key, after all. Twilio has always had a robust API story that includes events exposed as
        webhooks.
        <Break />
        It was no surprise then when Twilio became one of the first SaaS companies to embrace the serverless
        extensibility pattern by shipping{' '}
        <Link openTab href="https://www.twilio.com/blog/2017/05/introducing-twilio-functions.html">
          Twilio Functions
        </Link>{' '}
        in 2017:
        <Break />
        <Image src={TwilioImage} />
        In the announcement blog post, Carter Rabasa outlined the set of problems Twilio wanted to address with Twilio
        Functions:
        <ul>
          <li>Having to stand up a public server to implement webhooks creates friction.</li>
          <li>
            Issues with internet infrastructure (DNS, proxies, connectivity blips) between Twilio’s system and any given
            webhook implementation makes it difficult to troubleshoot applications.
          </li>
          <li>Scaling is a problem many developers don’t want to deal with.</li>
        </ul>
        Twilio Functions address these problems by providing a scripting environment embedded in the Twilio platform. It
        is based on Node.js and supports NPM modules. Users can use it to implement functions that are invoked wherever
        Twilio exposes webhooks in their platform. Twilio Functions remove the operational burden Twilio users had to
        deal with when self-hosting the webhook code before. They seamlessly scale to accommodate the changing workload.
        By being co-located with Twilio infrastructure, Twilio functions are more predictable and have a lower response
        latency than webhook implementations that involve traversing internet infrastructure.
        <Break />
        Twilio Functions utilize AWS Lambda as the underlying serverless compute infrastructure and inherit many of its
        characteristics, including a per-invocation pricing model.
      </Section>
      <Section id="segment" header="Segment Hosted Functions">
        Segment is a platform for collection, unification, and redistribution of customer data to a wide range of
        marketing, data warehouse, and analytics tools. As with many marketing technology platforms, its strength relies
        heavily on the available integrations and their ease of use.
        <Break />
        Segment recently announced the introduction of{' '}
        <Link href="https://segment.com/blog/partners-integrate-in-hours-not-weeks/">Segment hosted functions</Link> in
        their platform. The offering aims to remove the friction Segment partners currently face when introducing new
        integrations:
        <Break />
        <Image src={SegmentImage} />
        <Break />
        The announcement outlines the reasons for introducing hosted functions that echo those of Twilio:
        <ul>
          <li>
            Accepting Segment data usually requires partners to perform data transformation, and they found setting up a
            new endpoint to do that unnecessarily complex.
          </li>
          <li>The new endpoint required new infrastructure and monitoring, which adds friction.</li>
        </ul>
        Segment hosted functions address these adoption concerns by providing an embedded scripting environment.
        Partners can now adjust the data before calling into their existing APIs instead of standing up and maintaining
        a service to perform the data transformation on their side. Removing the infrastructure and operation concerns
        related to running this data transformation code has greatly reduced the barrier to entry for Segment partners:
        <Quote>Partners: integrate in hours, not weeks. Building with Segment is now 10x easier.</Quote>
        Segment hosted functions run on AWS Lambda, similarly to Twilio Functions. Unlike Twilio Functions, however,
        they currently provide a curated Node.js environment that runs a dedicated programming model with a
        hand-selected set of NPM modules that enable simple data transformation and making HTTP calls.
      </Section>
      <Section id="github" header="Github Actions">
        Github has long been the go-to solution for git-based source control for many developers and organizations.
        Source control usually exists in the broader context of devops processes, for example, continuous integration
        and deployment. Supporting those processes requires an extensive set of integrations to address the specific
        needs of an organization or project.
        <Break />
        Github has long had a rich set of webhooks to support such integration scenarios. In October 2018 Github
        announced <Link href="https://github.blog/2018-10-17-action-demos/">Github Actions</Link> to further improve
        their integration story. Why? Because{' '}
        <i>
          “configuring the apps and services that make up your development cycle takes significant time and effort”.
        </i>{' '}
        As of this writing, Github Actions remain in public beta.
        <Break />
        <Image src={GithubImage} />
        <Break />
        Github takes a notably different approach to serverless extensibility compared to Twilio or Segment. Github’s
        core competency is in managing the lifecycle of code. Instead of providing an embedded scripting editor for
        actions like Twilio or Segment did, Github relies on its core platform to manage the lifecycle of actions’ code.
        Actions are represented as docker images, the definition of which is stored in a Github repository. Actions can
        be further combined into workflows and triggered by many of the same events exposed as Github webhooks today.
        Github provides the infrastructure for executing and monitoring these workflows, removing the operational burden
        for its users.
      </Section>
      <Section id="auth0" header="Auth0 Rules" noBreak>
        <Quote small>
          <strong>DISCLAIMER:</strong> I worked at Auth0 between 2014-19 and focused on the serverless extensibility
          story from inception.
        </Quote>
        Auth0 offers a world-class identity and access management platform. Similar to Twilio, it always has had a
        strong developer focus - for the first two years the company’s tagline read{' '}
        <i>“Identity made simple for developers”.</i> Identity is a complex space, with most applications requiring a
        lot of customization and integration. In order to remove friction from the customization process, Auth0 decided
        to offer an embedded scripting solution almost from day one. The mechanism was called Auth0 Rules:
        <Break />
        <Image src={Auth0Image} />
        <Break />
        Over time, the technology underlying the Auth0 Rules got more sophisticated and led to the development of Auth0
        Hooks and the Auth0 Extensions, which are different ways of exposing customization and integration capabilities
        within the Auth0 platform. The underlying reasons for their existence remained the same, however:
        <ul>
          <li>
            Customers enjoyed greatly reduced barriers to entry and time to market. They were able to make the Auth0
            platform do exactly what their use case required in a fraction of the time that alternative mechanisms, like
            webhooks, would have taken.
          </li>
          <li>
            Customers benefited from reduced operational burden. They did not need to set up and maintain infrastructure
            to support webhook-based customizations.
          </li>
          <li>
            Auth0 sales engineers were able to shorten the sales cycles and close more deals. Thanks to the quick time
            to market for customizations, the timeline of proof-of-concept delivery was substantially reduced.
          </li>
          <li>The Auth0 platform itself enjoyed dramatically increased retention rates.</li>
        </ul>
        <Quote>Customers who customized the system were 10x less likely to leave the platform</Quote>
        When Auth0 first enabled Auth0 Rules in 2014, the serverless trend had not yet taken off. None of the
        technologies available today (AWS Lambda, Google Functions, Azure Functions, etc.) were in the market. As a
        result, Auth0 invested in a proprietary technology stack called webtasks that enabled the company to execute
        customer-developed customizations with strong isolation guarantees and low latency the scenario required. To get
        an insight into the technical details of this project, please read{' '}
        <Link href="https://tomasz.janczuk.org/2018/03/how-to-build-your-own-serverless-platform.html">
          How to build your own serverless platform.
        </Link>
      </Section>
      <Section id="left-behind" header="Is Your SaaS Left Behind?">
        Visionary companies like Twilio, Segment, Github, or Auth0 that invested in serverless extensibility within
        their platforms are better equipped to serve their customers than their competition. What are your options if
        you don’t want to be left behind?
        <Break />
        The companies highlighted in this post chose to build a serverless extensibility solution from scratch, often
        using one of the available serverless compute providers like AWS Lambda among many other building blocks. Given
        their size, these companies can afford to dedicate engineering resources for the initial development and ongoing
        maintenance without incurring a noticeable impact on the engineering of their core platform and building their
        primary business.
        <Break />
        Did you know you can enable similar capabilities in your platform as these thought leaders did, but without
        investing in a large internal effort?
        <Quote>
          <strong>Fusebit.io</strong> offers a managed serverless extensibility solution that can be embedded into your
          SaaS in days.
        </Quote>
        <Link noVisit to="/">
          Fusebit
        </Link>{' '}
        is the only embedded serverless extensibility solution for SaaS platforms available on the market today. Built
        by the same team that created the Auth0 serverless extensibility solution, Fusebit derives from years of
        experience to support the demands of industry-leading SaaS platforms. With Fusebit, any SaaS platform can start
        reaping the benefits of serverless extensibility in a fraction of the time it would take to develop a similar
        capability in-house and without incurring the ongoing cost and distraction of operating the in-house solution
        afterward.
      </Section>
    </>
  );
}

export default { Post, meta };
