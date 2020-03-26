import React from 'react';
import { Image } from '@5qtrs/image';
import { FusebitAuthor } from '@5qtrs/fusebit-blog';
import { FusebitSection as Section, FusebitBreak as Break, FusebitQuote as Quote } from '@5qtrs/fusebit-page';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import MainImage from '../../../../assets/img/blog-interview-with-smartsheet-main.png';

// -------------------
// Exported Components
// -------------------

const meta = {
  postId: 'interview-with-scott-willeke-smartsheet-director-product',
  title: 'Premium Integrations as a Differentiator',
  subtitle: 'Interview with Scott Willeke, Director of Product at Smartsheet',
  year: 2020,
  month: 3,
  day: 10,
  summary: [
    "We interviewed Scott Willeke, Director of Product at Smartsheet, about his company's",
    'approach to integrations. Learn from an industry leader about how deep integrations',
    'were a deliberate strategic choice that paid off.',
  ].join(' '),
  imageSrc: MainImage,
  author: FusebitAuthor.yavor,
  shareText:
    "Interview with Scott Willeke, Director of Product at Smartsheet, about his company's approach to integrations",
};

function Post() {
  return (
    <>
      <Section id="intro">
        As part of Fusebit's journey towards helping SaaS companies build powerful custom integrations, we caught up
        with Scott Willeke, Director of Product at Smartsheet, to learn from an industry leader about his company's
        approach to this space. Scott was the force behind Smartsheet's Connectors product line of premium-priced
        integrations for Jira and Salesforce, which drove >$1M in ARR in their first year on the market, and >$2M in the
        second year.
      </Section>
      <Section id="about-smartsheet" header="What does Smartsheet do?" tocText="About Smartsheet">
        At the highest level, Smartsheet is a cloud-based platform that allows organizations of all sizes to plan,
        capture, manage, automate, and report on work across the business, empowering you to move faster, drive
        innovation, and achieve more.
        <Break />
        Our core capability enables teams to edit and easily share work in grid, card, Gantt, or calendar views. Capture
        data with forms, automate workflows and repetitive tasks, and roll up work into shared dashboards and reports.
        <Break />
        The capabilities align your people with your technology so your entire business can move faster, drive
        innovation, and achieve more.
      </Section>
      <Section id="use-cases" header="What purpose do integrations serve in your product?" tocText="Use Cases">
        Our Connectors and Integrations enable teams to work seamlessly across their critical business platforms and
        apps, with real-time synchronization and visibility. All stakeholders view the most up-to-date information
        across systems — without switching between apps. Connectors are a premium capability available for additional
        fees to customers with Business and Enterprise plans.
      </Section>
      <Section
        id="business-value"
        header="What is the business value of integrations in your platform?"
        tocText="Business Value"
      >
        Last year, the typical information worker had 13 apps that they use on a regular basis. For any product to think
        that they are going to be the only app that an information worker uses is unrealistic. We know our customers
        have to work with those apps and are not in Smartsheet 100% of the time, so we add value for them by making sure
        that it is as seamless as possible to do so. That could mean surfacing notifications in their preferred app when
        something's going on in Smartsheet that they care about, or pushing work they have to manage from another
        application into Smartsheet.
        <Quote>
          What we have to recognize is that apps have become very deep and specialized (and that's a good thing), and
          it’s really important for us to leverage that specialization to help customers manage their work in
          Smartsheet.
        </Quote>
        One example that is top of mind is our integration with Microsoft Teams. Smartsheet serves many enterprise
        customers, who have a variety of different teams: typical information workers who sit in an office, as well as
        front-line workers. Many of these customers use Microsoft Teams to communicate with the rest of the people that
        they work with. Imagine a property management scenario where an employee discovers a safety issue on site and
        uses a Smartsheet form, directly inside of Teams, to report it and coordinate with others. When the issue is
        fixed, he can receive a notification flowing from Smartsheet right inside Teams. Smartsheet provides tracking
        and executive visibility of this whole process through dashboards and reports. Similar scenarios are used
        heavily used by customers today, and the integration with Teams has been very well-received.
      </Section>
      <Section
        id="implementation"
        header="What is your approach to implementing integrations?"
        tocText="Implementation"
      >
        We have an API that allows you to do everything: provisioning users; creating sheets, reports, and dashboards;
        and even populating those sheets or reading data from them. We end up with a lot of customers using the API to
        synchronize data with Smartsheet.
        <Break />
        For common tools such as Salesforce and Microsoft Dynamics CRM, we have dedicated Smartsheet Integrations that
        are part of the product.
        <Quote>
          We end up standing up whole teams around those integrations, making sure they are highly available and they
          scale with often dramatic or spiky usage. That's what we do and we do it well, but it's a difficult job,
          that's why customers want <strong>us</strong> to provide that service. A lot of those types of integrations
          end up being a huge investment, and pretty complicated.
        </Quote>
        Managing all those “-ilities”, while shaping data between two different systems in a performant way, is hard
        work.
      </Section>
      <Section
        id="unique-requirements"
        header="How do you manage unique customer requirements in your integrations?"
        tocText="Unique Requirements"
      >
        The integrations we end up productizing have to work for a large variety of customers, so they cover mostly
        common functionality.
        <Quote>
          However, almost every organization I talk to says “we do things kind of weird”. Salesforce is a great example
          of that: any business that has a sizable sales force ends up customizing their implementation.
        </Quote>
        Customers don't use Salesforce as-is; they add custom fields and custom objects that are tuned to be optimal for
        their business, so you end up with these really custom workstreams and processes. When it comes to integrating
        that with Smartsheet, customers work with our Consulting teams.
        <Break />
        Our Consulting teams are very good at what they do, and they build custom integrations every day. That doesn’t
        mean it comes without challenges: customers frequently expect the same level of availability and scalability
        from these purpose-built custom integrations that they expect from the product itself.
        <Quote>
          That’s tough… no company can justify putting a team behind an integration that's built for a single customer
          at a price that a customer would find realistic.
        </Quote>
        That becomes a big challenge, a reluctant partnership with the customer. We bring a lot of the systems and
        business process expertise, but the ongoing maintenance becomes something that the customer either has to pay
        for, or they end up having to support it on their end. That includes making sure the integration stays up and
        running as scale it as their usage changes, as their Salesforce configuration changes, or their processes
        change. They have to make a choice, either they're going to maintain this, or they're going to work with
        consultants and professional services outside of their company to do that.
      </Section>
      <Section
        id="integrations-maintenance"
        header="How do you negotiate ongoing maintenance of custom integrations?"
        tocText="Integrations Maintenance"
      >
        The Smartsheet Professional Services team is not a product team, and they build hundreds of integrations in a
        year, so it ends up being quite expensive for them to maintain custom integrations. It’s just not feasible for a
        lot of customers to pay a SaaS company to operate and service a specialized product only for them. Most
        customers end up taking ownership of the integration at some point, and there usually is a support contract in
        place, with some thoughtful rules around it or a fixed bank of hours. At the enterprise level, a lot of
        customers have teams that can operate custom integrations, but if they're operating that, it's one less thing
        they can do.{' '}
        <Quote>
          This leads to a big challenge: we want the customer to have a good experience, and if something goes wrong, we
          want to be accountable and support them through that, but at the same time we can't take full responsibility
          for a solution that's custom-built for them.
        </Quote>{' '}
        It's a challenge on the customer's part and it's a challenge on our part… one that we don’t have a great
        solution for.
      </Section>
      <Section
        id="breakthrough"
        header="Historically, was there any breakthrough improvement in your integration story that had the most impact?"
        tocText="Breakthrough"
      >
        A big transformative moment for us was when we transitioned away from our early thinking around integrations as
        free tools for marketing and awareness. When we started investing in our Connector platform, we went super deep
        into a few apps that we saw a lot of value in for our customers. It was something that we thought was so
        valuable that we would partner with customers and make it a premium-priced feature, which offered dramatically
        more value than our integrations in the past. It ended up being something that was deeply integrated in our
        product, and we were able to put more effort into it on all sides, and form a whole business motion around it.
        Professional Services and Customer Support teams had special trainings around it, we launched to the customer
        with Professional Services right out of the gate, to make sure they got the integration set up in an optimal
        way. It was pretty transformative for us to take a step back and say, let's not think about this as something
        that's rooted in marketing, but instead rooted in a deep value proposition to our customers. It was a big bet
        and a hard decision for us to make at the time, but it has worked out really well for us and for a lot of
        customers. We’ve certainly doubled down on the whole platform a few times now.
      </Section>
      <Section
        id="challenges"
        header="What challenges remain in your integration story today? How do you see the role of integrations evolve going forward given the SaaS ecosystem trends?
"
        tocText="Challenges"
      >
        Something that I think a lot about is how do we enable customers to be successful on their own with
        integrations. We're ending up with more technically-savvy customers, who are willing and able to do a lot more
        on their own, and we must enable and empower them to do that. It can be tricky, because we want them to be
        successful, and they can have a bad experience if they do something the wrong way, without the knowledge and
        expertise that we have.{' '}
        <Quote>
          Figuring out a way to enable customers and partners to integrate with Smartsheet in a more self-service way,
          while also making them successful, is something that I think about a fair bit, and so should the whole
          industry. Customers are more savvy, they want to do more on their own, but it's still pretty hard to do that
          in a way that's enterprise-quality.
        </Quote>{' '}
        You don't want to deal with the proverbial computer under Bob's desk that the whole business depends on, nobody
        wants that, and we don't want that either.
      </Section>
      <Section
        id="advice"
        header="Any words of wisdom for a SaaS vendor implementing their integration story today?"
        tocText="Advice"
      >
        I would just say, don't spray and pray. Be strategic, don't be tactical about it. For any SaaS vendor,
        especially ones in earlier stages, the opportunity cost of doing things is so high that you must be very
        thoughtful in making sure that integrations you are investing in are strategic for your business and your
        customers. They should really be something with unique value added; don't just look at the popular apps out
        there to check a box. That's not the right way to think about it, you definitely need to be a lot more strategic
        about the choices you're making.
      </Section>
    </>
  );
}

export default { Post, meta };
