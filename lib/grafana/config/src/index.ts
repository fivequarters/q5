import fs from 'fs';
import path from 'path';
import ini from 'ini';
import yaml from 'js-yaml';

export const getGrafanaConfigTemplate = () => {
  const file = fs.readFileSync(path.join(__dirname, 'config', 'grafana.ini'), 'utf-8');
  return ini.decode(file);
};

export const getDockerComposeTemplate = (stackId: string) => {
  let file = fs.readFileSync(path.join(__dirname, 'config', 'docker-compose.yml'), 'utf-8');
  file = file.replace(/##STACKID##/g, stackId);
  return yaml.load(file);
};

export const toYamlFile = (input: any) => {
  return yaml.dump(input);
};

export const toIniFile = (input: any) => {
  return ini.encode(input);
};

export const getRegistrationScript = () => {
  return fs.readFileSync(path.join(__dirname, 'config', 'ensureService.js'), 'utf-8');
};

export const getTempoConfigTemplate = () => {
  const file = fs.readFileSync(path.join(__dirname, 'config', 'tempo.yml'), 'utf-8');
  return yaml.load(file);
};

export const getLokiConfigTemplate = () => {
  const file = fs.readFileSync(path.join(__dirname, 'config', 'loki.yml'), 'utf-8');
  return yaml.load(file);
};
