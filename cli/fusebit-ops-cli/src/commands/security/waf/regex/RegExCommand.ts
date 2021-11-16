import { Command, ICommand } from '@5qtrs/cli';
import { BlockRegExCommand } from './BlockRegExCommand';
import { ListRegExCommand } from './ListRegExCommand';
import { UnblockRegExCommand } from './UnblockRegExCommand';

const commands: ICommand = {
  name: 'RegEx',
  cmd: 'regex',
  summary: 'Manage RegEx based filters that fusebit blacklist',
  description: 'Update the condfiguration of Fusebit WAF to filter RegEx based paths.',
};

export class RegExCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await BlockRegExCommand.create());
    subCommands.push(await UnblockRegExCommand.create());
    subCommands.push(await ListRegExCommand.create());
    commands.subCommands = subCommands;
    return new RegExCommand();
  }

  private constructor() {
    super(commands);
  }
}
