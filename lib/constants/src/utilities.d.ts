declare const expBackoff: (c: number, delay?: number) => Promise<void>;
declare function dynamoScanTable(dynamo: any, params: any, map?: any): Promise<any[]>;
declare function asyncPool<T>(poolLimit: number, array: T[], iteratorFn: (item: T, array: T[]) => any): Promise<any>;
declare function duplicate(dst: any, src: any): any;
export { dynamoScanTable, expBackoff, asyncPool, duplicate };
//# sourceMappingURL=utilities.d.ts.map