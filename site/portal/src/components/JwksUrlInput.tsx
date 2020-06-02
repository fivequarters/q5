import TextField from '@material-ui/core/TextField';
import React from 'react';
import InputWithIcon from './InputWithIcon';
import { modifyIssuer, useIssuer } from './IssuerProvider';
import LinkIcon from '@material-ui/icons/Link';

function JwksUrlInput({ variant }: any) {
  const [issuer, setIssuer] = useIssuer();

  const handleJsonKeyUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (issuer.status === 'ready') {
      issuer.modified.jsonKeysUrl = event.target.value;
      modifyIssuer(issuer, setIssuer, { ...issuer.modified });
    }
  };

  if (issuer.status === 'ready' || issuer.status === 'updating') {
    return (
      <InputWithIcon icon={<LinkIcon />}>
        <TextField
          id="jsonKeysUrl"
          label="JWKS URL"
          helperText={issuer.modified.jsonKeysUrlError || 'The JWKS endpoint must be a secure https:// URL'}
          variant={variant || 'outlined'}
          value={issuer.modified.jsonKeysUrl || ''}
          onChange={handleJsonKeyUrlChange}
          error={!!issuer.modified.jsonKeysUrlError}
          fullWidth
          disabled={issuer.status === 'updating'}
        />
      </InputWithIcon>
    );
  }
  return null;
}

export default JwksUrlInput;
