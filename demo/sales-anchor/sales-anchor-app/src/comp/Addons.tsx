import { Fade } from '@5qtrs/fade';
import { Image } from '@5qtrs/image';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Addon, AddonState } from './Addon';

// -------------------
// Internal Components
// -------------------

const Container = styled.div``;
const Inner = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 60px;
  margin-top: -10px;
`;

const SubHeading = styled.div`
  font-weight: 300;
  color: #c0392b;
  padding: 10px;
  margin: 10px 0px;
  border-bottom: 1px solid #d6dbdf;
`;

const AddonList = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const modalStyle = { backgroundColor: '#76D7C4' };

const addonList = [
  {
    name: 'Clearbit',
    logoUrl: './assets/img/clearbit.png',
    description:
      'Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your customers, identify future prospects, and personalize every single marketing and sales interaction.',
    version: '1.1.0.0',
    state: AddonState.NotInstalled,
    secretName: 'API Key',
    secretKey: 'CLEARBIT_KEY',
    secretValue: '',
    template: {
      nodejs: {
        files: {
          'index.js': `
          const lookupSocial = require('./lookupSocial.js');

          module.exports = (ctx, cb) => { 
              lookupSocial(ctx.body, ctx.configuration, e => cb(e, { body: ctx.body }));
          }`,
          'lookupSocial.js': `
          module.exports = (lead, configuration, cb) => {
            const clearbit_key = ctx.configuration.CLEARBIT_KEY;
            const clearbit = require('clearbit')(clearbit_key);
            var Person = clearbit.Person;
            
            Person.find({email: lead.email}). 
              then(person => {
                lead.github = person.github.handle;
                lead.twitter = person.twitter.handle;
                lead.linkedin = person.linkedin.handle;
                cb();
              });
          }`,
          'package.json': { dependencies: { clearbit: '*' } },
        },
      },
    },
  },
  {
    name: 'Salesforce',
    logoUrl: './assets/img/salesforce.png',
    description:
      'Salesforce is the world’s #1 customer relationship management (CRM) platform. Our cloud-based, CRM applications for sales, service, marketing, and more don’t require IT experts to set up or manage — simply log in and start connecting to customers in a whole new way.',
    version: '3.4.0.0',
    state: AddonState.NotInstalled,
    secretName: 'Client Secret',
    secretKey: 'SALESFORCE_SECRET',
    secretValue: '',
  },
  {
    name: 'Intercom',
    logoUrl: './assets/img/intercom.png',
    description:
      'A new and better way to acquire, engage and retain customers. Modern products for sales, marketing and support to connect with customers and grow faster.',
    version: '1.0.0.0',
    state: AddonState.NotInstalled,
    secretName: 'API Key',
    secretKey: 'INTERCOM_KEY',
    secretValue: '',
  },
  {
    name: 'Slack',
    logoUrl: './assets/img/slack.png',
    description:
      'Slack is a collaboration hub, where the right people and the right information come together, helping everyone get work done.',
    version: '0.5.6.0',
    state: AddonState.NotInstalled,
    secretName: 'API Key',
    secretKey: 'SLACK_KEY',
    secretValue: '',
  },
];

// -------------  -
// Exported Types
// --------------

export type AddonsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

interface AddonItem {
  logoUrl: string;
  name: string;
  description: string;
  version: string;
  state: AddonState;
  secretName: string;
  secretKey: string;
  secretValue: string;
  template?: any;
}

export function Addons({ ...rest }: AddonsProps) {
  const [installedAddons, setInstalledAddons] = useState<AddonItem[]>([]);
  const [availableAddons, setAvailableAddons] = useState<AddonItem[]>(addonList);

  function renderAddon(addon: AddonItem) {
    function onInstall() {
      addon.state = AddonState.Installed;
      const updatedAvailableAddons = availableAddons.slice();
      updatedAvailableAddons.splice(updatedAvailableAddons.indexOf(addon), 1);
      setAvailableAddons(updatedAvailableAddons);

      setInstalledAddons(installedAddons.slice().concat(addon));
    }

    function onUninstall() {
      addon.state = AddonState.NotInstalled;
      const updatedInstalledAddons = installedAddons.slice();
      updatedInstalledAddons.splice(updatedInstalledAddons.indexOf(addon), 1);
      setInstalledAddons(updatedInstalledAddons);

      setAvailableAddons(availableAddons.slice().concat(addon));
    }

    function onSecretChange(secretValue: string) {
      addon.secretValue = secretValue;
    }

    return (
      <Addon
        key={addon.name}
        name={addon.name}
        logoUrl={addon.logoUrl}
        description={addon.description}
        version={addon.version}
        state={addon.state}
        secretName={addon.secretName}
        secretKey={addon.secretKey}
        secretValue={addon.secretValue}
        onInstall={onInstall}
        onUninstall={onUninstall}
        onSecretChange={onSecretChange}
        template={addon.template}
      />
    );
  }

  const installedItems = installedAddons.map(renderAddon);
  const availableItems = availableAddons.map(renderAddon);

  return (
    <Container {...rest}>
      <Fade visible={true} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Inner>
          <SubHeading style={{ display: installedItems.length ? 'block' : 'none' }}>Installed</SubHeading>
          <AddonList style={{ display: installedItems.length ? 'flex' : 'none' }}>{installedItems}</AddonList>
          <SubHeading>Available</SubHeading>
          <AddonList>{availableItems}</AddonList>
        </Inner>
      </Fade>
    </Container>
  );
}
