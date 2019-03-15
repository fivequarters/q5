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
`;

const AddonEditIcon = styled.div`
  font-size: 20px;
  width: 45px;
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

const SubHeading = styled.div`
  font-weight: 300;
  color: #c0392b;
  padding: 10px;
  margin: 10px 0px;
  border-bottom: 1px solid #d6dbdf;
`;

const StyledModal = styled(Modal)`
  background-color: rgba(255, 255, 255, 0.45);
`;

const ModalInnerStyle = styled.div`
  background-color: white;
  width: 800px;
  height: 500px;
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
  background-color: #d3d3d3;
  padding: 5px 15px;
  width: 250px;
  content-align: center;
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
  secretValue: string;
  onInstall: () => void;
  onUninstall: () => void;
  onSecretChange: (secretValue: string) => void;
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
  secretValue,
  onInstall,
  onUninstall,
  onSecretChange,
  ...rest
}: AddonProps) {
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [secretDisplayValue, setSecretDisplayValue] = useState(secretValue);

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

  function handleChange(event: React.FormEvent<HTMLInputElement>) {
    setSecretDisplayValue(event.currentTarget.value);
    onSecretChange(secretDisplayValue);
  }

  //const displayEditor = { display: addon === 'on-new-inquiry' ? '' : 'none' };

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
            <AddonName>{name}</AddonName>
          </ModalInnerHeader>
          <AddonDescription>{description}</AddonDescription>
          <p key={secretName}>
            <Label>{secretName}</Label>
            <Input type="password" value={secretDisplayValue} onChange={handleChange} />
          </p>
          <Button onClick={installConfirmClick}>
            <p>Install addon</p>
          </Button>
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
          <p>Configure this addon by setting the properties below:</p>
          <p key={secretName}>
            <Label>{secretName}</Label>
            <Input type="password" value={secretDisplayValue} onChange={handleChange} />
          </p>
          <Button>
            <p>Customize with code (advanced)</p>
          </Button>
        </ModalInnerStyle>
      </StyledModal>
      <AddonImage src={logoUrl} />
      <AddonName>{name}</AddonName>
      <AddonEditIcon style={{ display: state === AddonState.Installed ? 'block' : 'none' }}>
        <FaArrowUp style={{ color: '#d3d3d3', marginRight: 5 }} />
        <FaEdit onClick={onClickEdit} />
      </AddonEditIcon>
      <AddonManagementIcon onClick={onClickAddonManagement}>
        <FaCloudDownloadAlt style={{ display: state === AddonState.Installed ? 'none' : 'block' }} />
        <FaTrash style={{ display: state === AddonState.Installed ? 'block' : 'none' }} />
      </AddonManagementIcon>
      <AddonDescription>{description}</AddonDescription>
    </Container>
  );
}
