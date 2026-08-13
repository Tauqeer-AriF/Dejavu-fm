import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface StatementShim {
  all(...params: any[]): any[];
  get(...params: any[]): any | undefined;
  run(...params: any[]): RunResult;
  iterate(...params: any[]): IterableIterator<any>;
}

export default class Database {
  private db: DatabaseSync;
  public open: boolean = true;
  private inTransaction: boolean = false;

  constructor(pathStr: string, options?: { readonly?: boolean; fileMustExist?: boolean }) {
    const nodeOptions: any = {};
    if (options) {
      if (options.readonly !== undefined) {
        nodeOptions.readOnly = options.readonly;
      }
    }
    this.db = new DatabaseSync(pathStr, nodeOptions);
    this.open = true;
  }

  close(): void {
    if (this.open) {
      this.db.close();
      this.open = false;
    }
  }

  async backup(destinationPath: string): Promise<void> {
    const dir = path.dirname(destinationPath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(destinationPath)) {
      try {
        fs.unlinkSync(destinationPath);
      } catch (e) {
        // ignore
      }
    }
    const escapedPath = destinationPath.replace(/'/g, "''");
    this.db.exec(`VACUUM INTO '${escapedPath}'`);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): StatementShim {
    const stmt = this.db.prepare(sql);
    return {
      all: (...params: any[]) => {
        return stmt.all(...params);
      },
      get: (...params: any[]) => {
        return stmt.get(...params);
      },
      run: (...params: any[]) => {
        const result = stmt.run(...params);
        return {
          changes: Number(result.changes),
          lastInsertRowid: result.lastInsertRowid
        };
      },
      iterate: (...params: any[]) => {
        return stmt.iterate(...params);
      }
    };
  }

  pragma(pragmaSql: string, options?: { simple?: boolean }): any {
    const sql = `PRAGMA ${pragmaSql};`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all();
    if (options?.simple) {
      if (rows && rows.length > 0) {
        const firstRow = rows[0] as any;
        const keys = Object.keys(firstRow);
        return firstRow[keys[0]];
      }
      return undefined;
    }
    return rows;
  }

  transaction<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
    const self = this;
    return function (this: any, ...args: Parameters<T>): ReturnType<T> {
      if (self.inTransaction) {
        return fn.apply(this, args);
      }
      self.inTransaction = true;
      self.db.exec('BEGIN TRANSACTION;');
      try {
        const result = fn.apply(this, args);
        self.db.exec('COMMIT;');
        return result;
      } catch (err) {
        try {
          self.db.exec('ROLLBACK;');
        } catch (rollbackErr) {
          console.error('[DB Shim] Rollback failed:', rollbackErr);
        }
        throw err;
      } finally {
        self.inTransaction = false;
      }
    };
  }
}
