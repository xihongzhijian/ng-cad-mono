import {pinyin} from "pinyin-pro";
import {ObjectOf} from "./types";

type ToneType = NonNullable<Parameters<typeof pinyin>[1]>["toneType"];

export const getPinyin = pinyin;

export const getPinyinCompact = (str: string, toneType: ToneType = "none") => {
  return pinyin(str, {type: "array", toneType}).join("");
};

export const queryString = (needle: string, haystack: string) => {
  if (!needle) {
    return true;
  }
  const needleLower = needle.toLowerCase();
  const haystackLower = haystack.toLowerCase();
  const haystackPinyin = getPinyinCompact(haystackLower);
  const isIncluded = (haystack2: string) => {
    if (haystack2.includes(needleLower)) {
      return true;
    }
    let j = -1;
    for (const char of needleLower) {
      const index = haystack2.indexOf(char, j);
      if (index < 0) {
        return false;
      }
      j = index + 1;
    }
    return true;
  };
  return isIncluded(haystackLower) || isIncluded(haystackPinyin);
};
(window as any).q = queryString;

export const queryStringList = (needle: string, haystacks: string[]) => {
  return haystacks.some((haystack) => queryString(needle, haystack));
};

export const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const sortArrayByLevenshtein = <T>(array: T[], valuesGetter: (item: T) => string[], needle: string, toneType: ToneType = "none") => {
  const cache: ObjectOf<number> = {};
  const getLevenshtein = (option: T) => {
    const values = valuesGetter(option);
    for (const val of values.slice()) {
      values.push(getPinyinCompact(val, toneType));
    }
    let dMin = Infinity;
    for (const v of values) {
      let d: number;
      if (v in cache) {
        d = cache[v];
      } else {
        d = levenshtein(v, needle);
        cache[v] = d;
      }
      dMin = Math.min(dMin, d);
    }
    return dMin;
  };
  return array.sort((a, b) => {
    const d1 = getLevenshtein(a);
    const d2 = getLevenshtein(b);
    return d1 - d2;
  });
};
