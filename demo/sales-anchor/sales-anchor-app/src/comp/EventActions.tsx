import { Fade } from '@5qtrs/fade';
import { FaBolt, FaEdit } from '@5qtrs/icon';
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

const EventActionRow = styled.div`
  display: flex;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
  padding: 10px;
  color: #34495e;
`;

const EventBoltIcon = styled.div`
  color: #d6dbdf
  font-size: 16px;
`;

const EventName = styled.div`
  flex: 1;
  margin-left: 10px;
`;

const EventEditIcon = styled.div`
  font-size: 20px;
`;

const WebhookInput = styled.input`
  font-size: 14px;
  padding: 5px;
  width: 400px;
`;

const WebhookContainer = styled.div`
  display: flex;
  margin-left: 20px;
`;

// --------------
// Exported Types
// --------------

export type EventActionsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function EventActions({ ...rest }: EventActionsProps) {
  const [eventAction, setEventAction] = useState('');

  function onClickNewInquiry() {
    setEventAction(eventAction === 'on-new-inquiry' ? '' : 'on-new-inquiry');
  }

  function onClickNewQualifiedLead() {
    setEventAction(eventAction === 'on-new-qualified-lead' ? '' : 'on-new-qualified-lead');
  }

  const displayEditor = { display: eventAction === 'on-new-inquiry' ? '' : 'none' };
  console.log(eventAction);
  return (
    <Container {...rest}>
      {/* <Fade visible={eventAction === 'on-new-inquiry'} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Editor style={displayEditor} onEditorBack={onEditorBack} eventAction={eventAction} />
      </Fade> */}
      <Fade visible={true} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Inner>
          <SubHeading>Leads</SubHeading>
          <EventActionRow onClick={onClickNewInquiry}>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On New Lead</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <EventActionRow style={{ display: eventAction === 'on-new-inquiry' ? '' : 'none' }}>
            <WebhookContainer>
              <Editor style={displayEditor} onEditorBack={onClickNewInquiry} eventAction={eventAction} />
            </WebhookContainer>
          </EventActionRow>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On Lead Changed</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <SubHeading>Opportunities</SubHeading>
          <EventActionRow onClick={onClickNewQualifiedLead}>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On New Opportunity</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <EventActionRow style={{ display: eventAction === 'on-new-qualified-lead' ? '' : 'none' }}>
            <WebhookContainer>
              <WebhookInput placeholder="e.g. https://myserver.com/on-new-opportunity" />
            </WebhookContainer>
          </EventActionRow>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On Opportunity Changed</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
        </Inner>
      </Fade>
    </Container>
  );
}
