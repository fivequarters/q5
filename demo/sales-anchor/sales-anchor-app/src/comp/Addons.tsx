import { Fade } from '@5qtrs/fade';
import { FaTrash, FaEdit, FaCloudDownloadAlt } from '@5qtrs/icon';
import { Image } from '@5qtrs/image';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Editor } from './Editor';

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
  flex-basis: 33%;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
  padding: 10px;
  color: #34495e;
`;

const AddonName = styled.div`
  flex: 1;
  margin-left: 10px;
`;

const AddonDescription = styled.div`
  flex: 1;
  margin-left: 10px;
`;

const AddonEditIcon = styled.div`
  font-size: 20px;
`;

const AddonManagementIcon = styled.div`
  font-size: 20px;
`;

// --------------
// Exported Types
// --------------

export type AddonsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Addons({ ...rest }: AddonsProps) {
  const [addon, setAddon] = useState('');

  function onClickNewInquiry() {
    setAddon(addon === 'on-new-inquiry' ? '' : 'on-new-inquiry');
  }

  function onClickNewQualifiedLead() {
    setAddon(addon === 'on-new-qualified-lead' ? '' : 'on-new-qualified-lead');
  }

  const displayEditor = { display: addon === 'on-new-inquiry' ? '' : 'none' };
  console.log(addon);
  return (
    <Container {...rest}>
      {/* <Fade visible={addon === 'on-new-inquiry'} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Editor style={displayEditor} onEditorBack={onEditorBack} addon={addon} />
      </Fade> */}
      <Fade visible={true} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Inner>
          <SubHeading>Installed</SubHeading>
          <AddonList>
            <AddonBox onClick={onClickNewInquiry}>
              <Image src="./assets/img/clearbit.png" style={{ width: 30, height: 30 }} />
              <AddonName>Clearbit</AddonName>
              <AddonDescription>
                Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your
                customers, identify future prospects, and personalize every single marketing and sales interaction.
              </AddonDescription>
              <AddonEditIcon>
                <FaEdit />
              </AddonEditIcon>
              <AddonManagementIcon>
                <FaTrash />
              </AddonManagementIcon>
            </AddonBox>
          </AddonList>
          <SubHeading>Available</SubHeading>
          <AddonList>
            <AddonBox onClick={onClickNewQualifiedLead}>
              <Image src="./assets/img/clearbit.png" style={{ width: 30, height: 30 }} />
              <AddonName>Clearbit</AddonName>
              <AddonDescription>
                Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your
                customers, identify future prospects, and personalize every single marketing and sales interaction.
              </AddonDescription>
              <AddonManagementIcon>
                <FaCloudDownloadAlt />
              </AddonManagementIcon>
            </AddonBox>
            <AddonBox>
              <Image src="./assets/img/clearbit.png" style={{ width: 30, height: 30 }} />
              <AddonName>Clearbit</AddonName>
              <AddonDescription>
                Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your
                customers, identify future prospects, and personalize every single marketing and sales interaction.
              </AddonDescription>
              <AddonManagementIcon>
                <FaCloudDownloadAlt />
              </AddonManagementIcon>
            </AddonBox>
            <AddonBox>
              <Image src="./assets/img/clearbit.png" style={{ width: 30, height: 30 }} />
              <AddonName>Clearbit</AddonName>
              <AddonDescription>
                Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your
                customers, identify future prospects, and personalize every single marketing and sales interaction.
              </AddonDescription>
              <AddonManagementIcon>
                <FaCloudDownloadAlt />
              </AddonManagementIcon>
            </AddonBox>
          </AddonList>
        </Inner>
      </Fade>
    </Container>
  );
}
