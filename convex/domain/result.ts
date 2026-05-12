export type DomainFailure<
  Tag extends string,
  Context extends object = Record<never, never>,
> = Readonly<
  {
    _tag: Tag;
    message: string;
  } & Context
>;

export type AnyDomainFailure = DomainFailure<string, object>;

export type DomainResult<T, Failure extends AnyDomainFailure> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: Failure };

export type CommonFailure =
  | DomainFailure<"Unauthenticated">
  | DomainFailure<"Forbidden">
  | DomainFailure<"NotFound">
  | DomainFailure<"Conflict">
  | DomainFailure<"InvalidInput", { field?: string }>;

export function ok<T>(value: T): DomainResult<T, never> {
  return { ok: true, value };
}

export function fail<Failure extends AnyDomainFailure>(
  error: Failure
): DomainResult<never, Failure> {
  return { ok: false, error };
}

export const unauthenticated = (): CommonFailure => ({
  _tag: "Unauthenticated",
  message: "Please sign in to continue.",
});

export const forbidden = (
  message = "You do not have access to this item."
): CommonFailure => ({
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

export function assertDomainResult<T, Failure extends AnyDomainFailure>(
  result: DomainResult<T, Failure>
): asserts result is { readonly ok: true; readonly value: T } {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
}
