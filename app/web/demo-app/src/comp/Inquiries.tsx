import React from 'react';
import styled from 'styled-components';
import { SalesAgent } from './SalesAgent';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 700px;
  margin-left: 60px;
`;

const Table = styled.div``;

const HeaderLabel = styled.div`
  font-size: 14px;
  color: #c0392b;
  font-family: 'Raleway', san-serif;
  font-weight: 400;
`;

const Header = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr 120px;
  padding: 10px;
  grid-gap: 20px;
  border-bottom: 1px solid #d6dbdf;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr 120px;
  padding: 10px;
  min-height: 70px;
  grid-gap: 20px;
  border-bottom: 1px solid #d6dbdf;
`;

const RowLabel = styled.div`
  display: flex;
  font-size: 13px;
  padding: 10px;
  text-align: initial;
  color: #34495e;
  font-family: 'Roboto', san-serif;
  align-items: center;
`;

// --------------
// Exported Types
// --------------

export type InquiriesProps = {
  data?: any;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Inquiries({ data, ...rest }: InquiriesProps) {
  const inquiries = data
    ? data.map((inquiry: any, index: number) => {
        if (!inquiry) {
          return '';
        }

        let picture = '';
        let agentName = 'Unassigned';
        if (inquiry.assignedTo) {
          picture = inquiry.assignedTo.picture;
          agentName = inquiry.assignedTo.name;
        }

        return (
          <Row key={inquiry.email}>
            <RowLabel>{inquiry.email}</RowLabel>
            <RowLabel>{inquiry.message}</RowLabel>
            <RowLabel>
              <SalesAgent profilePicture={picture} name={agentName} oddRow={index % 2 === 0} />
            </RowLabel>
          </Row>
        );
      })
    : null;

  return (
    <Container {...rest}>
      <Table>
        <Header>
          <HeaderLabel>Email</HeaderLabel>
          <HeaderLabel>Message</HeaderLabel>
          <HeaderLabel>Assigned To</HeaderLabel>
        </Header>
        {inquiries}
      </Table>
    </Container>
  );
}
