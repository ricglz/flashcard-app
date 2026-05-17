export type AppFailure<Tag extends string, Context extends object = Record<never, never>> = Readonly<{
  _tag: Tag;
  message: string;
} & Context>;

export type AppResult<T, Failure extends AppFailure<string, object>> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: Failure };

export type CommonFailure =
  | AppFailure<"Unauthenticated">
  | AppFailure<"Forbidden">
  | AppFailure<"NotFound">
  | AppFailure<"Conflict">
  | AppFailure<"InvalidInput", { field?: string }>;

export function ok<T>(value: T): AppResult<T, never> {
  return { ok: true, value };
}

export function fail<Failure extends AppFailure<string, object>>(
  error: Failure
): AppResult<never, Failure> {
  return { ok: false, error };
}

export const unauthenticated = (): CommonFailure => ({
  _tag: "Unauthenticated",
  message: "Please sign in to continue.",
});

export const forbidden = (message = "You do not have access to this item."): CommonFailure => ({
  _tag: "Forbidden",
  message,
});

export const notFound = (message = "That item was not found."): CommonFailure => ({
  _tag: "NotFound",
  message,
});

export const conflict = (message: string): CommonFailure => ({
  _tag: "Conflict",
  message,
});

export const invalidInput = (message: string, field?: string): CommonFailure => ({
  _tag: "InvalidInput",
  message,
  ...(field !== undefined ? { field } : {}),
});

export function getFailureMessage(error: { message: string }): string {
  return error.message;
}

export async function unwrapAppResult<T>(
  resultPromise: Promise<AppResult<T, AppFailure<string, object>>>
): Promise<T> {
  const result = await resultPromise;
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
