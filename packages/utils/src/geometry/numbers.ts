import {DEFAULT_TOLERANCE} from "./constants";

export const isNearZero = (n: number, tol = DEFAULT_TOLERANCE) => Math.abs(n) <= tol;

export const isEqualTo = (n1: number, n2: number, tol = DEFAULT_TOLERANCE) => isNearZero(n1 - n2, tol);

export const isGreaterThan = (n1: number, n2: number, tol = DEFAULT_TOLERANCE) => !isEqualTo(n1, n2, tol) && n1 - n2 > tol && n1 > n2;

export const isLessThan = (n1: number, n2: number, tol = DEFAULT_TOLERANCE) => !isEqualTo(n1, n2, tol) && n1 < n2;

export const approachZero = (n: number, tol = DEFAULT_TOLERANCE) => {
  if (isNearZero(n, tol)) {
    return 0;
  }
  return n;
};

export const isBetween = (n: number, min: number, max: number, eq = true, tol = DEFAULT_TOLERANCE) => {
  if (isEqualTo(min, max, tol)) {
    return isEqualTo(n, min, tol);
  }
  if (min > max) {
    [min, max] = [max, min];
  }
  if (eq && (isEqualTo(n, min, tol) || isEqualTo(n, max, tol))) {
    return true;
  }
  return isGreaterThan(n, min, tol) && isLessThan(n, max, tol);
};

export const isNumber = (n: any) => typeof n === "number" && !isNaN(n);
