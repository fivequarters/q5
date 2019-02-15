import React, { useState } from 'react';
import styled from 'styled-components';
import { FaBolt, FaEdit } from 'react-icons/fa';
import { Fade } from '@5qtrs/fade';
import { Editor } from './Editor';

// -------------------
// Internal Components
// -------------------

const Container = styled.div``;
const Inner = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px 50px;
  max-width: 500px;
  margin: 0px auto;
`;

const SubHeading = styled.div`
  font-family: 'Raleway', san-serif;
  font-size: 16px;
  font-weight: 300;
  color: #c0392b;
  margin-left: 5px;
  margin: 20px 0px;
`;

const EventActionRow = styled.div`
  display: flex;
  &:hover {
    color: #c0392b;
    cursor: pointer;
  }
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

// const StyledModal = styled(Modal)`
//   background-color: black;
//   opacity: 0.3;
// `;

// --------------
// Exported Types
// --------------

export type EventActionsProps = {} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function EventActions({ ...rest }: EventActionsProps) {
  const [eventAction, setEventAction] = useState('');

  return (
    <Container {...rest}>
      <Fade visible={eventAction !== ''} fadeIn fadeOut fadeRate={3}>
        <Editor
          style={{ display: eventAction ? '' : 'none' }}
          onEditorBack={() => setEventAction('')}
          eventAction={eventAction}
        />
      </Fade>
      <Fade visible={eventAction === ''} fadeIn fadeOut fadeRate={3}>
        <Inner style={{ display: eventAction ? 'none' : '' }}>
          <SubHeading>Inquiries</SubHeading>
          <EventActionRow onClick={() => setEventAction('onNewInquiry')}>
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
