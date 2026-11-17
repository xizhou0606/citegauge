export class Database {
  readonly binding: D1Database;

  constructor(binding: D1Database) {
    this.binding = binding;
  }

  statement(sql: string, args: unknown[] = []) {
    const values = args.map((value) => {
      if (value instanceof Uint8Array) return value;
      if (typeof value === "boolean") return Number(value);
      if (value !== null && typeof value === "object") return JSON.stringify(value);
      return value;
    });
    return this.binding.prepare(sql).bind(...values);
  }

  async query(sql: string, args: unknown[] = []) {
    const result = await this.statement(sql, args).all<Record<string, any>>();
    for (const row of result.results) {
      if (typeof row.detail === "string") row.detail = JSON.parse(row.detail);
      if (typeof row.config === "string") row.config = JSON.parse(row.config);
    }
    return { rows: result.results, rowCount: result.meta.changes };
  }
}
