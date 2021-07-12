import { IIntegrationSpecification } from './IntegrationSpecification';
import { EntityServer } from './EntityServer';
import { BaseServer } from './Server';

import { BaseEditorContext } from './EditorContext';

export class IntegrationEditorContext extends BaseEditorContext<IIntegrationSpecification> {
  /**
   * Creates an _IntegrationEditorContext_ given the optional integrationspecification. If you do not provide
   * a function specification, the default is a boilerplate "hello, world" function.
   * @param specification
   * @ignore Not relevant for MVP
   */
  constructor(server: EntityServer, specification: IIntegrationSpecification) {
    super(server as BaseServer<IIntegrationSpecification>, 'integration', specification.id, specification);

    if (!this.specification.data.files) {
      throw new Error('The specification.data.files must be provided.');
    }

    this.selectFile('./integration.js');
  }

  public addFileToSpecification(fileName: string, content: string, overwrite: boolean): void {
    if (!overwrite && this.specification.data.files[fileName]) {
      throw new Error(`File ${fileName} cannot be added because it already exists.`);
    }
    this.specification.data.files[fileName] = content;
  }

  public fileExistsInSpecification(fileName: string): boolean {
    return !!(this.specification.data && this.specification.data.files[fileName]);
  }

  public deleteFileFromSpecification(fileName: string): void {
    if (!this.specification.data || !this.specification.data.files[fileName]) {
      throw new Error(`File ${fileName} does not exist.`);
    }
    delete this.specification.data.files[fileName];
  }

  public getFileFromSpecification(fileName: string): string | object {
    return this.specification.data.files[fileName];
  }

  public getFiles(): { [fileName: string]: string | object } {
    return this.specification.data.files;
  }

  public setRunnerContent(content: string) {}
  public setSettingsCompute(settings: string) {}
  public setSettingsConfiguration(settings: string) {
    this.specification.data = { ...JSON.parse(settings), files: this.specification.data.files };
    this.setDirtyState(true);
  }
  public setSettingsSchedule(settings: string) {}
  public getRunnerContent() {
    return '';
  }
  public getComputeSettings(): string {
    return '';
  }
  public getConfigurationSettings(): string {
    const { files, ...rest } = this.specification.data;
    return JSON.stringify({ ...rest }, null, 2);
  }
  public getConfiguration(): { [index: string]: string | number } {
    return {};
  }
  public getScheduleSettings(): string {
    return '';
  }
}
