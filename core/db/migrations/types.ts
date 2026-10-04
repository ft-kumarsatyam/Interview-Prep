import type { Model } from "mongoose";

export interface MigrationContext {
  /** Every registered Mongoose model, so a migration can reach collections without importing each one. */
  models: Array<Model<object>>;
}

export interface Migration {
  /** `NNN-kebab-name`; runs in id order and exactly once. Never edit or delete one after it has shipped. */
  id: string;
  up(ctx: MigrationContext): Promise<void>;
}
