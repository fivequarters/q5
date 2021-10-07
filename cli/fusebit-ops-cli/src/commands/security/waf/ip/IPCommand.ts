import { Command, ICommand } from '@5qtrs/cli';
import { BlockIPCommand } from './blockIPCommand';

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
    commands.subCommands = subCommands;
    return new IPCommand();
  }

  private constructor() {
    super(commands);
  }
}
