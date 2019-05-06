// -------------------
// Exported Interfaces
// -------------------

export interface IDataSource {
  isSetup(): Promise<boolean>;
  setup(): Promise<void>;
}

// ----------------
// Exported Classes
// ----------------

export class DataSource implements IDataSource {
  private dataSources?: IDataSource[];
  private setupPromise?: Promise<void[]>;

  protected constructor(dataSources?: IDataSource[]) {
    this.dataSources = dataSources;
  }

  public async isSetup(): Promise<boolean> {
    if (!this.dataSources) {
      return false;
    }

    const results = await Promise.all(this.dataSources.map(dataSource => dataSource.isSetup()));
    return results.indexOf(false) === -1;
  }

  public async setup(): Promise<void> {
    if (this.dataSources) {
      if (!this.setupPromise) {
        this.setupPromise = Promise.all(
          this.dataSources.map(async dataSource => {
            const isSetup = await dataSource.isSetup();
            return isSetup ? Promise.resolve() : dataSource.setup();
          })
        );
      }
      await this.setupPromise;
    }
  }
}
