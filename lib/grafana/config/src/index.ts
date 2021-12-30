import fs from 'fs';
import path from 'path';
import ini from 'ini';
import yaml from 'js-yaml';

export const getGrafanaConfigTemplate = () => {
  const file = fs.readFileSync(path.join(__dirname, 'grafana.ini'), 'utf-8');
  return ini.decode(file);
};

export const getDockerComposeTemplate = () => {
  const file = fs.readFileSync(path.join(__dirname, 'docker-compose.yml'), 'utf-8');
  return yaml.load(file);
};

export const toYamlFile = (input: any) => {
  return yaml.dump(input);
};

export const toIniFile = (input: any) => {
  return ini.encode(input);
};
