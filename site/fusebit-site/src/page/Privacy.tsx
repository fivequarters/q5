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

// -------------------
// Exported Components
// -------------------

export function Privacy() {
  return (
    <Page header="Privacy Policy" updatedOn="May 14, 2021">
      <Section header="Introduction and background">
        Privacy is important to Fusebit and we take care to process personal data in accordance with applicable data
        protection laws and our contractual obligations. Please take the time to read this Privacy Policy to understand
        how and why we process, share and secure personal data, and to learn more about your rights and preferences.
        <Break />
        In this Policy, “Fusebit,” “we,” “us,” and “our” each means Fusebit Inc. If you have any questions about this
        Policy, please contact us at <a href="mailto:contact@fusebit.io">contact@fusebit.io</a>
        <ul>
          <li>Scope of this Policy</li>
          <li>Personal data we process and sources of personal data</li>
          <li>Why and how we process personal data</li>
          <li>Personal data sharing and disclosure</li>
          <li>Where we process personal data</li>
          <li>Personal data retention and deletion</li>
          <li>Your choices and rights</li>
          <li>Security of your personal data</li>
          <li>Children’s privacy</li>
          <li>How to contact Fusebit about privacy</li>
          <li>Changes to this Policy</li>
          <li>Additional information – Europe (including Switzerland and UK)</li>
          <li>Additional information – Residents of California, USA</li>
        </ul>
      </Section>

      <Section header="Scope of this Policy">
        This Policy applies where Fusebit processes personal data about human beings in its role as a controller of that
        personal data. This includes where you:
        <ul>
          <li>
            Visit our website https://fusebit.io or other Fusebit digital properties or branded social media pages
            (collectively, the “Sites”)
          </li>
          <li>Are identified as a prospect or potential customer of Fusebit</li>
          <li>Receive communications from us (including emails, phone calls or text messages)</li>
          <li>Apply for a job with Fusebit or are referred to us for recruitment reasons</li>
          <li>
            Provide services to Fusebit as a vendor or service provider or contact us for other purposes (e.g.
            regulatory officials working in their official capacity)
          </li>
          <li>Are a Fusebit customer or use our Services (as defined below) </li>
          <li>
            Register for, attend or participate in webinars, sponsored events, trade shows, online surveys, contests or
            other similar promotional events organized by Fusebit
          </li>
        </ul>
      </Section>

      <Section header="What this Policy doesn't cover">
        This Policy doesn’t apply where we process personal data about our customers’ end users that is processed
        through the Fusebit platform as part of the Services (i.e., where Fusebit acts as a processor).
        <Break />
        Fusebit customers (and/or their affiliates) use our services to integrate their applications to other third
        party applications via the Fusebit Platform (“Fusebit Platform” or “Services”). We process personal data of our
        customers and their end users in accordance with our customers’ instructions. Our customers control the personal
        data that is made available to us via the Services. We act as a “processor” (for purposes of the General Data
        Protection Regulation or “GDPR”) or “service provider” (under the California Consumer Privacy Act or “CCPA”) or
        similar roles under applicable law on behalf of our customers. Our customers’ privacy policy or agreements with
        its end users (or the end user’s organization) will apply to such processing, not this Policy. If you are an end
        user of our customer - please contact that organization for information.
        <Break />
        If you are an end user of a Fusebit customer and have questions about personal data used by such customer, or if
        you want to exercise any of your rights regarding your personal data processed by such customer, we request that
        you contact the customer directly.
      </Section>

      <Section header="Personal data we process and sources of personal data">
        Information you give us directly:
        <ul>
          <li>
            Contact, biographical and payment information - this includes your contact details, social media handle,
            financial and credit card information if you are a customer paying directly through our Site, personal
            description and photograph, company name and position, login and password details, and information you share
            in discussion boards, search queries, feedback forums, or in customer service requests. This may also
            include audio or video recordings if you participate in a customer interview or testimonial (and where
            legally permissible).
          </li>
          <li>
            Employment and professional information - if you apply for a job at Fusebit, this includes your CV, resumé
            or other details about your education and employment history in relation to recruitment activities. In
            limited circumstances and only where legally permissible, this may include sensitive personal data, such as
            information about health or disability (e.g. where required for access) or information about ethnicity (e.g.
            where relevant to local diversity obligations for employment purposes).
          </li>
        </ul>
        Information we automatically collect from your interactions with us:
        <ul>
          <li>
            Technical information related to your visit to our Sites and/or Services - this includes your Internet
            protocol (IP) address (which can provide general information about your location, country, region, or city,
            but not your precise location), login information, device data such as device/browser type and version, time
            zone setting, and the operating system and platform you use when visiting our Sites or Services.
          </li>
          <li>
            Information about your use of our Site and Services, and your activities and your interaction with our
            marketing materials - this may include the web address of the page you were on prior to coming to our Site
            and the page you visit after you leave. We may also process information about what you do on our Sites, page
            response times, download errors, length of visits to certain pages, page interaction information (such as
            scrolling, clicks, downloads and mouse-overs), methods used to browse away from the page, and data relating
            to whether you engaged with our marketing materials (e.g. from web beacons).
          </li>
        </ul>
        Information we obtain from other sources:
        <ul>
          <li>
            Marketing and sales information (including your web browsing activity if cookies are enabled) - this
            includes biographical information and job information, contact details, sales orders from third party lead
            generation resources and marketing list vendors, or from publicly available sources such as LinkedIn. We may
            receive information about your browsing activities on websites outside of Fusebit collected via partners..
            We also receive information from marketing partners and event sponsors where we co-host events and webinars
            and from digital advertising partners, business partners, advertising networks, analytics providers, and
            search information providers.
          </li>
          <li>
            Log-in / authentication information and other information related to our provision of the Services - if you
            log in to our Site or Services by using credentials from a third party (for example, Google, Microsoft or
            GitHub), we will receive information that you (or the Customer on your behalf) have authorized for sharing.
          </li>
          <li>
            Employment / educational history / background check information - if you apply for a job at Fusebit, our
            service providers, partners or other agencies, such as recruitment agencies or referees, may provide
            information in relation to your application for employment with Fusebit, including information about
            immigration status or criminal allegations or offences in relation to compulsory background checks, where
            legally permissible.
          </li>
        </ul>
      </Section>
      <Section header="Why and how we process personal data">
        We use personal data in accordance with applicable legal requirements, including for the following purposes:
        <ul>
          <li>
            To administer, monitor the usage of and to improve the Site. We may use personal data to administer our Site
            and for internal operations, including troubleshooting, data analysis, testing, research, statistical and
            survey purposes and for safety and security including detecting, investigating, and preventing activities on
            our Site that may violate our terms of use, could be fraudulent, violate copyright, or other rules or that
            may be otherwise illegal. We may use information to improve our Site, to ensure that content is presented to
            you in the most effective manner and to allow you to participate in interactive features of our Site when
            you choose to do so.
          </li>
          <li>
            To provide, monitor the usage of and to improve the Services. We will use your personal data to provide,
            monitor the usage of and to improve the Services. This includes concluding contracts; billing and other
            account administration; provision of Services; event logging; internal research and product development;
            ensuring safety and security including detecting, investigating, and preventing activities on our Services
            that may be fraudulent or may violate copyright, contractual terms, or other rules, or that may otherwise be
            illegal; monitoring usage of the Service to ensure compliance with Fusebit policies; and conducting data
            analytics. This also includes provision of customer and technical support for the Services (including the
            recording of some support services provided via phone or with online conference services such as Zoom).
          </li>
          <li>
            To conduct marketing (including direct marketing) and sales activities. Where permissible by local law and
            in accordance with our legitimate interests, we may build and maintain sales &amp; marketing profiles of
            prospective and actual customers and of individuals representing them in a “customer relationship
            management” “CRM” database. We may combine information from different sources to better understand their
            interests and to provide content or information about the Services that are relevant to their business
            needs. E.g. We may enhance their CRM profile information with information about their activities on the Site
            or the Services with browsing activities on websites outside of Fusebit in order to target marketing to them
            and assess how likely they are to purchase Fusebit services. We may also do this to measure the
            effectiveness of advertising we serve to them and others.
          </li>
          <li>
            Employment purposes. If you have applied for a job with Fusebit, we will use your personal data for
            employment purposes, including recruitment and selection, to conduct background checks, to conduct
            onboarding if we decide to hire you, and to meet local legal obligations such as those related to health and
            safety and, where appropriate, diversity and inclusion.
          </li>
          <li>
            Other business purposes. We use personal data in accordance with law to administer our global business
            operations, including physical site operation, for record-keeping and corporate governance purposes, to
            respond to queries from individuals, and to comply with legal requirements or other such reasonable purposes
            related to our business operations.
          </li>
        </ul>
      </Section>
      <Section header="Personal data sharing and disclosure">
        Fusebit discloses personal data to third parties in accordance with legal and contractual requirements as
        follows:
        <Break />
        To third party service providers who process your personal data on our behalf and in accordance with our
        instructions and applicable law. These organisations, which will only use your personal data to the extent
        necessary to perform their support functions, include:
        <ul>
          <li>
            Operational, security and marketing service providers and other business partners with whom we have entered
            into agreements in relation to the processing of your personal data.
          </li>
          <li>
            Analytics and search engine providers that assist us in the improvement and optimisation of our Site and
            Services.
          </li>
          <li>
            Payment processing providers who provide secure payment processing services. Your payment card details are
            not shared with us by the provider.
          </li>
        </ul>
        To prospective sellers or buyers in the event that we sell or buy any business or assets, in which case we will
        disclose your personal data to the prospective seller or buyer of such business or assets, subject to this
        Policy; or to a third party acquiring all or substantially all of Fusebit’s assets, in which case personal data
        held by Fusebit about its customers will be one of the transferred assets.
        <Break />
        To third parties in order to comply with any legal obligation, or in order to enforce or apply our terms of
        service, and other agreements with you, or to protect the rights, property, or safety of Fusebit, our customers,
        or others.
      </Section>
      <Section header="Where we process personal data and international transfers">
        Storage. Fusebit primarily stores your personal data in the United States (“US”) and in the Europe Economic Area
        (“EEA”). Personal data that is transferred to, or stored at, a destination outside the EEA may not be subject to
        data protection laws that provide the same level of protection as those in your jurisdiction.
        <Break />
        Transfer. Where your personal data originates from the EEA, United Kingdom (“UK”) or from Switzerland and is
        transferred outside of your jurisdiction, we ensure that your personal data is subject to appropriate safeguards
        (such as a recognised legal adequacy mechanism or standard contractual clauses with third parties or between
        Fusebit group companies that process your personal data on our behalf) and that it is treated securely and in
        accordance with this Policy.
      </Section>
      <Section header="Personal data retention and deletion">
        <ul>
          <li>
            We retain personal data only for as long as is needed to exercise our legal obligations and for appropriate
            business purposes.
          </li>
          <li>
            If you have applied for a job at Fusebit, your personal data will usually be deleted 2 years after your
            application process concludes. You may contact contact@Fusebit.io to request that we delete your application
            and CV information sooner than this.
          </li>
          <li>
            We retain personal data during any period in which you have expressed an interest in our Sites or Services,
            for as long as necessary for us to meet our contractual obligations, and for six years after the end of a
            contract to identify any issues and resolve any legal proceedings.{' '}
          </li>
        </ul>
        At the end of retention periods, Fusebit may retain limited aggregate information for research purposes and to
        help us further improve our Services. This aggregate information does not include any personal data that relates
        to you as an individual.
      </Section>
      <Section header="Your choices and rights">
        <ul>
          <li>
            Opt-out of marketing email communications You can opt out of direct marketing from Fusebit at any time by
            checking and updating your contact details within your account, using the "unsubscribe" link at the end of
            all our marketing emails, or by submitting your email address to{' '}
            <a href="mailto:contact@fusebit.io">contact@fusebit.io</a>. If you are a customer and you opt-out of
            receiving marketing messages from Fusebit, you may continue to receive transactional communications from us
            regarding our Services.
          </li>
          <li>
            Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (“DNT”)
            feature or setting you can activate to signal your privacy preference not to have data about your online
            browsing activities monitored and collected. No uniform technology standard for recognizing and implementing
            DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other
            mechanism that automatically communicates your choice not to be tracked online. If a standard for online
            tracking is adopted that we must follow in the future, we will inform you about that practice in a revised
            version of this privacy policy.
          </li>
          <li>
            Mobile Device Settings Your mobile device may also have settings that, if enabled, restrict mobile app
            platforms (such as Apple and Google) from sharing certain information obtained by automated means.
          </li>
          <li>
            Additional Privacy Rights Depending on where you are located, you may have additional rights with respect to
            the personal data we process about you. If you reside in the EEA, the UK or in Switzerland, see the
            Additional information – Europe (including Switzerland and UK section below. If you are a California
            resident, see the Additional information – Residents of California, USA section below.
          </li>
        </ul>
      </Section>
      <Section header="Security of personal data">
        We are committed to maintaining the confidentiality, integrity, and security of your personal data and take
        precautions to protect such information. It is our policy to use reasonable and appropriate administrative,
        technical, and physical safeguards designed to protect the personal data we have about you from loss, theft, and
        unauthorized use, access, modification, or destruction. We periodically review our policies and procedures to
        confirm that they are appropriate to meet our commitment to our community, our customers, and ourselves.
        <Break />
        We also require third-party service providers acting on our behalf or with whom we share your personal data to
        maintain security measures consistent with applicable regulatory compliance requirements.
        <Break />
        Payments made on the Site are made through our payment gateway provider. Payment details you provide will be
        encrypted using secure sockets layer (SSL) technology before they are submitted to us over the internet.
        Personal data you supply to our payment gateway provider is not within our control and is subject to the
        provider’s privacy policy and terms and conditions.
        <Break />
        Notwithstanding our security safeguards, it is impossible to guarantee absolute security in all situations. If
        you have any questions about the security of our Site or Services, please contact us at{' '}
        <a href="mailto:contact@fusebit.io">contact@fusebit.io</a>. For your own security, please do not send any
        confidential or sensitive personal data to us via email or through the contact form on our website.
      </Section>
      <Section header="Children’s privacy">
        The Site is intended for use only by individuals who are at least 18 years of age. By using the Site, you
        confirm to us that you meet this requirement. If you are under the age of 18, you confirm you have received
        permission from your parent or guardian before using this Site or sending us personal data.
      </Section>
      <Section header="How to contact Fusebit about privacy">
        Questions, comments, and requests regarding this Policy are welcomed and should be addressed to:
        <Break />
        <strong>Fusebit, Inc</strong>
        <br />
        8714 233rd PL NE
        <br />
        Redmond, WA 98053
        <br />
        United States
        <br />
        <a href="mailto:contact@fusebit.io">contact@fusebit.io</a>.
      </Section>
      <Section header="Changes to this Policy">
        We periodically review and update this Policy to describe changes to our data processing practices or to reflect
        changes in laws and regulations that apply to Fusebit. You can check when this Policy was last revised by
        referring to the “Updated” date at the top of this Policy. We encourage you to review the Policy whenever you
        interact with us to stay informed about our privacy practices.
        <Break />
        If the changes we make to this Policy are significant, we may notify you including through a prominent notice on
        the Site or the Services, as appropriate. If you do not agree with the privacy practices disclosed in the
        Policy, we recommend you stop using our Site and Services.
      </Section>
      <Section header="Additional information – Europe (including Switzerland and the UK)">
        This section applies to individuals located in the EEA, the UK or in Switzerland and outlines additional
        information about your rights and choices regarding Fusebit’s processing of your personal data under the GDPR or
        equivalent laws in Switzerland and UK.
        <Break />
        A. Legal Basis
        <Break />
        We collect and process personal data about you only where we have a legal basis for doing so under applicable
        data protection laws. Our legal bases include processing personal data as follows:
        <ul>
          <li>
            <i>With your consent:</i> Where appropriate or legally required, we collect and use personal data about you
            subject to your consent (e.g. where legally required for direct marketing activities or to process your
            application for employment).
          </li>
          <li>
            <i>Performance of contract:</i> We collect and use personal data about you to contract with you or to
            perform a contract that you have with us.
          </li>
          <li>
            <i>To protect the legitimate interests of Fusebit, you or other parties:</i> We process personal data for
            our legitimate interests such as to improve our Site or Services; deliver content; optimize your experience;
            market our Services; provide appropriate security for the Services; and to protect you, Fusebit and other
            third parties.
          </li>
          <li>
            <i>Where necessary for compliance with laws:</i> We may process personal data about you: (1) as required by
            law, such as to comply with a subpoena or similar legal process; (2) when we believe in good faith that
            disclosure is necessary to protect our rights or property, to protect your health and safety or the health
            and safety of others; (3) to investigate fraud or respond to a government request; or (4) if we are involved
            in a merger, acquisition, or sale of all or a portion of our assets.
          </li>
        </ul>
        B. Data Subject Rights
        <Break />
        You have certain rights related to the personal data we hold about you in our capacity as “controller.” Some of
        these rights may be subject to limitations and qualifications including (1) where fulfilling your request would
        adversely affect other individuals, company trade secrets or intellectual property; (2) where there are
        overriding public interest reasons; or (3) where we are required by law to retain your personal data.
        <ul>
          <li>
            <i>Right of Access:</i> You have the right to access personal data held by us.
          </li>
          <li>
            <i>Right to Rectification:</i> You have the right to rectify personal data that is inaccurate or incomplete.
          </li>
          <li>
            <i>Right to Data Portability:</i> You have the right to request a copy of certain personal data we hold
            about you in a structured, machine readable format, and to ask us to share this information with another
            entity.
          </li>
          <li>
            <i>Right to Erasure:</i> You have the right to have personal data deleted where: (1) you believe that it is
            no longer necessary for us to hold your personal data; (2) we are processing your personal data based on
            legitimate interests and you object to such processing and we cannot demonstrate an overriding legitimate
            ground for the processing; (3) you have provided your personal data to us with your consent and you wish to
            withdraw your consent and there is no other ground under which we can process your personal data; or (4)
            where you believe the personal data we hold about you is being unlawfully processed by us.
          </li>
          <li>
            <i>Right to Restrict Processing:</i> You have the right to ask us to restrict (stop any active) processing
            of your personal data where: (1) you believe the personal data we hold about you is inaccurate and while we
            verify accuracy; (2) we want to erase your personal data as the processing is unlawful, but you want us to
            continue to store it; (3) we no longer need your personal data for our processing, but you require us to
            retain the data for the establishment, exercise, or defense of legal claims; or (4) you have objected to us
            processing your personal data based on our legitimate interests and we are considering your objection.
          </li>
          <li>
            <i>Right to Object:</i> You can object to our processing of your personal data based on our legitimate
            interests. We will no longer process your personal data unless we can demonstrate an overriding legitimate
            purpose.
          </li>
          <li>
            <i>Objection to Direct Marketing, Automated Decision Making, and Profiling:</i> You have the right to object
            to our processing of personal data for direct marketing communications, and profiling related to direct
            marketing. We will stop processing the personal data for that purpose.
          </li>
          <li>
            <i>Automated Profiling:</i> In the event that we conduct automated decision making that has a legal or other
            significant impact we will tell you about this and you have the right to challenge such decisions and
            request that it is reviewed by a human.
          </li>
          <li>
            <i>Withdrawal of Consent:</i> Where the processing of your personal data by us is based on consent, you have
            the right to withdraw that consent without detriment at any time by emailing{' '}
            <a href="mailto:contact@fusebit.io">contact@fusebit.io</a> or other means provided.
          </li>
        </ul>
        C. Exercising your Rights
        <Break />
        If you would like to exercise the rights set forth above, please contact us at{' '}
        <a href="mailto:contact@fusebit.io">contact@fusebit.io</a> Before we respond to requests for personal data, we
        will require that you verify your identity or the identity of any data subject for whom you are requesting
        personal data. Our verification methods may include requesting that you log into your account, confirm your
        contact information or email address, and/or provide documents for identity verification depending on the nature
        of your relationship with us.
        <Break />
        We will fulfil your request within one month of receipt unless an exception applies. If you have concerns
        unresolved by Fusebit, you may also address any grievance directly with the relevant Supervisory Authority or
        the ICO for UK-based individuals.
        <Break />
        We will fulfil your request within one month of receipt unless an exception applies. <Break />
        <Break />
        D. Contact Details for Fusebit’s Data Protection Officer and EU Representative
        <Break />
        Fusebit, Inc. is the controller for personal data collected in connection with the use of the Site and Services
        in the EEA, the UK and Switzerland. Our Data Protection Officer can be contacted at{' '}
        <a href="mailto:contact@fusebit.io">contact@fusebit.io</a>.
      </Section>
      <Section header="Additional information – Residents of California, USA">
        This section applies to California residents and outlines your rights and choices with respect to Fusebit’s
        processing of your personal data under the CCPA.
        <Break />
        For business purposes in the last twelve months, we may have collected, used, and shared personal data about you
        as described in this Policy. To learn more about the personal data we collect, including the specific pieces of
        personal data collected, sources of collection, our purposes for collection, and the categories of service
        providers with whom we share personal data, please see the Personal data we process and sources of personal
        data, Why and how we process personal data and Personal data sharing and disclosure sections of this Policy.
        <Break />
        We do not sell personal data for business or commercial purposes.
        <Break />
        A. Consumer Rights
        <Break />
        The CCPA grants California consumers certain rights in connection with the personal data collected by
        businesses, as described below:
        <ul>
          <li>
            <i>Right to Know:</i> You have the right to know the categories and specific pieces of personal data we have
            collected about you in the previous 12 months.
          </li>
          <li>
            <i>Right to Deletion:</i> You have the right to request that we delete any personal data we have collected
            about you.
          </li>
          <li>
            <i>Right to Request Information:</i> You have the right to request information about our collection, sale,
            and disclosure of your personal data from the previous 12 months.
          </li>
          <li>
            <i>Right to Opt-out of the Sale of Personal Data:</i> You have the right to opt-out of the sale of personal
            data we have collected about you. As of the date of this Policy, Fusebit does not sell the personal data we
            have collected about you.
          </li>
          <li>
            <i>Right to Non-Discrimination:</i> You have the right to not receive discriminatory treatment for
            exercising any of your CCPA rights. We will not treat you differently for exercising any of the rights
            described above.
          </li>
        </ul>
        B. Exercising Your Rights
        <Break />
        To exercise any of the CCPA rights above, please contact us by emailing{' '}
        <a href="mailto:contact@fusebit.io">contact@fusebit.io</a>. We will fulfill your request within 30 days of
        receiving your request. Some of these rights may be subject to limitations and qualifications, such as where
        fulfilling the request would conflict with federal, state or local law, regulatory inquiries, subpoenas or
        Fusebit’s ability to defend against legal claims.
        <Break />
        We will verify your request using your email address. If you’ve created an account with us, we will also verify
        your request using the information associated with your account, including billing information. Government
        identification may be required. We cannot respond to your request if we cannot verify your identity and/or
        authority to make the request on behalf of another and confirm the personal data relates to you. Making a
        verifiable consumer request does not require you to create an account with us.
        <Break />
        If you wish to use an authorized agent to submit a request to opt-out on your behalf, you must provide the
        authorized agent written permission signed by you, the consumer. We may deny a request from an authorized agent
        if the agent cannot provide to Fusebit your signed permission demonstrating that they have been authorized to
        act on your behalf.
      </Section>
    </Page>
  );
}
