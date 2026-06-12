type MutationErrorResult = { ok: false; error: { message: string } };
type MutationResultLike = { ok: true } | MutationErrorResult;

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

export async function normalizeSrsMutationRejection<
  TResult extends MutationResultLike,
>(
  mutation: Promise<TResult>,
  fallback: string,
): Promise<TResult | MutationErrorResult> {
  return mutation.catch((error: unknown) => ({
    ok: false,
    error: {
      message: mutationErrorMessage(error, fallback),
    },
  }));
}
