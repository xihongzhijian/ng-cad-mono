export type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};

export type XOR<T, U> = T | U extends ObjectOf<any> ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type ObjectOf<T> = Record<string, T>;

export type ValueOf<T> = T[keyof T];

export type Constructor<T = object> = new (...args: any[]) => T;

export const keysOf = <T extends ObjectOf<any>>(obj: T) => Object.keys(obj) as (keyof T)[];

export type RequiredPick<T, K extends keyof T> = {
  [P in K]-?: T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & RequiredPick<T, K>;

export type MaybePromise<T> = T | Promise<T>;
