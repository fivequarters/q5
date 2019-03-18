import { Command } from '@5qtrs/cli';

export class VersionCommand extends Command {

  public static async create() {
    return new VersionCommand();
  }
  private constructor() {
    super({
      name: 'Version',
      cmd: 'version',
      summary: 'Returns the version of the flx CLI',
      description: 'Returns the current version of the flx CLI.',
      options: [],
      arguments: [],
      modes: ['init'],
    });
  }
}
