import { Fade } from '@5qtrs/fade';
import { FaTrash, FaEdit, FaCloudDownloadAlt, FaArrowUp } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Editor } from './Editor';
import { Modal } from '@5qtrs/modal';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  flex-direction: row;
  width: 260px;
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
  margin-bottom: 30px;
`;

const AddonIcon = styled.div`
  font-size: 20px;
  width: 30px;
  height: 30px;
  align-content: center;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
`;

const SubHeading = styled.div`
  font-weight: 300;
  color: #c0392b;
  padding: 10px;
  margin: 10px 0px;
  border-bottom: 1px solid #d6dbdf;
`;

const StyledModal = styled(Modal)`
  background-color: rgba(100, 100, 100, 0.45);
`;

const ModalInnerStyle = styled.div`
  background-color: white;
  width: 800px;
  height: 550px;
  padding: 30px;
`;

const ModalInnerHeader = styled.div`
  flex-direction: row;
  display: flex;
`;

const Input = styled.input`
  font-size: 14px;
  padding: 5px;
  width: 300px;
`;

const Button = styled.div`
  margin-top: 30px;
  margin-bottom: 30px;
  background-color: #d3d3d3;
  padding: 15px;
  width: 250px;
  content-align: center;
  cursor: pointer;
`;

const Label = styled.label`
  margin-right: 30px;
`;

// --------------
// Exported Types
// --------------

export enum AddonState {
  NotInstalled,
  Installed,
  HasUpdate,
}

export type AddonProps = {
  logoUrl: string;
  name: string;
  description: string;
  version: string;
  state: AddonState;
  secretName: string;
  secretKey: string;
  secretValue: string;
  onInstall: () => void;
  onUninstall: () => void;
  onSecretChange: (secretValue: string) => void;
  template?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Addon({
  logoUrl,
  name,
  description,
  version,
  state,
  secretName,
  secretKey,
  secretValue,
  onInstall,
  onUninstall,
  onSecretChange,
  template,
  ...rest
}: AddonProps) {
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [secretDisplayValue, setSecretDisplayValue] = useState(secretValue);
  const [editorFunction, setEditorFunction] = useState('');

  function onClickAddonManagement() {
    if (state === AddonState.Installed) {
      // This addon has previously been added, show configuration UI
      onUninstall();
    } else {
      // This addon hasn't been added, show installation UI
      setInstallModalVisible(true);
    }
  }

  function onClickEdit() {
    setConfigModalVisible(true);
  }

  function installModalClick(e: React.MouseEvent<HTMLElement>) {
    setInstallModalVisible(false);
  }

  function installConfirmClick() {
    onInstall();
  }

  function configModalClick() {
    setConfigModalVisible(false);
  }

  function onCodeButtonClick() {
    setEditorFunction('usr-' + name.replace(/\s/g, '').toLowerCase() + '-' + version.replace(/[.]/g, ''));
  }

  function onEditorBack() {
    setEditorFunction('');
  }

  function handleChange(event: React.FormEvent<HTMLInputElement>) {
    setSecretDisplayValue(event.currentTarget.value);
    onSecretChange(secretDisplayValue);
  }

  // Add settings to template
  if (!template) template = {};
  if (!template.configuration) template.configuration = {};
  template.configuration[secretKey] = secretDisplayValue;

  return (
    <Container {...rest}>
      <StyledModal visible={installModalVisible} onClick={installModalClick}>
        <ModalInnerStyle
          onClick={event => {
            event.stopPropagation();
          }}
        >
          <SubHeading>Install addon</SubHeading>
          <ModalInnerHeader>
            <AddonImage src={logoUrl} />
            <AddonName>
              {name}
              <br />
              {version}
            </AddonName>
          </ModalInnerHeader>
          <AddonDescription>{description}</AddonDescription>
          <Label>{secretName}</Label>
          <Input type="password" value={secretDisplayValue} onChange={handleChange} />
          <Button onClick={installConfirmClick}>Install addon</Button>
        </ModalInnerStyle>
      </StyledModal>
      <StyledModal visible={configModalVisible} onClick={configModalClick}>
        <ModalInnerStyle
          onClick={event => {
            event.stopPropagation();
          }}
        >
          <SubHeading>Configure addon</SubHeading>
          <ModalInnerHeader>
            <AddonImage src={logoUrl} />
            <AddonName>{name}</AddonName>
          </ModalInnerHeader>
          <div style={{ display: editorFunction !== '' ? 'none' : 'block' }}>
            <p>Configure this addon by setting the properties below:</p>
            <Label>{secretName}</Label>
            <Input type="password" value={secretDisplayValue} onChange={handleChange} />
            <Button onClick={onCodeButtonClick}> Customize with code (advanced)</Button>
          </div>
          <Editor
            style={{ display: editorFunction === '' ? 'none' : 'block' }}
            onEditorBack={onEditorBack}
            eventAction={editorFunction}
            template={template}
          />
        </ModalInnerStyle>
      </StyledModal>
      <AddonImage src={logoUrl} />
      <AddonName>
        {name}
        <br />
        {version}
      </AddonName>
      <AddonIcon style={{ display: state === AddonState.Installed ? 'block' : 'none' }}>
        <FaArrowUp style={{ color: '#d3d3d3' }} />
      </AddonIcon>
      <AddonIcon style={{ display: state === AddonState.Installed ? 'block' : 'none' }}>
        <FaEdit onClick={onClickEdit} />
      </AddonIcon>
      <AddonIcon onClick={onClickAddonManagement}>
        <FaCloudDownloadAlt style={{ display: state === AddonState.Installed ? 'none' : 'block' }} />
        <FaTrash style={{ display: state === AddonState.Installed ? 'block' : 'none' }} />
      </AddonIcon>
      <AddonDescription>{description}</AddonDescription>
    </Container>
  );
}
