import React, { useState, useEffect } from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { Drawer } from '@5qtrs/drawer';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitCard } from '@5qtrs/fusebit-card';
import { CloseNavIcon } from '@5qtrs/fusebit-icon';
import { FusebitText, FusebitTextType } from '@5qtrs/fusebit-text';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { Modal, ModalProps } from '@5qtrs/modal';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { FusebitEmail, FusebitAboutYou, FusebitAboutYouForm } from '@5qtrs/fusebit-contact';

// ------------------
// Internal Constants
// ------------------

const contactUsHeading = 'Join waitlist';
const contactUsText1 =
  "We are excited to support your integration needs with the Fusebit platform. We are hard at work on a new self-service product made for developers.";
const contactUsText2 = 'Sign up below and we will get you an early access invite.';
const sendButtonText = 'Get early access';
const aboutYouHeading = 'Your needs';
const aboutYouText = "What issues are you facing with your current integraitons?";

// ------------------
// Internal Functions
// ------------------

function getHeightFromPage(page: FusebitModalPage, isMobile?: boolean) {
  if (isMobile) {
    return page === FusebitModalPage.ContactUs ? 450 : 540;
  }

  return page === FusebitModalPage.ContactUs ? 400 : 610;
}

// --------------
// Internal Types
// --------------

type ExtendedFusebitModalProps = {
  isMobile?: boolean;
} & FusebitModalProps;

// -------------------
// Internal Components
// -------------------

function ContactUsPage({ modalPage, email, onClose, gaCategory, gaAction, gaLabel }: ExtendedFusebitModalProps) {
  const aboutYou = modalPage === FusebitModalPage.ContactUsAboutYou;

  function onTextSubmit(email: string) {
    if (onClose) {
      onClose({ modalPage, email });
    }
  }

  function onFormSubmit({ name, company, title, message }: FusebitAboutYouForm) {
    if (onClose) {
      onClose({ modalPage, email, name, company, title, message });
    }
  }

  function onClick() {
    if (onClose) {
      onClose({ modalPage, email });
    }
  }

  return (
    <Box vertical width="100%">
      <Box width="100%" middle>
        <Box>
          <FusebitText type={FusebitTextType.header3} color={FusebitColor.red}>
            {aboutYou ? aboutYouHeading : contactUsHeading}
          </FusebitText>
        </Box>
        <Box expand />
        <FusebitButton padding={10} color={FusebitColor.white} onClick={onClick}>
          <CloseNavIcon size={26} />
        </FusebitButton>
      </Box>
      <Box height={20} />
      <Box width="100%">
        {aboutYou ? (
          <FusebitText type={FusebitTextType.body}>{aboutYouText}</FusebitText>
        ) : (
          <>
            <FusebitText type={FusebitTextType.body}>{contactUsText1}</FusebitText>
            <Box height={20} />
            <FusebitText type={FusebitTextType.body}>{contactUsText2}</FusebitText>
          </>
        )}
      </Box>
      <Box height={30} />
      {aboutYou ? (
        <FusebitAboutYou
          width="100%"
          email={email || 'unknown'}
          onFormSubmit={onFormSubmit}
          gaCategory={gaCategory}
          gaAction={gaAction}
          gaLabel={gaLabel}
        />
      ) : (
        <FusebitEmail
          width="100%"
          buttonText={sendButtonText}
          onTextSubmit={onTextSubmit}
          gaCategory={gaCategory}
          gaAction={gaAction}
          gaLabel={gaLabel}
        />
      )}
    </Box>
  );
}

function ModalCard({
  width,
  background,
  show,
  modalPage,
  email,
  onClose,
  isMobile,
  ...rest
}: ExtendedFusebitModalProps) {
  const [height, setHeight] = useState(0);
  const [closing, setClosing] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [resolvedPage, setResolvedPage] = useState<FusebitModalPage | undefined>();
  const [resolvedEvent, setResolvedEvent] = useState<FusebitModalFormEvent | undefined>();

  function onOpenChange(isOpen: boolean) {
    if (!isOpen && (!show || closing)) {
      const event = resolvedEvent || { modalPage };
      setClosing(false);
      setResolvedEmail('');
      setResolvedPage(undefined);
      setResolvedEvent(undefined);
      onClose(event);
    }
  }

  function onClosing(event: FusebitModalFormEvent) {
    if (event.modalPage === FusebitModalPage.ContactUs && event.email) {
      setResolvedEmail(event.email || '');
      setResolvedPage(FusebitModalPage.ContactUsAboutYou);
      setHeight(getHeightFromPage(FusebitModalPage.ContactUsAboutYou, isMobile));
    } else {
      setResolvedEvent(event);
      setClosing(true);
    }
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!closing && height === 0 && show) {
      timeout = setTimeout(() => setHeight(getHeightFromPage(modalPage, isMobile)), 20);
    } else if (!show || (closing && height > 0)) {
      setHeight(0);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [show, height, closing]);

  return (
    <Box background="unset" {...rest} margin={isMobile ? 20 : undefined}>
      <Drawer vertical open={show && !closing} height={height} rate={20} width="100%" onOpenChange={onOpenChange}>
        <FusebitCard
          background={background || FusebitColor.white}
          width={isMobile ? 'calc(100vw - 40px)' : width || 500}
          padding={isMobile ? 20 : 30}
          noClick
        >
          <ContactUsPage
            modalPage={resolvedPage || modalPage}
            email={resolvedEmail || email}
            onClose={onClosing}
            isMobile
          />
        </FusebitCard>
      </Drawer>
    </Box>
  );
}

// --------------
// Exported Types
// --------------

export enum FusebitModalPage {
  ContactUs = 0,
  ContactUsAboutYou = 1,
}

export type FusebitModalFormEvent = {
  modalPage: FusebitModalPage;
  email?: string;
} & FusebitAboutYouForm;

export type FusebitModalProps = {
  email?: string;
  modalPage: FusebitModalPage;
  gaCategory?: string;
  gaAction?: string;
  gaLabel?: string;
  onClose: (event: FusebitModalFormEvent) => void;
} & ModalProps &
  BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitModal({ show, background, ...rest }: FusebitModalProps) {
  const [closing, setClosing] = useState(false);

  function onClick() {
    setClosing(true);
  }

  if (!show && closing) {
    setClosing(false);
  }

  return (
    <Modal show={show} background={background || opacity(FusebitColor.black, 0.5)} onClick={onClick}>
      <MediaQuery mediaType={MediaType.mobile}>
        <ModalCard show={show && !closing} {...rest} isMobile />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <ModalCard show={show && !closing} {...rest} />
      </MediaQuery>
    </Modal>
  );
}
