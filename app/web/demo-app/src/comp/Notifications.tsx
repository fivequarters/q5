import React, { useState, useEffect, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { GoInfo } from 'react-icons/go';
import { Fade } from '@5qtrs/fade';

// -------------------
// Internal Components
// -------------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: 20px;
  // padding-top: 60px;
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

type NotidficationItemProps = {
  email?: string;
} & React.BaseHTMLAttributes<HTMLDivElement>;

function NotificationItem({ email }: NotidficationItemProps) {
  const [visible, setVisible] = useState(true);
  const [display, setDisplay] = useState(true);

  useLayoutEffect(() => {
    setTimeout(() => {
      setVisible(false);
    }, 10 * 1000);
  }, []);

  return (
    <div key={email} style={{ display: display ? '' : 'none' }}>
      <Fade fadeIn fadeOut visible={visible} onFadeOut={() => setDisplay(false)}>
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
  data?: { email?: string }[];
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function Notifications({ data }: NotificationsProps) {
  const [notificationCount, setNotificationCount] = useState(3);

  let notifications: any = [];
  if (data) {
    const toShow = data.slice(notificationCount);
    notifications = toShow.map(item => <NotificationItem key={item.email} email={item.email} />);
  }

  return <Container>{notifications}</Container>;
}
