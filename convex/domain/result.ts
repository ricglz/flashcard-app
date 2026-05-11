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

export function ok<T>(value: T): DomainResult<T, never> {
  return { ok: true, value };
}

export function fail<Failure extends AnyDomainFailure>(
  error: Failure
): DomainResult<never, Failure> {
  return { ok: false, error };
}

export function assertDomainResult<T, Failure extends AnyDomainFailure>(
  result: DomainResult<T, Failure>
): asserts result is { readonly ok: true; readonly value: T } {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
}
