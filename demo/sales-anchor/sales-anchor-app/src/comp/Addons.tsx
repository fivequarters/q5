import { Fade } from '@5qtrs/fade';
import { Image } from '@5qtrs/image';
import React, { useState, useContext, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { Addon } from './Addon';
import { ApiContext } from './ApiContext';
import { AddonState, AddonItem } from '../api/Api';

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

// -------------  -
// Exported Types
// --------------

export type AddonsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Addons({ ...rest }: AddonsProps) {
  const [installedAddons, setInstalledAddons] = useState<AddonItem[]>([]);
  const api = useContext(ApiContext);
  const [availableAddons, setAvailableAddons] = useState<AddonItem[]>(api.getAvailableAddons());

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
