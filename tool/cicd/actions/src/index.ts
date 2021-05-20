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

const publishAll = ['publish_function_api', 'publish_fusebit_cli', 'publish_fusebit_editor', 'publish_fusebit_ops_cli'];
const fullBuild = ['setup_env', 'full_build'];

const specs = [
  { name: 'Checkout the project', inputs: ['checkout'], output: 'checkout' },
  { name: 'Full build', inputs: ['checkout', ...fullBuild], output: 'full_build' },
  {
    name: 'Deploy to us-west-2/stage and Test',
    inputs: ['checkout', ...fullBuild, 'publish_function_api', 'deploy_test'],
    output: 'build_test',
  },
  {
    name: 'Publish All Artifacts',
    inputs: ['checkout', ...fullBuild, ...publishAll],
    output: 'publish',
  },
  {
    name: 'Publish fuse-ops cli',
    inputs: ['checkout', ...fullBuild, 'publish_fusebit_ops_cli'],
    output: 'publish_fuse-ops_cli',
  },
  {
    name: 'Publish fuse cli',
    inputs: ['checkout', ...fullBuild, 'publish_fusebit_cli'],
    output: 'publish_fuse_cli',
  },
  {
    name: 'Publish the Website',
    inputs: ['checkout', ...fullBuild, 'publish_website'],
    output: 'publish_website',
  },
  {
    name: 'Publish Fusetunnel',
    inputs: ['checkout', 'setup_env', 'publish_fusetunnel', 'publish_fusetunnel-server'],
    output: 'publish_fusetunnel',
  }
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
