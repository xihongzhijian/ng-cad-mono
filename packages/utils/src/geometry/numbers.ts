export const DEFAULT_TOLERANCE = 0.001;

export const isNearZero = (n: number, tolerance = DEFAULT_TOLERANCE) => Math.abs(n) <= tolerance;

export const isEqualTo = (n1: number, n2: number, tolerance = DEFAULT_TOLERANCE) => isNearZero(n1 - n2, tolerance);

export const isGreaterThan = (n1: number, n2: number, tolerance = DEFAULT_TOLERANCE) =>
  !isEqualTo(n1, n2, tolerance) && n1 - n2 > tolerance && n1 > n2;

export const isLessThan = (n1: number, n2: number, tolerance = DEFAULT_TOLERANCE) => !isEqualTo(n1, n2, tolerance) && n1 < n2;

export const approachZero = (n: number) => {
  if (isNearZero(n)) {
    return 0;
  }
  return n;
};

export const isBetween = (n: number, min: number, max: number, eq = true, tolerance = DEFAULT_TOLERANCE) => {
  if (eq && (isEqualTo(n, min, tolerance) || isEqualTo(n, max, tolerance))) {
    return true;
  }
  return isGreaterThan(n, min, tolerance) && isLessThan(n, max, tolerance);
};

export const isNumber = (n: any) => typeof n === "number" && !isNaN(n);
