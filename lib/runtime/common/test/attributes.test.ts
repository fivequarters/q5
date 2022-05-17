import { convertUrlToAttributes } from '../src/attribute';

const empty = {
  connector: '',
  integration: '',
  storage: '',
  identity: '',
  install: '',
  session: '',
};

const v = '/v2';
const v1 = '/v1';
const a = '/account';
const ac = `${a}/acc-1234123412341234`;
const s = '/subscription';
const su = `${s}/sub-1234123412341234`;

const path = `/a/b/c`;
const c = '/connector';
const conn = 'my-connector';
const ctor = `${c}/${conn}`;

const int = '/integration';
const intg = 'my-integration';
const integ = `${int}/${intg}`;

const api = `https://api.fusebit.io`;
const apiVas = `https://api.fusebit.io${v}${ac}${su}`;
const apiV1as = `https://api.fusebit.io${v1}${ac}${su}`;

const idn = 'idn-a234a234a234a234a234a234a234a234';
const ins = 'ins-1b341b341b341b341b341b341b341b34';
const sid = 'sid-12c412c412c412c412c412c412c412c4';

const oConn = { connector: conn };
const oIdn = { identity: idn };
const oIns = { install: ins };
const oSid = { session: sid };

const oInteg = { integration: intg };

describe('Attribute URL Parsing', () => {
  test('Test all the URLs', async () => {
    const tests = [
      { i: 'https://example.com', o: empty },
      { i: 'https://cdn.fusebit.io/a/b/c', o: empty },
      { i: 'https://manage.fusebit.io/a/b/c', o: empty },
      { i: 'https://fivequarters.io/a/b', o: empty },
      { i: `${api}${v}${a}`, o: empty },
      { i: `${api}${v}${a}`, o: empty },
      { i: `${api}${v}${ac}`, o: empty },
      { i: `${api}${v}${ac}${s}`, o: empty },
      { i: `${apiVas}`, o: empty },
      { i: `${apiV1as}/storage`, o: empty },
      { i: `${apiV1as}/storage${path}`, o: { storage: path } },
      { i: `${apiVas}${c}`, o: empty },
      { i: `${apiVas}${ctor}`, o: oConn },
      { i: `${apiVas}${ctor}/`, o: oConn },
      { i: `${apiVas}${ctor}/identity/`, o: oConn },
      { i: `${apiVas}${ctor}/identity/${idn}`, o: { ...oConn, ...oIdn } },
      { i: `${apiVas}${ctor}/session`, o: oConn },
      { i: `${apiVas}${ctor}/session/`, o: oConn },
      { i: `${apiVas}${ctor}/session/${sid}`, o: { ...oConn, ...oSid } },
      { i: `${apiVas}${ctor}/session/${sid}/commit`, o: { ...oConn, ...oSid } },
      { i: `${apiVas}${ctor}/session/${sid}/callback`, o: { ...oConn, ...oSid } },
      { i: `${apiVas}${ctor}/api/${idn}/health`, o: { ...oConn, ...oIdn } },
      { i: `${apiVas}${ctor}/api/${idn}/token`, o: { ...oConn, ...oIdn } },
      { i: `${apiVas}${ctor}/api/session/${sid}/token`, o: { ...oConn, ...oSid } },

      { i: `${apiVas}${int}`, o: empty },
      { i: `${apiVas}${integ}`, o: oInteg },
      { i: `${apiVas}${integ}/`, o: oInteg },
      { i: `${apiVas}${integ}/install`, o: oInteg },
      { i: `${apiVas}${integ}/install/`, o: oInteg },
      { i: `${apiVas}${integ}/install/${ins}`, o: { ...oInteg, ...oIns } },
      { i: `${apiVas}${integ}/session`, o: oInteg },
      { i: `${apiVas}${integ}/session/`, o: oInteg },
      { i: `${apiVas}${integ}/session/${sid}`, o: { ...oInteg, ...oSid } },
      { i: `${apiVas}${integ}/session/${sid}`, o: { ...oInteg, ...oSid } },
      { i: `${apiVas}${integ}/session/${sid}/commit`, o: { ...oInteg, ...oSid } },
      { i: `${apiVas}${integ}/session/${sid}/callback`, o: { ...oInteg, ...oSid } },
    ];

    tests.forEach((test) => {
      expect(convertUrlToAttributes(test.i, { ...empty })).toEqual({ ...empty, ...test.o });
    });
  });

  test('Test merging attributes eliminates duplicates', async () => {
    const o = convertUrlToAttributes(`${apiVas}${integ}`);
    convertUrlToAttributes(`${apiVas}${integ}`, o);
    expect(o).toEqual({ ...empty, ...oInteg });
  });

  test('Test merging attributes adds new entries', async () => {
    const o = convertUrlToAttributes(`${apiVas}${integ}`);
    convertUrlToAttributes(`${apiVas}${ctor}`, o);
    expect(o).toEqual({ ...empty, ...oInteg, ...oConn });

    convertUrlToAttributes(`${apiVas}${integ}2`, o);
    expect(o).toEqual({ ...empty, integration: [intg, `${intg}2`].join(','), ...oConn });
  });
});
