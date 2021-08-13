import { ITopMenuProps } from './TopMenu';
import { FormControlLabel, Radio, RadioGroup } from '@material-ui/core';
import { ReactElement } from 'react';
import React from 'react';

export enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
}

export default function HttpRadioButt(props: { handleMethod: (method: HttpMethod) => void }): ReactElement {
  const [method, setMethod] = React.useState(HttpMethod.GET);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const method = event.target.value as HttpMethod;
    setMethod(method);
    props.handleMethod(method);
  };

  return (
    <RadioGroup aria-label="gender" name="gender1" value={method} onChange={handleChange}>
      <FormControlLabel value={HttpMethod.GET} control={<Radio />} label={HttpMethod.GET.toUpperCase()} />
      <FormControlLabel value={HttpMethod.POST} control={<Radio />} label={HttpMethod.POST.toUpperCase()} />
      <FormControlLabel value={HttpMethod.PUT} control={<Radio />} label={HttpMethod.PUT.toUpperCase()} />
      <FormControlLabel value={HttpMethod.DELETE} control={<Radio />} label={HttpMethod.DELETE.toUpperCase()} />
    </RadioGroup>
  );
}
