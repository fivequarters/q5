import { Fade } from '@5qtrs/fade';
import { GoInfo } from '@5qtrs/icon';
import React, { useLayoutEffect, useState } from 'react';
import styled from 'styled-components';

// --------------
// Internal Types
// --------------

type NotidficationItemProps = {
  email?: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: 20px;
  width: 260px;
`;

const NotifcationBox = styled.div`
  display: flex;
  border: 1px solid #d6dbdf;
  border-radius: 5px;
  justify-content: center;
  align-items: center;
  width: 220px;
  background-color: white;
  padding: 10px;
  margin-bottom: 10px;
  overflow-x: hide;
`;

const InfoIcon = styled.div`
  color: #c0392b;
  margin-right: 10px;
`;

const InfoMessage = styled.div`
  font-family: 'Raleway', san-serif;
  font-size: 12px;
  font-weight: 300;
  line-height: 1.5;
  color: #34495e;
`;

function NotificationItem({ email }: NotidficationItemProps) {
  const [visible, setVisible] = useState(true);
  const [display, setDisplay] = useState(true);

  useLayoutEffect(() => {
    setTimeout(() => {
      setVisible(false);
    }, 10 * 1000);
  }, []);

  function onFadeChange(fadeIn: boolean) {
    if (!fadeIn) {
      setDisplay(false);
    }
  }

  return (
    <div key={email} style={{ display: display ? '' : 'none' }}>
      <Fade fadeIn={true} fadeOut={true} show={visible} onFadeChange={onFadeChange}>
        <NotifcationBox>
          <InfoIcon>
            <GoInfo />
          </InfoIcon>
          <InfoMessage>
            New Inquiry from <b>{email}</b>
          </InfoMessage>
        </NotifcationBox>
      </Fade>
    </div>
  );
}

// --------------
// Exported Types
// --------------

export type NotificationsProps = {
  inquiries?: { email?: string }[];
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Notifications({ inquiries }: NotificationsProps) {
  const [notificationCount, setNotificationCount] = useState(3);

  let notifications: any = [];
  if (inquiries) {
    const toShow = inquiries.slice(notificationCount);
    notifications = toShow.map(item => <NotificationItem key={item.email} email={item.email} />);
  }

  return <Container>{notifications}</Container>;
}
