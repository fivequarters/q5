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
    <Page header="Privacy Policy" updatedOn="August 9, 2019">
      <Section>
        Thank you for choosing to be part of our community at Five Quarters LLC, doing business as Fusebit (“
        <strong>Fusebit</strong>”, “<strong>we</strong>”, “<strong>us</strong>”, or “<strong>our</strong>”). We are
        committed to protecting your personal information and your right to privacy. If you have any questions or
        concerns about our policy, or our practices with regards to your personal information, please contact us at
        contact@fusebit.io. When you visit our website{' '}
        <Link noVisit to="/">
          https://fusebit.io
        </Link>
        , and use our services, you trust us with your personal information. We take your privacy very seriously. In
        this privacy policy, we describe our privacy policy. We seek to explain to you in the clearest way possible what
        information we collect, how we use it and what rights you have in relation to it. We hope you take some time to
        read through it carefully, as it is important. If there are any terms in this privacy policy that you do not
        agree with, please discontinue use of our Sites and our services. This privacy policy applies to all information
        collected through our website (such as{' '}
        <Link noVisit to="/">
          https://fusebit.io
        </Link>
        ), and/or any related services, sales, marketing or events (we refer to them collectively in this privacy policy
        as the "Services"). Please read this privacy policy carefully as it will help you make informed decisions about
        sharing your personal information with us.
      </Section>

      <Section header="TABLE OF CONTENTS">
        <ol>
          <li>
            <Link noVisit to="/privacy#section-1">
              WHAT INFORMATION DO WE COLLECT?
            </Link>
          </li>
          <li>
            <Link noVisit to="/privacy#section-2">
              HOW DO WE USE YOUR INFORMATION?
            </Link>
          </li>
          <li>
            <Link noVisit to="/privacy#section-3">
              WILL YOUR INFORMATION BE SHARED WITH ANYONE?
            </Link>
          </li>
          <li>
            <Link noVisit to="/privacy#section-4">
              WHO WILL YOUR INFORMATION BE SHARED WITH?
            </Link>
          </li>
          <li>
            <Link noVisit to="/privacy#section-5">
              DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-6">
              IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-7">
              HOW LONG DO WE KEEP YOUR INFORMATION?
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-8">
              HOW DO WE KEEP YOUR INFORMATION SAFE?
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-9">
              DO WE COLLECT INFORMATION FROM MINORS?
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-10">
              WHAT ARE YOUR PRIVACY RIGHTS?
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-11">
              DATA BREACH
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-12">
              CONTROLS FOR DO-NOT-TRACK FEATURES
            </Link>
          </li>

          <li>
            <Link noVisit to="/privacy#section-13">
              DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
            </Link>
          </li>
          <li>
            <Link noVisit to="/privacy#section-14">
              DO WE MAKE UPDATES TO THIS POLICY?
            </Link>
          </li>
          <li>
            <Link noVisit to="/privacy#section-15">
              HOW CAN YOU CONTACT US ABOUT THIS POLICY?
            </Link>
          </li>
        </ol>
      </Section>

      <Section id="section-1" header="1. WHAT INFORMATION DO WE COLLECT?">
        <Text type={TextType.header4}>Personal information you disclose to us</Text>
        <Quote small>
          <strong>In Short:</strong> We collect personal information that you provide to us such as name, address,
          contact information, passwords and security data, and payment information.
        </Quote>
        We collect personal information that you voluntarily provide to us when registering at the Services expressing
        an interest in obtaining information about us or our products and services, when participating in activities on
        the Services or otherwise contacting us.
        <Break />
        The personal information that we collect depends on the context of your interactions with us and the Services,
        the choices you make and the products and features you use. The personal information we collect can include the
        following:
        <Break />
        <strong>Name and Contact Data:</strong> We collect your first and last name, email address, postal address,
        phone number, and other similar contact data.
        <Break />
        <strong>Credentials:</strong> We collect passwords, password hints, and similar security information used for
        authentication and account access.
        <Break />
        <strong>Payment Data:</strong> We collect data necessary to process your payment if you make purchases, such as
        your payment instrument number (such as a credit card number), and the security code associated with your
        payment instrument.
        <Break />
        All personal information that you provide to us must be true, complete and accurate, and you must notify us of
        any changes to such personal information.
        <Break />
        <Text type={TextType.header4}>Information automatically collected</Text>
        <Quote small>
          <strong>In Short:</strong> Some information – such as IP address and/or browser and device characteristics –
          is collected automatically when you visit our Services.
        </Quote>
        We automatically collect certain information when you visit, use or navigate the Services. This information does
        not reveal your specific identity (like your name or contact information) but may include device and usage
        information, such as your IP address, browser and device characteristics, operating system, language
        preferences, referring URLs, device name, country, location, information about how and when you use our Services
        and other technical information. This information is primarily needed to maintain the security and operation of
        our Services, and for our internal analytics and reporting purposes.
        <Break />
        Like many businesses, we also collect information through cookies and similar technologies.
      </Section>

      <Section id="section-2" header="2. HOW DO WE USE YOUR INFORMATION?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We process your information for purposes based on legitimate business interests,
          the fulfillment of our contract with you, compliance with our legal obligations, and/or your consent.
        </Quote>
        We use personal information collected via our Services for a variety of business purposes described below. We
        process your personal information for these purposes in reliance on our legitimate business interests, in order
        to enter into or perform a contract with you, with your consent, and/or for compliance with our legal
        obligations. We indicate the specific processing grounds we rely on next to each purpose listed below.
        <Break />
        We use the information we collect or receive:
        <ul>
          <li>
            <strong>To send you marketing and promotional communications:</strong> We and/or our third party marketing
            partners may use the personal information you send to us for our marketing purposes, if this is in
            accordance with your marketing preferences. You can opt-out of our marketing emails at any time (see the
            "WHAT ARE YOUR PRIVACY RIGHTS" below).
          </li>
          <li>
            <strong>To respond to user inquiries/offer support to users:</strong> We may use your information to respond
            to your inquiries and solve any potential issues you might have with the use of our Services.
          </li>
          <li>
            <strong>For other Business Purposes:</strong> We may use your information for other Business Purposes, such
            as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and
            to evaluate and improve our Services, products, marketing and your experience. We may use and store this
            information in aggregated and anonymized form so that it is not associated with individual end users and
            does not include personal information. We will not use identifiable personal information without your
            consent.
          </li>
        </ul>
      </Section>

      <Section id="section-3" header="3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We only share information with your consent, to comply with laws, to provide you
          with services, to protect your rights, or to fulfill business obligations.
        </Quote>
        We may process or share data based on the following legal basis:
        <ul>
          <li>
            <strong>Consent:</strong> We may process your data if you have given us specific consent to use your
            personal information in a specific purpose.
          </li>
          <li>
            <strong>Legitimate Interests:</strong> We may process your data when it is reasonably necessary to achieve
            our legitimate business interests.
          </li>

          <li>
            <strong>Performance of a Contract:</strong> Where we have entered into a contract with you, we may process
            your personal information to fulfill the terms of our contract.
          </li>

          <li>
            <strong>Legal Obligations:</strong> We may disclose your information where we are legally required to do so
            in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal
            process, such as in response to a court order or a subpoena (including in response to public authorities to
            meet national security or law enforcement requirements).
          </li>

          <li>
            <strong>Vital Interests:</strong> We may process your data when it is reasonably necessary to achieve our
            legitimate business interests.
          </li>

          <li>
            <strong>Legitimate Interests:</strong> We may disclose your information where we believe it is necessary to
            investigate, prevent, or take action regarding potential violations of our policies, suspected fraud,
            situations involving potential threats to the safety of any person and illegal activities, or as evidence in
            litigation in which we are involved.
          </li>
        </ul>
        More specifically, we may need to process your data or share your personal information in the following
        situations:
        <br />
        <ul>
          <li>
            <strong>Vendors, Consultants and Other Third-Party Service Providers:</strong> We may share your data with
            third party vendors, service providers, contractors or agents who perform services for us or on our behalf
            and require access to such information to do that work. Examples include: payment processing, data analysis,
            email delivery, hosting services, customer service and marketing efforts. We may allow selected third
            parties to use tracking technology on the Services, which will enable them to collect data about how you
            interact with the Services over time. This information may be used to, among other things, analyze and track
            data, determine the popularity of certain content and better understand online activity. Unless described in
            this Policy, we do not share, sell, rent or trade any of your information with third parties for their
            promotional purposes.
          </li>
          <li>
            <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during
            negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our
            business to another company.
          </li>
        </ul>
      </Section>

      <Section id="section-4" header="4. WHO WILL YOUR INFORMATION BE SHARED WITH?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We only share information with the following third parties.
        </Quote>
        We only share and disclose your information with the following third parties. We have categorized each party so
        that you may be easily understand the purpose of our data collection and processing practices. If we have
        processed your data based on your consent and you wish to revoke your consent, please contact us.
        <br />
        <ul>
          <li>
            <strong>Web and Mobile Analytics</strong> - Google Analytics
          </li>
          <li>
            <strong>Website Hosting</strong> - Amazon Web Services
          </li>
        </ul>
      </Section>

      <Section id="section-5" header="5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We may use cookies and other tracking technologies to collect and store your
          information.
        </Quote>
        We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store
        information. Specific information about how we use such technologies and how you can refuse certain cookies is
        set out in our Cookie Policy.
      </Section>

      <Section id="section-6" header="6. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We may transfer, store, and process your information in countries other than your
          own.
        </Quote>
        Our servers are located in United States. If you are accessing our Services from outside United States, please
        be aware that your information may be transferred to, stored, and processed by us in our facilities and by those
        third parties with whom we may share your personal information (see "WILL YOUR INFORMATION BE SHARED WITH
        ANYONE?" above), in and other countries.
        <Break />
        If you are a resident in the European Economic Area, then these countries may not have data protection or other
        laws as comprehensive as those in your country. We will however take all necessary measures to protect your
        personal information in accordance with this privacy policy and applicable law.
      </Section>

      <Section id="section-7" header="7. HOW LONG DO WE KEEP YOUR INFORMATION?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined
          in this privacy policy unless otherwise required by law.
        </Quote>
        We will only keep your personal information for as long as it is necessary for the purposes set out in this
        privacy policy, unless a longer retention period is required or permitted by law (such as tax, accounting or
        other legal requirements). No purpose in this policy will require us keeping your personal information for
        longer than 1 year past the termination of the user's account . When we have no ongoing legitimate business need
        to process your personal information, we will either delete or anonymize it, or, if this is not possible (for
        example, because your personal information has been stored in backup archives), then we will securely store your
        personal information and isolate it from any further processing until deletion is possible.
      </Section>

      <Section id="section-8" header="8. HOW DO WE KEEP YOUR INFORMATION SAFE?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We aim to protect your personal information through a system of organizational and
          technical security measures.
        </Quote>
        We have implemented appropriate technical and organizational security measures designed to protect the security
        of any personal information we process. However, please also remember that we cannot guarantee that the internet
        itself is 100% secure. Although we will do our best to protect your personal information, transmission of
        personal information to and from our Services is at your own risk. You should only access the services within a
        secure environment.
      </Section>

      <Section id="section-9" header="9. DO WE COLLECT INFORMATION FROM MINORS?" noBreak>
        <Quote small>
          <strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.
        </Quote>
        We do not knowingly solicit data from or market to children under 18 years of age. By using the Services, you
        represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such
        minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of
        age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data
        from our records. If you become aware of any data we have collected from children under age 18, please contact
        us at tomek@fusebit.io.
      </Section>

      <Section id="section-10" header="10. WHAT ARE YOUR PRIVACY RIGHTS?" noBreak>
        <Quote small>
          <strong>In Short:</strong> In some regions, such as the European Economic Area, you have rights that allow you
          greater access to and control over your personal information. You may review, change, or terminate your
          account at any time.
        </Quote>
        In some regions (like the European Economic Area), you have certain rights under applicable data protection
        laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to
        request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if
        applicable, to data portability. In certain circumstances, you may also have the right to object to the
        processing of your personal information. To make such a request, please use the contact details provided below.
        We will consider and act upon any request in accordance with applicable data protection laws.
        <Break />
        If we are relying on your consent to process your personal information, you have the right to withdraw your
        consent at any time. Please note however that this will not affect the lawfulness of the processing before its
        withdrawal.
        <Break />
        If you are resident in the European Economic Area and you believe we are unlawfully processing your personal
        information, you also have the right to complain to your local data protection supervisory authority. You can
        find their contact details here:{' '}
        <Link href="http://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm">
          http://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm
        </Link>
        .
        <Break />
        <Text type={TextType.header4}>Account Information</Text>
        <Break />
        If you would at any time like to review or change the information in your account or terminate your account, you
        can contact us using the contact information provided below. v Upon your request to terminate your account, we
        will deactivate or delete your account and information from our active databases. However, some information may
        be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our
        Terms of Use and/or comply with legal requirements.
        <Break />
        <strong>Cookies and similar technologies:</strong> Most Web browsers are set to accept cookies by default. If
        you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to
        remove cookies or reject cookies, this could affect certain features or services of our Services. To opt-out of
        interest-based advertising by advertisers on our Services visit{' '}
        <Link href="http://www.aboutads.info/choices/">http://www.aboutads.info/choices</Link>.
        <Break />
        <strong>Opting out of email marketing:</strong> You can unsubscribe from our marketing email list at any time by
        clicking on the unsubscribe link in the emails that we send or by contacting us using the details provided
        below. You will then be removed from the marketing email list – however, we will still need to send you
        service-related emails that are necessary for the administration and use of your account. To otherwise opt-out,
        you may contact us using the contact information provided below.
      </Section>

      <Section id="section-11" header="11. DATA BREACH">
        A privacy breach occurs when there is unauthorized access to or collection, use, disclosure or disposal of
        personal information. You will be notified about data breaches when Five Quarters LLC believes you are likely to
        be at risk of serious harm. For example, a data breach may be likely to result in serious financial harm or harm
        to your mental or physical well-being. In the event that Five Quarters LLC becomes aware of a security breach
        which has resulted or may result in unauthorized access, use or disclosure of personal information Five Quarters
        LLC will promptly investigate the matter and notify the applicable Supervisory Authority not later than 72 hours
        after having become aware of it, unless the personal data breach is unlikely to result in a risk to the rights
        and freedoms of natural persons.
      </Section>

      <Section id="section-12" header="12. CONTROLS FOR DO-NOT-TRACK FEATURES">
        Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (“DNT”)
        feature or setting you can activate to signal your privacy preference not to have data about your online
        browsing activities monitored and collected. No uniform technology standard for recognizing and implementing DNT
        signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism
        that automatically communicates your choice not to be tracked online. If a standard for online tracking is
        adopted that we must follow in the future, we will inform you about that practice in a revised version of this
        privacy policy.
      </Section>

      <Section id="section-13" header="13. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?" noBreak>
        <Quote small>
          <strong>In Short:</strong> Yes, if you are a resident of California, you are granted specific rights regarding
          access to your personal information.
        </Quote>
        California Civil Code Section 1798.83, also known as the “Shine The Light” law, permits our users who are
        California residents to request and obtain from us, once a year and free of charge, information about categories
        of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and
        addresses of all third parties with which we shared personal information in the immediately preceding calendar
        year. If you are a California resident and would like to make such a request, please submit your request in
        writing to us using the contact information provided below.
        <Break />
        If you are under 18 years of age, reside in California, and have a registered account with the Services, you
        have the right to request removal of unwanted data that you publicly post on the Services. To request removal of
        such data, please contact us using the contact information provided below, and include the email address
        associated with your account and a statement that you reside in California. We will make sure the data is not
        publicly displayed on the Services, but please be aware that the data may not be completely or comprehensively
        removed from our systems.
      </Section>

      <Section id="section-14" header="14. DO WE MAKE UPDATES TO THIS POLICY?" noBreak>
        <Quote small>
          <strong>In Short:</strong> Yes, we will update this policy as necessary to stay compliant with relevant laws.
        </Quote>
        We may update this privacy policy from time to time. The updated version will be indicated by an updated
        “Revised” date and the updated version will be effective as soon as it is accessible. If we make material
        changes to this privacy policy, we may notify you either by prominently posting a notice of such changes or by
        directly sending you a notification. We encourage you to review this privacy policy frequently to be informed of
        how we are protecting your information.
      </Section>

      <Section id="section-15" header="15. HOW CAN YOU CONTACT US ABOUT THIS POLICY?">
        If you have questions or comments about this policy, you may contact our Data Protection Officer (DPO), Tomasz
        Janczuk, by email at tomek@fusebit.io, or by post to:
        <Break />
        <strong>
          Five Quarters LLC
          <br />
          8714 233rd PL NE
          <br />
          Redmond, WA 98053
          <br />
          United States
          <br />
          contact@fusebit.io
        </strong>
      </Section>
    </Page>
  );
}
