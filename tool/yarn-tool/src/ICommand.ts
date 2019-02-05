import { Project } from '@5qtrs/workspace';
import { Writable } from 'stream';

export default interface ICommand {
  Name: string;
  Description: string;
  Usage: string;
  Handler: (args: string[], project: Project, output: Writable) => Promise<void>;
}
