import React from 'react';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitPage as Page, FusebitSection as Section, FusebitBreak as Break } from '@5qtrs/fusebit-page';

// -------------------
// Exported Components
// -------------------

export function Support() {
  return (
    <Page height="100%" header="Support" updatedOn="August 9, 2019">
      <Section height="100%">
        Status and uptime monitoring can be found at:{' '}
        <Link href="http://status.fusebit.io">http://status.fusebit.io</Link>
        <Break />
        To initiate a support request, please contact us <Link href="https://fusebitio.slack.com">
          via Slack
        </Link> or <Link href="mailto:support@fusebit.io">email</Link>.
        <Break />
        For information on the Fusebit support program, please review the{' '}
        <Link href="https://cdn.fusebit.io/assets/legal/SupportProgram-v1.0.1.pdf">Support Program</Link> document.
      </Section>
    </Page>
  );
}
