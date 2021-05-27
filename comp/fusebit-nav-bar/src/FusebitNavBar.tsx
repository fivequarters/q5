import React, { useState, useLayoutEffect } from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { Drawer } from '@5qtrs/drawer';
import { NavBar } from '@5qtrs/nav-bar';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { OpenNavIcon, CloseNavIcon } from '@5qtrs/fusebit-icon';
import { FusebitSocialButton, FusebitSocialType } from '@5qtrs/fusebit-social';
import { FusebitLogoLink, FusebitNavLink, FusebitNavLinkType } from '@5qtrs/fusebit-nav-link';
import { MobileOpenNavBackgroundDetail } from './MobileOpenNavBackgroundDetail';

// --------------
// Exported Types
// --------------

export type FusebitNavBarProps = {
  onLetsTalkClicked?: () => void;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitNavBar({ minWidth, maxWidth, onLetsTalkClicked, ...rest }: FusebitNavBarProps) {
  const [mobileNavOpen, setmobileNavOpen] = useState(false);
  const [mobileLightColor, setMobileLightColor] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sticky, setSticky] = useState(false);

  function onMobileNavChange() {
    setmobileNavOpen(!mobileNavOpen);
  }
  function onMobileNavClose() {
    setmobileNavOpen(false);
  }

  function onStickyChange(isSticky: boolean) {
    setSticky(isSticky);
  }

  function onLetsTalkClickedWrapped() {
    if (mobileNavOpen) {
      setmobileNavOpen(false);
    }
    if (onLetsTalkClicked) {
      onLetsTalkClicked();
    }
  }

  useLayoutEffect(() => {
    let timeout: NodeJS.Timeout;
    if (mobileNavOpen !== mobileLightColor) {
      if (!mobileLightColor) {
        setMobileLightColor(!mobileLightColor);
      } else {
        timeout = setTimeout(() => setMobileLightColor(!mobileLightColor), 700);
      }
    }
    if (mobileNavOpen !== drawerOpen) {
      if (drawerOpen) {
        setDrawerOpen(!drawerOpen);
      } else {
        timeout = setTimeout(() => setDrawerOpen(!drawerOpen), 500);
      }
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [mobileNavOpen]);

  function mobileVersion() {
    return (
      <>
        <Box middle expand width="100%" gap={10}>
          <MobileOpenNavBackgroundDetail
            margin={-20}
            style={{
              opacity: mobileNavOpen ? 1 : 0,
              transition: `opacity 0.5s ease ${mobileNavOpen ? '0.5s' : '0s'}`,
            }}
          />
          <FusebitLogoLink
            marginLeft={10}
            markColor={mobileLightColor ? FusebitColor.white : undefined}
            onClick={onMobileNavClose}
          />
          <Box expand />
          <FusebitButton padding={10} color={'unset' as FusebitColor} onClick={onMobileNavChange}>
            {mobileLightColor ? (
              <CloseNavIcon size={26} background="unset" color={mobileLightColor ? FusebitColor.white : undefined} />
            ) : (
              <OpenNavIcon size={26} background="unset" color={mobileLightColor ? FusebitColor.white : undefined} />
            )}
          </FusebitButton>
        </Box>
        <Drawer width="100%" background={FusebitColor.black} height={420} open={drawerOpen} vertical rate={20}>
          <Box vertical width="100%" marginTop={20} gap={20}>
            <FusebitNavLink
              marginBottom={20}
              linkType={FusebitNavLinkType.jobs}
              color={FusebitColor.white}
              onClick={onMobileNavChange}
            />
            <FusebitNavLink
              marginBottom={20}
              linkType={FusebitNavLinkType.about}
              color={FusebitColor.white}
              onClick={onMobileNavChange}
            />
            <Box marginBottom={20} stretch>
              <FusebitButton
                expand
                onClick={onLetsTalkClickedWrapped}
                gaCategory="CTA"
                gaAction="Clicked main button"
                gaLabel={location.pathname}
              >
                Join waitlist
              </FusebitButton>
              <FusebitSocialButton marginLeft={20} type={FusebitSocialType.twitter} invertColor />
            </Box>

            <Box stretch height={1} background={opacity(FusebitColor.lightBlue, 0.3)} />
            <FusebitNavLink linkType={FusebitNavLinkType.copyRight} onClick={onMobileNavChange} />
            <Box stretch>
              <FusebitNavLink linkType={FusebitNavLinkType.privacy} onClick={onMobileNavChange} />
              <FusebitNavLink marginLeft={20} linkType={FusebitNavLinkType.terms} onClick={onMobileNavChange} />
            </Box>
          </Box>
        </Drawer>
      </>
    );
  }

  function NonMobileVersion() {
    return (
      <Box right middle width="100%" padding={20} maxWidth={maxWidth || 1200}>
        <FusebitLogoLink />
        <Box expand />
        <FusebitNavLink marginLeft={30} linkType={FusebitNavLinkType.jobs} />
        <FusebitNavLink marginLeft={30} linkType={FusebitNavLinkType.about} />
        <FusebitButton
          marginLeft={30}
          onClick={onLetsTalkClickedWrapped}
          gaCategory="CTA"
          gaAction="Clicked main button"
          gaLabel={location.pathname}
        >
          Join waitlist
        </FusebitButton>
      </Box>
    );
  }

  return (
    <NavBar
      vertical
      center
      sticky
      width="100%"
      background={mobileNavOpen ? FusebitColor.black : sticky ? FusebitColor.white : undefined}
      onStickyChange={onStickyChange}
      noBorder={!sticky || mobileNavOpen}
      style={{
        transition: `background-color 0.5s ease ${mobileNavOpen || !mobileLightColor ? '0s' : '0.5s'}`,
      }}
      {...rest}
    >
      <MediaQuery mediaType={MediaType.mobile}>{mobileVersion()}</MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion />
      </MediaQuery>
    </NavBar>
  );
}
