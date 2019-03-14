import { Fade } from '@5qtrs/fade';
import { FaTrash, FaEdit, FaCloudDownloadAlt } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Editor } from './Editor';
import { Modal } from '@5qtrs/modal';
import { Addon, AddonState, AddonSecret } from './Addon';

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
    secrets: [{ name: 'API Key', value: '' }],
  },
  {
    name: 'Salesforce',
    logoUrl: './assets/img/salesforce.png',
    description:
      'Salesforce is the world’s #1 customer relationship management (CRM) platform. Our cloud-based, CRM applications for sales, service, marketing, and more don’t require IT experts to set up or manage — simply log in and start connecting to customers in a whole new way.',
    version: '3.4.0.0',
    state: AddonState.NotInstalled,
    secrets: [{ name: 'Client ID', value: '' }, { name: 'Client Secret', value: '' }],
  },
  {
    name: 'Intercom',
    logoUrl: './assets/img/intercom.png',
    description:
      'A new and better way to acquire, engage and retain customers. Modern products for sales, marketing and support to connect with customers and grow faster.',
    version: '1.0.0.0',
    state: AddonState.NotInstalled,
    secrets: [{ name: 'API Key', value: '' }],
  },
  {
    name: 'Slack',
    logoUrl: './assets/img/slack.png',
    description:
      'Slack is a collaboration hub, where the right people and the right information come together, helping everyone get work done.',
    version: '0.5.6.0',
    state: AddonState.NotInstalled,
    secrets: [{ name: 'API Key', value: '' }],
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
  secrets: AddonSecret[];
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

    function onSecretChange(secret: AddonSecret) {
      console.log(addon.secrets[addon.secrets.indexOf(secret)].value);
      console.log(secret.value);

      addon.secrets[addon.secrets.indexOf(secret)].value = secret.value;
    }

    return (
      <Addon
        key={addon.name}
        name={addon.name}
        logoUrl={addon.logoUrl}
        description={addon.description}
        version={addon.version}
        state={addon.state}
        secrets={addon.secrets}
        onInstall={onInstall}
        onUninstall={onUninstall}
        onSecretChange={onSecretChange}
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
          <AddonList style={{ display: installedItems.length ? 'block' : 'none' }}>{installedItems}</AddonList>
          <SubHeading>Available</SubHeading>
          <AddonList>{availableItems}</AddonList>
        </Inner>
      </Fade>
    </Container>
  );
}
