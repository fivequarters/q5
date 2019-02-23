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
  // max-width: 400px;
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

// --------------
// Exported Types
// --------------

export type EventActionsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function EventActions({ ...rest }: EventActionsProps) {
  const [eventAction, setEventAction] = useState('');

  function onEditorBack() {
    setEventAction('');
  }

  function onClick() {
    setEventAction('onNewInquiry');
  }

  const displayEditor = { display: eventAction ? '' : 'none' };
  const displayEventActions = { display: eventAction ? 'none' : '' };

  return (
    <Container {...rest}>
      <Fade visible={eventAction !== ''} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Editor style={displayEditor} onEditorBack={onEditorBack} eventAction={eventAction} />
      </Fade>
      <Fade visible={eventAction === ''} fadeIn={true} fadeOut={true} fadeRate={3}>
        <Inner style={displayEventActions}>
          <SubHeading>Inquiries</SubHeading>
          <EventActionRow onClick={onClick}>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On New Inquiry</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On Outgoing Response</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On Incoming Response</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>

          <SubHeading>Qualified Leads</SubHeading>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On New Qualified Lead</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On Outgoing Response</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
          <EventActionRow>
            <EventBoltIcon>
              <FaBolt />
            </EventBoltIcon>
            <EventName>On Incoming Response</EventName>
            <EventEditIcon>
              <FaEdit />
            </EventEditIcon>
          </EventActionRow>
        </Inner>
      </Fade>
    </Container>
  );
}
