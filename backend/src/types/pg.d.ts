declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<any>;
    query(queryTextOrConfig: any, values?: any[]): Promise<any>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  const pg: {
    Pool: typeof Pool;
  };
  export default pg;
}
