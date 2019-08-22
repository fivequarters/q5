import React, { useState } from 'react';
import { request } from '@5qtrs/request';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitButton, FusebitButtonProps } from '@5qtrs/fusebit-button';
import { FusebitTextField, FusebitTextArea, FusebitTextFieldProps } from '@5qtrs/fusebit-input';

// ------------------
// Internal Constants
// ------------------

const googleSheetUrl =
  'https://script.google.com/macros/s/AKfycbwvCP7_RW163ccBtVR5T6WRwkCHPE-3NO-D7-lyoG5Ce1DB9lc/exec';
const nameDefault = 'Your Name';
const companyDefault = 'Your Company';
const titleDefault = 'Your Title';
const messageDefault = 'A Message';
const buttonTextDefault = 'Send';
const gaCategoryDefault = 'CTA';
const gaActionDefault = 'About You';
const gaLabelDefault = 'Solution';

// --------------
// Exported Types
// --------------

export type FusebitAboutYouForm = {
  name?: string;
  company?: string;
  title?: string;
  message?: string;
};

export type FusebitAboutYouProps = {
  email: string;
  rows?: number;
  onFormSubmit?: (form: FusebitAboutYouForm) => void;
} & FusebitTextFieldProps &
  FusebitButtonProps;

// -------------------
// Internal Components
// -------------------

export function AboutYou({
  email,
  width,
  size,
  rows,
  onFormSubmit,
  gaCategory,
  gaAction,
  gaLabel,
  onClick,
  isMobile,
  ...rest
}: FusebitAboutYouProps & { isMobile?: boolean }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState(false);

  const nameInvalid = name.trim() === '';
  const companyInvalid = company.trim() === '';
  const titleInvalid = title.trim() === '';
  const atLeastOneInvalid = nameInvalid || companyInvalid || titleInvalid;

  function onFormSubmitWrapped() {
    if (atLeastOneInvalid) {
      setInvalid(true);
    } else {
      request({
        method: 'POST',
        url: `${googleSheetUrl}?Email=${email}&Name=${name}&Company=${company}&Title=${title}&Message=${message}`,
      });
      if (onFormSubmit) {
        onFormSubmit({ name, company, title, message });
      }
    }
  }

  function onClickWrapped(event: any) {
    if (onClick) {
      onClick(event);
      if (event.defaultPrevented) {
        return;
      }
    }
    onFormSubmitWrapped();
  }

  function onNameChange(event: any) {
    setName(event.target.value);
  }

  function onCompanyChange(event: any) {
    setCompany(event.target.value);
  }

  function onTitleChange(event: any) {
    setTitle(event.target.value);
  }

  function onMessageChange(event: any) {
    setMessage(event.target.value);
  }

  size = size || (isMobile ? 30 : 48);
  return (
    <Box vertical width={width || 500} {...rest}>
      <FusebitTextField
        width="100%"
        errorText="Required"
        invalid={invalid && nameInvalid}
        placeholder={nameDefault}
        onChange={onNameChange}
        size={size}
      />
      <Box height={10} />
      <FusebitTextField
        width="100%"
        errorText="Required"
        invalid={invalid && companyInvalid}
        placeholder={companyDefault}
        onChange={onCompanyChange}
        size={size}
      />
      <Box height={10} />
      <FusebitTextField
        width="100%"
        errorText="Required"
        invalid={invalid && titleInvalid}
        placeholder={titleDefault}
        onChange={onTitleChange}
        size={size}
      />
      <Box height={10} />
      <FusebitTextArea
        width="100%"
        placeholder={messageDefault}
        onChange={onMessageChange}
        cols={size}
        rows={rows || (isMobile ? 2 : 5)}
      />
      <Box height={10} />
      <Box width="100%" right>
        <FusebitButton
          width={isMobile ? '100%' : undefined}
          gaCategory={gaCategoryDefault || gaCategory}
          gaAction={gaActionDefault || gaAction}
          gaLabel={gaLabelDefault || gaLabel}
          onClick={onClickWrapped}
        >
          {buttonTextDefault}
        </FusebitButton>
      </Box>
    </Box>
  );
}

// -------------------
// Exported Components
// -------------------

export function FusebitAboutYou(props: FusebitAboutYouProps) {
  return (
    <>
      <MediaQuery mediaType={MediaType.mobile}>
        <AboutYou {...props} isMobile />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <AboutYou {...props} />
      </MediaQuery>
    </>
  );
}
