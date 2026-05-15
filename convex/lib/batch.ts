import type { MutationCtx } from "../_generated/server";
import type { Id, TableNames } from "../_generated/dataModel";

export const DELETION_BATCH_SIZE = 500;

export async function deleteAllMatching<T extends { _id: Id<TableNames> }>(
  ctx: MutationCtx,
  getItems: () => Promise<T[]>,
  beforeDelete?: (ctx: MutationCtx, item: T) => Promise<void>,
) {
  let batch = await getItems();
  while (batch.length > 0) {
    for (const item of batch) {
      if (beforeDelete) await beforeDelete(ctx, item);
      await ctx.db.delete(item._id);
    }
    batch = await getItems();
  }
}
