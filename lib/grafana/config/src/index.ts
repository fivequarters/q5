import fs from 'fs';
import path from 'path';
import ini from 'ini';

export const getConfigTemplate = () => {
  const file = fs.readFileSync(path.join(__dirname, 'grafana.ini'), 'utf-8');
  return ini.decode(file);
};

export const toIniFile = (input: any) => {
  return ini.encode(input);
};
