import React from 'react';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitText as Text, FusebitTextType as TextType } from '@5qtrs/fusebit-text';
import { FusebitPage as Page, FusebitSection as Section, FusebitBreak as Break } from '@5qtrs/fusebit-page';

// -------------------
// Exported Components
// -------------------

export function Legal() {
  return (
    <Page height="100%" header="Legal" updatedOn="September 9, 2019">
      <Section height="100%">
        Legal information about the Fusebit service is available here:
        <ul>
          <li>
            <Link href="https://cdn.fusebit.io/assets/legal/SubscriptionAgreement-v1.0.1.pdf">
              Subscription Agreement
            </Link>
          </li>
          <li>
            <Link href="https://cdn.fusebit.io/assets/legal/FusebitPlatformLicenseAgreement-v1.0.0.pdf">
              License Agreement
            </Link>
          </li>
          <li>
            <Link href="https://cdn.fusebit.io/assets/legal/AcceptableUsePolicy-v1.0.1.pdf">Acceptable Use Policy</Link>
          </li>
          <li>
            <Link href="https://cdn.fusebit.io/assets/legal/ServiceLevelDescription-v1.0.0.pdf">
              Service Level Description
            </Link>
          </li>
          <li>
            <Link href="https://cdn.fusebit.io/assets/legal/Sub-Processors-v1.0.1.pdf">Sub Processors</Link>
          </li>
          <li>
            <Link href="https://cdn.fusebit.io/assets/legal/SupportProgram-v1.0.1.pdf">Support Program</Link>
          </li>
        </ul>
      </Section>
    </Page>
  );
}
