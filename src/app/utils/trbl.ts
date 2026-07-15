export type Trbl = [number, number, number, number];
export type TrblLike = Trbl | [number, number, number] | [number, number] | [number] | number | number[];
export const getTrbl = (value: TrblLike | string | undefined | null, defaultNum = 0): Trbl => {
  if (typeof value === "number") {
    return [value, value, value, value];
  }
  const defaultTrbl: Trbl = [defaultNum, defaultNum, defaultNum, defaultNum];
  if (value === undefined || value === null) {
    return defaultTrbl;
  }
  if (typeof value === "string") {
    if (!value.includes("+")) {
      if (value === "") {
        return defaultTrbl;
      }
      const num = Number(value.replace("mm", "").trim());
      return isNaN(num) ? defaultTrbl : [num, num, num, num];
    }
    const arr = value.split("+").map((v) => v.replace("mm", "").trim());
    const result = defaultTrbl.slice() as Trbl;
    let isPosFound = false;
    for (const trblItem of trblItems) {
      for (const trblStr of arr) {
        if (trblStr.includes(trblItem.name)) {
          const pos2 = trblStr.replace(trblItem.name, "");
          const num = Number(pos2);
          if (!isNaN(num)) {
            result[trblItem.index] = num;
            isPosFound = true;
          }
        }
      }
    }
    if (isPosFound) {
      return result;
    }
    value = arr.map((v) => Number(v)).filter((v) => !isNaN(v));
  }
  switch (value.length) {
    case 0:
      return defaultTrbl;
    case 1:
      return [value[0], value[0], value[0], value[0]];
    case 2:
      return [value[0], value[1], value[0], value[1]];
    case 3:
      return [value[0], value[1], value[2], value[1]];
    case 4:
      return value as Trbl;
    default:
      return value.slice(0, 4) as Trbl;
  }
};

export const trblItems = [
  {name: "上", index: 0},
  {name: "下", index: 2},
  {name: "左", index: 3},
  {name: "右", index: 1}
];
