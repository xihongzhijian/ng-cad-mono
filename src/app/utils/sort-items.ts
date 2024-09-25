export type SortedItem<T> = T & {
  originalIndex: number;
};

export const getSortedItems = <T>(items: T[], getOrder: (item: T) => number) => {
  const result = items.map<SortedItem<T>>((v, i) => ({...v, originalIndex: i}));
  return result.sort((a, b) => getOrder(a) - getOrder(b));
};
