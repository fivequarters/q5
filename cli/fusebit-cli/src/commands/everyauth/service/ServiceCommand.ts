import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';

import { ServiceSetCommand } from './ServiceSetCommand';
import { ServiceGetCommand } from './ServiceGetCommand';
import { ServiceLsCommand } from './ServiceLsCommand';
import { ServiceUnsupportedCommand } from './ServiceUnsupportedCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Services',
  cmd: 'service',
  summary: 'Manage services',
  description: ['Configure services.', `${EOL}${EOL}A service manages authentication with a third-party system.`].join(
    ' '
  ),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ServiceLsCommand.create());
  subCommands.push(await ServiceSetCommand.create());
  subCommands.push(await ServiceGetCommand.create());
  subCommands.push(
    await ServiceUnsupportedCommand.create(
      {
        name: 'Add a new service',
        cmd: 'add',
        summary: 'Add a new service configuration',
        description: Text.create('Add an additional service to the list of supported services.'),
      },
      [
        {
          name: 'module',
          description: "Type of service to add, e.g. 'slack'.",
          required: false,
        },
      ],
      'add'
    )
  );
  subCommands.push(
    await ServiceUnsupportedCommand.create(
      {
        name: 'Capture service logs',
        cmd: 'log',
        summary: 'Capture logs from a service',
        description: Text.create(
          'Capture diagnostic events and console.log output from a service across many invocations.'
        ),
      },
      [],
      'log'
    )
  );
  subCommands.push(
    await ServiceUnsupportedCommand.create(
      {
        name: 'Remove a service',
        cmd: 'rm',
        summary: 'Remove a service configuration',
        description: Text.create("Remove a service from the system, erasing it's configuration."),
      },
      [],
      'remove'
    )
  );
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ServiceCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ServiceCommand(command);
  }
}
