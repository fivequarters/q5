import { Command, ICommand } from '@5qtrs/cli';
import { BlockIPCommand } from './BlockIPCommand';
import { ListIPCommand } from './ListIPCommand';
import { UnblockIPCommand } from './UnblockIPCommand';

const commands: ICommand = {
  name: 'Ip',
  cmd: 'ip',
  summary: 'Manage IPs that are blocked from accessing this deployment.',
  description: 'Update the configuration of Fusebit IPSets.',
};

export class IPCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await BlockIPCommand.create());
    subCommands.push(await UnblockIPCommand.create());
    subCommands.push(await ListIPCommand.create());
    commands.subCommands = subCommands;
    return new IPCommand();
  }

  private constructor() {
    super(commands);
  }
}
