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
      await Promise.all(
        this.dataSources.map(async dataSource => {
          const isSetup = await dataSource.isSetup();
          if (!isSetup) {
            dataSource.setup();
          }
        })
      );
    }
  }
}
