import { Command, ICommand } from '@5qtrs/cli';
import { BlockIPCommand } from './blockIPCommand';
import { UnblockIPCommand } from './unblockIPCommand';

const commands: ICommand = {
  name: 'Ip',
  cmd: 'ip',
  summary: 'Manage IPs that fusebit blacklist',
  description: 'Update the condfiguration of Fusebit IPSets',
};

export class IPCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await BlockIPCommand.create());
    subCommands.push(await UnblockIPCommand.create());
    commands.subCommands = subCommands;
    return new IPCommand();
  }

  private constructor() {
    super(commands);
  }
}
