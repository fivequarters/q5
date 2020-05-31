import MenuItem from '@material-ui/core/MenuItem';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import React from 'react';
import InputWithIcon from './InputWithIcon';
import { modifyIssuer, useIssuer } from './IssuerProvider';
import { TextField } from '@material-ui/core';

function PublicKeyAcquisitionSelector({ variant }: any) {
  const [issuer, setIssuer] = useIssuer();

  const handlePublicKeyAcquisitionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (issuer.status === 'ready') {
      issuer.modified.publicKeyAcquisition = event.target.value === 'pki' ? 'pki' : 'jwks';
      modifyIssuer(issuer, setIssuer, { ...issuer.modified });
    }
  };

  if (issuer.status === 'ready' || issuer.status === 'updating') {
    return (
      <InputWithIcon icon={<VpnKeyIcon />}>
        <TextField
          id="publicKeyAcquisition"
          select
          fullWidth
          label="Public Key Acquisition"
          value={issuer.modified.publicKeyAcquisition}
          onChange={handlePublicKeyAcquisitionChange}
          disabled={issuer.status === 'updating'}
          variant={variant || 'outlined'}
        >
          <MenuItem value={'pki'}>Stored Public Key</MenuItem>
          <MenuItem value={'jwks'}>JWKS Endpoint</MenuItem>
        </TextField>
      </InputWithIcon>
    );
  }
  return null;
}

export default PublicKeyAcquisitionSelector;
