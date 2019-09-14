import React from 'react';
import { Image } from '@5qtrs/image';
import { FusebitAuthor } from '@5qtrs/fusebit-blog';
import { FusebitSection as Section, FusebitBreak as Break, FusebitQuote as Quote } from '@5qtrs/fusebit-page';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import MainImage from '../../../../assets/img/blog-interview-with-zaius-main.png';
import ZaiusUsage from '../../../../assets/img/blog-interview-zaius-usage.png';
import ZaiusArchitecture from '../../../../assets/img/blog-interview-zaius-architecture.png';

// -------------------
// Exported Components
// -------------------

const meta = {
  postId: 'interview-with-tyler-mills-zaius',
  title: 'The next generation of hyper-personalized marketing',
  subtitle: 'Interview with Tyler Mills, Product Manager at Zaius',
  year: 2019,
  month: 9,
  day: 6,
  summary: [
    'We interviewed Tyler Mills, Product Manager at Zaius, about how a leading B2C CRM ',
    'is built, and the challenges and opportunities in front of marketers today.',
  ].join(' '),
  imageSrc: MainImage,
  author: FusebitAuthor.yavor,
  shareText: "We interviewed Tyler Mills, Product Manager at Zaius, about his company's approach to integrations",
};

function Post() {
  return (
    <>
      <Section id="intro">
        We spoke with Tyler Mills, Product Manager at <Link href="https://zaius.com">Zaius</Link>, to get the scoop on
        his company's approach to integrations. We asked Tyler what role integrations have played during their journey.
      </Section>
      <Section id="about-zaius" header="What does Zaius do?" tocText="About Zaius">
        Zaius is a <Link href="https://www.zaius.com/crm-platform">B2C CRM</Link> that collects and connects all
        customer, product, and web data to create a personal profile of each customer enabling hyper-personalized
        cross-channel marketing campaigns.
        <Break />
        Zaius stitches together customer data using a proprietary user resolution process and generates a comprehensive
        profile view of each customer's attributes and behavior. The platform then automatically generates actionable
        insights driven by state-of-the-art data science.
        <Break />
        The majority of Zaius clients are ecommerce companies selling products to consumers (B2C). As a result, they see
        immense value in a solution that connects to their existing ecommerce platform (e.g. Shopify, Magento), support
        platform (e.g. Zendesk), customer-focused add-ons (e.g. Loyalty Programs, Lead Capture Forms), and ad channels
        (e.g. Google, Facebook) so they can create highly targeted marketing based on the consolidated data set within
        Zaius.
      </Section>
      <Section
        id="business-value"
        header="What is the business value of integrations in your product?"
        tocText="Business Value"
      >
        <Quote>
          Zaius integrations make it easier to close deals, reduce the time required to onboard, increase the stickiness
          of the product, and improve core functionality by enabling new use cases for marketers.
        </Quote>
        When we launched our first integrations, we saw an immediate increase in the rate of closed deals. Prospects saw
        value in frictionless integrations with their existing workflows while existing clients saw value in having all
        their data in a single location.
        <Break />
        Because many of our integrations are "one-click" and require limited setup, they reduce the amount of onboarding
        effort required by our Customer Success team. For clients with custom or proprietary implementations,
        integrations still provide immense value in reducing onboarding cost at the edge by integrating with their
        secondary solutions (e.g. surveys, support tickets). Additionally, even when clients span sectors (e.g. travel
        vs. clothing), and as a result have very unique data sets, Zaius' integrations enable extensibility of the data
        model for each brand ensuring any use case can be addressed.
      </Section>
      <Section id="use-cases" header="What purpose do integrations serve in your product?" tocText="Use cases">
        Many of our integrations allow clients to import customer activity like orders, opening a ticket, visiting a
        website, opening a mobile app, as well as company data like Products or subscriptions.
        <Image src={ZaiusUsage} />
        This data provides the basis for powerful, targeted segments based on both behavior and attributes of customers.
        For example, you can create a segment sending a push message to all men, 25-34 years old, that abandoned their
        shopping cart during their session on web, as well as generating actionable insights backed by one-of-a-kind
        data science.
        <Break />
        We believe it should be as simple to get data out of Zaius as it is to get data into Zaius, and providing a
        consistent channel interface enables our development partners and client brands to do that quickly and easily.
        To this end, a future goal is to enable channels as integrations, enabling the addition of channels like SMS,
        Facebook Messenger, Direct Mail and Ad Networks with a nearly identical integration interface to that of data
        apps.
        <Quote>
          Leveraging data import apps that unify unique data allows every additional channel app to be extremely
          powerful as marketers do not have to rely on a siloed data set for segmentation and can orchestrate campaigns
          across a multitude of services.
        </Quote>
        <Break />
        Closing the loop of data in and data out integrations produces millions of data points that allow frequent and
        consistent improvement of our machine learning model. That allows Zaius users to be better at their job due to
        the fact that the data and channels are not siloed to a single team within their company or to a single set of
        services that they utilize outside of Zaius.
      </Section>
      <Section
        id="implementation"
        header="What is your approach to implementing integrations?"
        tocText="Implementation"
      >
        As of today, the majority of integrations are built by Zaius and Zaius contractors, but the goal is to open up
        the creation of these integrations to external developers as we build out the proper tooling for our partners.
        <Image src={ZaiusArchitecture} />
        Zaius integrations support a standard RESTful "push" interface using public APIs but also -- uniquely in the
        space -- hosted code execution of integration logic. This allows developers to create highly complex apps
        without worrying about the scalability of infrastructure or uptime by having Zaius host the app code and
        infrastructure.
        <Break />
        Zaius will automatically scale to manage short-running tasks like webhooks and long-running tasks like
        historical import jobs without any additional development effort required by a developer to create webhook URLs
        or manage job state.
        <Break />
        To ensure that marketers are provided a consistent user experience across apps, Zaius will auto-generate the
        setup forms for each app provided a simple form definition, ensuring that marketers can simply configure app
        settings in the Zaius UI without requiring an integration developer having to manage a complete front-end
        configuration form.
      </Section>
      <Section
        id="challenges"
        header="What challenges remain in your integration story today?        "
        tocText="Challenges"
      >
        <Quote>
          A big priority for us is ensuring that all integration experiences are consistent and do not require training.
        </Quote>
        It's much simpler to let all integrations simply "dump" data into Zaius as-is, but this limits the ability to
        leverage data for data science and prevents a consistent user experience across apps of the same category. For
        example, if every Loyalty integration used a different schema, it'd be impossible to ensure that integrations
        resulted in a simpler user experience. However, we have invested in, and continue to invest in a "Recipe"
        featureset that adds marketing campaigns automatically to accounts when an app is installed. This ensures that
        when an app is installed, all the common use-case campaigns are available without the marketer having to
        understand the data mapping from another system. Additionally, if a developer wants to leverage these campaigns,
        Zaius requires no additional effort &mdash; they'll be available automatically when their app is installed.
        These recipes ensure that the setup and use of apps are simple for both developers and the end-user.
        <Break />
        Another challenge is driving demand for developers to invest in integrations built on top of the Zaius platform.
        However, we strongly believe that investing in a developer-first mentality and providing a strong
        developer-centric featureset will provide confidence in enterprise businesses to invest in the Zaius platform,
        which will also drive partner demand to simplify the integration experience for mutual clients.
      </Section>
      <Section
        id="evolution"
        header="How do you see the role of integrations evolve going forward given the SaaS ecosystem trends?"
        tocText="Integrations evolution"
      >
        The companies that invest in extensibility as a core aspect of their product are the most likely to be set up
        for long-term success. It's often simpler to defer to an integration's functionality than to build the
        functionality natively with your internal engineering resources.{' '}
        <Quote>
          Building an integration-first platform allows your product team to focus on the core product philosophy and
          defer to partners and the ecosystem as needed.
        </Quote>
        In the marketing industry there are nearly 10,000 martech solutions. Any product without extensibility that
        tries to build to the common use cases of a marketer risk becoming a "checklist" product of features without any
        depth to functionality as they become more and more limited by the constraints of their engineering team.
      </Section>
      <Section
        id="advice"
        header="Any words of wisdom for a SaaS vendor implementing their integration story today?"
        tocText="Advice"
      >
        Extensibility is becoming a requirement to success. Don't hesitate to make integrations and extensibility a
        priority. From small businesses to large enterprises, integrating with an existing ecosystem of tools provides
        new pipeline, strengthens retention, and reduces the risk of product teams on spreading themselves too thin
        trying to build to every single use case.
      </Section>
    </>
  );
}

export default { Post, meta };
