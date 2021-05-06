import * as fs from 'fs';

const formTemplate = fs.readFileSync(__dirname + '/form/form.html', { encoding: 'utf8' });

interface IFormSpecification {
  schema: any;
  uiSchema: any;
  data: any;
  state: any;
  submitUrl: string;
  cancelUrl: string;
  template?: string;
}

const Form = (spec: IFormSpecification) => {
  const form = (spec.template || formTemplate)
    .replace('##schema##', JSON.stringify(spec.schema))
    .replace('##uischema##', JSON.stringify(spec.uiSchema))
    .replace('##data##', JSON.stringify(spec.data))
    .replace('##state##', JSON.stringify(spec.state))
    .replace('##submit_url##', `"${spec.submitUrl}"`)
    .replace('##cancel_url##', `"${spec.cancelUrl}"`);

  return [form, 'text/html; charset=UTF-8'];
};

export { Form };
