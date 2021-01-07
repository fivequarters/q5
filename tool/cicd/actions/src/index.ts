import * as fs from 'fs';
import * as yaml from 'js-yaml';

const OUTPUT_DIR = '../../../.github/workflows';
const INPUT_DIR = './yaml';
const BASE_YML = 'base';

const BANNER = [
  '###################################################################',
  '# Auto-created by the cicd-actions tool',
  '',
].join('\n');

const specs = [
  { name: 'Checkout the project', inputs: ['checkout'], output: 'checkout' },
  { name: 'Full build', inputs: ['checkout', 'setup_env', 'full_build'], output: 'full_build' },
  { name: 'Deploy and Test', inputs: ['checkout', 'setup_env', 'full_build', 'deploy_test'], output: 'build_test' },
  { name: 'Publish All Artifacts', inputs: ['checkout', 'setup_env', 'full_build', 'publish'], output: 'publish' },
];

function buildSpec(name: string, inputs: string[], output: string, options: any = {}) {
  const base = yaml.load(fs.readFileSync(`${INPUT_DIR}/${BASE_YML}.yml`, 'utf8')) as any;

  base.name = name;
  if (options.on_trigger) {
    base.on = options.on_trigger;
  }

  inputs.forEach((f) => {
    const entry = yaml.load(fs.readFileSync(`${INPUT_DIR}/${f}.yml`, 'utf8')) as any;
    base.jobs.deploy.steps = base.jobs.deploy.steps.concat(entry.steps);
  });

  fs.writeFileSync(`${OUTPUT_DIR}/${output}.yml`, BANNER + yaml.dump(base, { noCompatMode: true }));
}

specs.forEach((spec) => buildSpec(spec.name, spec.inputs, spec.output));
