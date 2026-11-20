/** A dictionary shape with every string literal widened to `string` (de.ts must match en.ts's shape, not its text). */
export type Widen<T> = { [K in keyof T]: T[K] extends string ? string : T[K] extends readonly (infer U)[] ? Widen<U>[] : Widen<T[K]> };
