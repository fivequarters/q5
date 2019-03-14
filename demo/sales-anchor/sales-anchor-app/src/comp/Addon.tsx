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

const Container = styled.div`
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

const StyledModal = styled(Modal)`
  background-color: rgba(255, 255, 255, 0.45);
`;

const ModalInnerStyle = styled.div`
  background-color: white;
  width: 800px;
  height: 500px;
  padding: 30px;
`;

const Input = styled.input`
  font-size: 14px;
  padding: 5px;
  width: 300px;
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

export type AddonSecret = {
  name: string;
  value: string;
};

export type AddonProps = {
  logoUrl: string;
  name: string;
  description: string;
  version: string;
  state: AddonState;
  secrets: AddonSecret[];
  onInstall: () => void;
  onUninstall: () => void;
  onSecretChange: (secret: AddonSecret) => void;
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
  secrets,
  onInstall,
  onUninstall,
  onSecretChange,
  ...rest
}: AddonProps) {
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

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

  function renderSecrets() {
    const items = secrets.map(secret => {
      function handleChange(event: React.FormEvent<HTMLInputElement>) {
        secret.value = event.currentTarget.value;
        onSecretChange(secret);
      }

      return (
        <p key={secret.name}>
          <Label>{secret.name}</Label>
          <Input type="password" value={secret.value} onChange={handleChange} />
        </p>
      );
    });

    return items;
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
          <AddonImage src={logoUrl} />
          <AddonName>{name}</AddonName>
          <AddonDescription>{description}</AddonDescription>
          {renderSecrets()}
          <FaCloudDownloadAlt onClick={installConfirmClick} />
        </ModalInnerStyle>
      </StyledModal>
      <StyledModal visible={configModalVisible} onClick={configModalClick}>
        <ModalInnerStyle
          onClick={event => {
            event.stopPropagation();
          }}
        >
          {renderSecrets()}
          <button>Drop to code</button>
        </ModalInnerStyle>
      </StyledModal>
      <AddonImage src={logoUrl} />
      <AddonName>{name}</AddonName>
      <AddonEditIcon style={{ display: state === AddonState.Installed ? 'block' : 'none' }}>
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
