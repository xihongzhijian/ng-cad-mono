export type Trbl = [number, number, number, number];
export type TrblLike = Trbl | [number, number, number] | [number, number] | [number] | number;
export const getTrbl = (value: TrblLike | undefined | null): Trbl => {
  if (typeof value === "number") {
    return [value, value, value, value];
  }
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return [value[0], value[0], value[0], value[0]];
    }
    if (value.length === 2) {
      return [value[0], value[1], value[0], value[1]];
    }
    if (value.length === 3) {
      return [value[0], value[1], value[2], value[1]];
    }
    return value;
  }
  return [0, 0, 0, 0];
};

export const trblItems = [
  {name: "上", index: 0},
  {name: "下", index: 2},
  {name: "左", index: 3},
  {name: "右", index: 1}
];
