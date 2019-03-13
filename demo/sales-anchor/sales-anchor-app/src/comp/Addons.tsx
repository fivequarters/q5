import { Fade } from '@5qtrs/fade';
import { FaTrash, FaEdit, FaCloudDownloadAlt } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Editor } from './Editor';
import { Modal } from '@5qtrs/modal';

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

const AddonBox = styled.div`
  display: flex;
  flex-direction: row;
  flex-basis: 33%;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 10px;
  color: #34495e;
`;

const AddonName = styled.div`
  flex: 2;
  margin-left: 10px;
  margin-bottom: 30px;
`;

const AddonImage = styled(Image)`
  width: 30px;
  height: 30px;
`;

const AddonDescription = styled.div`
  flex-basis: 100%;
`;

const AddonEditIcon = styled.div`
  font-size: 20px;
  width: 30px;
  height: 30px;
  align-content: center;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
`;

const AddonManagementIcon = styled.div`
  font-size: 20px;
  width: 30px;
  height: 30px;
  align-content: center;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
`;

const modalStyle = { backgroundColor: '#76D7C4' };

// --------------
// Exported Types
// --------------

export type AddonsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Addons({ ...rest }: AddonsProps) {
  const [addons, setAddons] = useState<string[]>([]);
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  function createOnClickAddonManagement(addonName: string) {
    return () => {
      if (addonInstalledAlready(addonName)) {
        // This addon has previously been added, show configuration UI
        alert('Added already, removing!');
        var addonsCopy = addons.slice();
        addonsCopy.splice(addons.indexOf(addonName), 1);
        setAddons(addonsCopy);
      } else {
        // This addon hasn't been added, show installation UI

        alert('Adding!');
        //setInstallModalVisible(true);

        setAddons(addons.concat(addonName));
      }
    };
  }

  function addonInstalledAlready(addonName: string) {
    return addons.includes(addonName);
  }

  function installModalClick() {
    setInstallModalVisible(false);
  }

  function configModalClick() {
    setConfigModalVisible(false);
  }

  //const displayEditor = { display: addon === 'on-new-inquiry' ? '' : 'none' };

  return (
    <Container {...rest}>
      {/*
      <Modal visible={installModalVisible} style={modalStyle} onClick={installModalClick}>
        <SubHeading>Install this addon</SubHeading>
      </Modal>
      <Modal visible={configModalVisible} style={modalStyle} onClick={configModalClick}>
        <SubHeading>Configure this addon</SubHeading>
      </Modal>
      */}
      {/* <Fade visible={addon === 'on-new-inquiry'} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Editor style={displayEditor} onEditorBack={onEditorBack} addon={addon} />
      </Fade> */}
      <Fade visible={true} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Inner>
          <SubHeading>Installed</SubHeading>
          <AddonList>
            <AddonBox>
              <AddonImage src="./assets/img/clearbit.png" />
              <AddonName>Clearbit</AddonName>
              <AddonEditIcon style={{ display: addonInstalledAlready('clearbit') ? 'block' : 'none' }}>
                <FaEdit />
              </AddonEditIcon>
              <AddonManagementIcon onClick={createOnClickAddonManagement('clearbit')}>
                <FaCloudDownloadAlt style={{ display: addonInstalledAlready('clearbit') ? 'none' : 'block' }} />
                <FaTrash style={{ display: addonInstalledAlready('clearbit') ? 'block' : 'none' }} />
              </AddonManagementIcon>
              <AddonDescription>
                Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your
                customers, identify future prospects, and personalize every single marketing and sales interaction.
              </AddonDescription>
            </AddonBox>
          </AddonList>
          <SubHeading>Available</SubHeading>
          <AddonList>
            <AddonBox>
              <AddonImage src="./assets/img/salesforce.png" />
              <AddonName>Salesforce</AddonName>
              <AddonEditIcon style={{ display: addonInstalledAlready('salesforce') ? 'block' : 'none' }}>
                <FaEdit />
              </AddonEditIcon>
              <AddonManagementIcon onClick={createOnClickAddonManagement('salesforce')}>
                <FaCloudDownloadAlt style={{ display: addonInstalledAlready('salesforce') ? 'none' : 'block' }} />
                <FaTrash style={{ display: addonInstalledAlready('salesforce') ? 'block' : 'none' }} />
              </AddonManagementIcon>
              <AddonDescription>
                Salesforce is the world’s #1 customer relationship management (CRM) platform. Our cloud-based, CRM
                applications for sales, service, marketing, and more don’t require IT experts to set up or manage —
                simply log in and start connecting to customers in a whole new way.
              </AddonDescription>
            </AddonBox>
            <AddonBox>
              <AddonImage src="./assets/img/intercom.png" />
              <AddonName>Intercom</AddonName>
              <AddonEditIcon style={{ display: addonInstalledAlready('intercom') ? 'block' : 'none' }}>
                <FaEdit />
              </AddonEditIcon>
              <AddonManagementIcon onClick={createOnClickAddonManagement('intercom')}>
                <FaCloudDownloadAlt style={{ display: addonInstalledAlready('intercom') ? 'none' : 'block' }} />
                <FaTrash style={{ display: addonInstalledAlready('intercom') ? 'block' : 'none' }} />
              </AddonManagementIcon>
              <AddonDescription>
                A new and better way to acquire, engage and retain customers. Modern products for sales, marketing and
                support to connect with customers and grow faster.
              </AddonDescription>
            </AddonBox>
            <AddonBox>
              <AddonImage src="./assets/img/slack.png" />
              <AddonName>Slack</AddonName>
              <AddonEditIcon style={{ display: addonInstalledAlready('slack') ? 'block' : 'none' }}>
                <FaEdit />
              </AddonEditIcon>
              <AddonManagementIcon onClick={createOnClickAddonManagement('slack')}>
                <FaCloudDownloadAlt style={{ display: addonInstalledAlready('slack') ? 'none' : 'block' }} />
                <FaTrash style={{ display: addonInstalledAlready('slack') ? 'block' : 'none' }} />
              </AddonManagementIcon>
              <AddonDescription>
                Slack is a collaboration hub, where the right people and the right information come together, helping
                everyone get work done.
              </AddonDescription>
            </AddonBox>
          </AddonList>
        </Inner>
      </Fade>
    </Container>
  );
}
