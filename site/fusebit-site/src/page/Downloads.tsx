import React from 'react';
import { FusebitLink as Link } from '@5qtrs/fusebit-link';
import { FusebitPage as Page, FusebitSection as Section, FusebitBreak as Break } from '@5qtrs/fusebit-page';

// -------------------
// Exported Components
// -------------------

export function Downloads() {
  return (
    <Page height="100%" header="Downloads" updatedOn="September 27, 2019">
      <Section>
        This page contains download links for the components of the Fusebit platform. A description of our versioning
        and support policy is available <Link href="/docs/integrator-guide/versioning/">here</Link>.
      </Section>
      <Section header="Fusebit Platform Current">
        <Link href="https://fivequarters.github.io/q5/#fusebit-platform-current">Release notes</Link>

        <ul>
          <li>
            Fusebit CLI -{' '}
            <Link href="https://www.npmjs.com/package/@fusebit/cli">https://www.npmjs.com/package/@fusebit/cli</Link>
          </li>
          <li>
            Fusebit Operations CLI -{' '}
            <Link href="https://cdn.fusebit.io/fusebit/platform/fusebit-ops-cli-1.12.0.tgz">
              https://cdn.fusebit.io/fusebit/platform/fusebit-ops-cli-1.12.0.tgz
            </Link>
          </li>
          <li>
            Fusebit Editor -{' '}
            <Link href="https://cdn.fusebit.io/fusebit/js/fusebit-editor/latest/fusebit-editor.min.js">
              https://cdn.fusebit.io/fusebit/js/fusebit-editor/latest/fusebit-editor.min.js
            </Link>
            <br />
            More information about the Fusebit CDN URL structure{' '}
            <Link href="/docs/integrator-guide/editor-integration/#including-the-fusebit-library">here</Link>
          </li>
          <li>
            Fusebit HTTP API
            <ul>
              <li>Cloud deployment - https://api.{'{region}'}.fusebit.io/v1</li>
              <li>Private deployment image - use Fusebit Operations CLI to download</li>
            </ul>
          </li>
        </ul>
      </Section>
      <Section header="Fusebit Platform v1.0 (LTS release)">
        <Link href="https://fivequarters.github.io/q5/#fusebit-platform-v10">Release notes</Link>
        <ul>
          <li>
            Fusebit CLI v1.0.* -{' '}
            <Link href="https://www.npmjs.com/package/@fusebit/cli/v/1.0.2">
              https://www.npmjs.com/package/@fusebit/cli/v/1.0.2
            </Link>
          </li>
          <li>
            Fusebit Operations CLI v1.11.* -{' '}
            <Link href="https://cdn.fusebit.io/fusebit/platform/fusebit-ops-cli-1.11.10.tgz">
              https://cdn.fusebit.io/fusebit/platform/fusebit-ops-cli-1.11.10.tgz
            </Link>
          </li>
          <li>
            Fusebit Editor v1.0.* -{' '}
            <Link href="https://cdn.fusebit.io/fusebit/js/fusebit-editor/1/0/fusebit-editor.min.js">
              https://cdn.fusebit.io/fusebit/js/fusebit-editor/1/0/fusebit-editor.min.js
            </Link>
            <br />
            More information about the Fusebit CDN URL structure{' '}
            <Link href="/docs/integrator-guide/editor-integration/#including-the-fusebit-library">here</Link>
          </li>
          <li>
            Fusebit HTTP API
            <ul>
              <li>Cloud deployment - https://api.{'{region}'}.fusebit.io/v1</li>
              <li>Private deployment image - use Fusebit Operations CLI to download</li>
            </ul>
          </li>
        </ul>
      </Section>
    </Page>
  );
}
