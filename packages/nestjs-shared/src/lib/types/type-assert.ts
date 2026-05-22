/**
 * Compile-time type assertions.
 *
 * Use these to encode contracts between layers: declare an `AssertEqual<...>`
 * type alias at the boundary where one layer's type must conform to another's.
 * If the two drift apart, compilation breaks at the declaration site — turning
 * a silent runtime divergence into a build error.
 *
 * @example
 * // In an infra adapter, assert it conforms to the domain vocabulary:
 * export type _SchemaMatchesDomain = Assert<
 *   Equal<(typeof someEnum.enumValues)[number], SomeDomainType>
 * >
 *
 * Compose `Assert` with `Equal` at the call site (with concrete types). A
 * combined `AssertEqual<A, B>` alias can't work: with `A`/`B` still generic,
 * `Equal<A, B>` widens to `boolean` and the `extends true` constraint is
 * checked at the alias definition, not at instantiation.
 */

/** Fails to compile unless `T` is exactly `true`. */
export type Assert<T extends true> = T

/** `true` only when `A` and `B` are mutually assignable (structurally equal). */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
