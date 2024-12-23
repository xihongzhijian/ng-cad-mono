import {ObjectOf} from "@lucilor/utils";
import {cloneDeep} from "lodash";
import {InputData, 优化结果, 型材Bom, 铝型材, 铝型材优化结果, 铝型材余料库存} from "./lvxingcaiyouhua.types";

export const getInputDataBoms = (data: InputData) => {
  const boms: 型材Bom[] = [];
  for (const bom of data.型材BOM) {
    const bom2 = cloneDeep(bom);
    const bomsExclude = data.不上设备的型材BOM?.filter((v) => v.BOM唯一码 === bom.BOM唯一码);
    for (const bom3 of bomsExclude || []) {
      bom2.要求数量 -= bom3.要求数量;
    }
    if (bom2.要求数量 > 0) {
      boms.push(bom2);
    }
  }
  return boms;
};

export const calc = (data: InputData) => {
  const bomGroups: ObjectOf<型材Bom[]> = {};
  for (const bom of data.型材BOM) {
    const key = bom.型材优化分组信息;
    if (!bomGroups[key]) {
      bomGroups[key] = [];
    }
    bomGroups[key].push(bom);
  }

  const map余料: ObjectOf<铝型材余料库存> = {};
  for (const item of data.铝型材余料库存) {
    map余料[item.vid] = {...item};
  }

  const bomCounts = new Map<string, number>();
  const getBomCount = (item: 型材Bom) => bomCounts.get(item.BOM唯一码) ?? 0;
  const setBomCount = (item: 型材Bom, count: number | ((n: number) => number)) => {
    if (typeof count === "function") {
      count = count(getBomCount(item));
    }
    bomCounts.set(item.BOM唯一码, count);
  };
  const isBomUsable = (item: 型材Bom) => getBomCount(item) < item.要求数量;

  const resultItems: 优化结果[] = [];
  const backpackDp = (boms: 型材Bom[], totalLength: number, num: number, {qieduansunhao = 0}: 铝型材) => {
    const result: {value: number; items: 型材Bom[]; cuts: number}[] = [];
    if (boms.length < 1) {
      return result;
    }
    const getDpItemValue = (dpItem: (typeof result)[number]) => {
      return dpItem.value - dpItem.cuts;
    };
    while (boms.length > 0 && num > 0) {
      let dp: [number, (typeof result)[number]][] = [];
      for (const [i, bom] of boms.entries()) {
        const length = parseFloat(bom.型材长度);
        const count = bom.要求数量 - getBomCount(bom);
        for (let j = 0; j < count; j++) {
          if (i + j === 0) {
            dp.push([0, {value: 0, items: [], cuts: 0}]);
            if (length + qieduansunhao <= totalLength) {
              const dpItem: (typeof dp)[number] = [length, {value: length, items: [bom], cuts: 0}];
              dpItem[0] = Math.min(totalLength, dpItem[0] + qieduansunhao);
              dpItem[1].cuts++;
              dp.push(dpItem);
            }
          } else {
            const dp2 = dp.slice();
            for (const dpItem of dp) {
              const unusedLength = totalLength - dpItem[0];
              const usedBoms = dpItem[1].items.filter((v) => v.BOM唯一码 === bom.BOM唯一码);
              if (usedBoms.length >= bom.要求数量) {
                continue;
              }
              if (length + qieduansunhao <= unusedLength) {
                const [length2, item] = dpItem;
                const dpItem2: (typeof dp)[number] = [
                  length2 + length,
                  {
                    value: item.value + length,
                    items: [...item.items, bom],
                    cuts: item.cuts
                  }
                ];
                dpItem2[0] = Math.min(totalLength, dpItem2[0] + qieduansunhao);
                dpItem2[1].cuts++;

                let shouldAdd = true;
                for (const v of dp) {
                  const val1 = getDpItemValue(v[1]);
                  const val2 = getDpItemValue(dpItem2[1]);
                  if (v[0] === dpItem2[0] && val1 < val2) {
                    shouldAdd = false;
                    v[1] = dpItem2[1];
                    break;
                  }
                  if (v[0] <= dpItem2[0] && val1 >= val2) {
                    shouldAdd = false;
                    break;
                  }
                }
                if (shouldAdd) {
                  dp2.push(dpItem2);
                } else {
                  // console.log(dp2[i - 1].slice(), dpItem2);
                }
              }
            }
            dp = dp2;
          }
        }
      }
      let max = 0;
      let maxIndex = -1;
      for (const [i, dpItem] of dp.entries()) {
        const val = getDpItemValue(dpItem[1]);
        if (val >= max) {
          max = val;
          maxIndex = i;
        }
      }
      const resultItem = dp[maxIndex][1];
      if (resultItem.items.length < 1) {
        break;
      }
      if (resultItem.value === 0) {
        continue;
      }
      result.push(resultItem);
      for (const item of resultItem.items) {
        setBomCount(item, (n) => n + 1);
      }
      boms = boms.filter((v) => isBomUsable(v));
      num--;
    }
    for (const resultItem of result) {
      const items = resultItem.items;
      resultItem.items = [];
      for (const item of items) {
        const itemPrev = resultItem.items.find((v) => v.BOM唯一码 === item.BOM唯一码);
        if (itemPrev) {
          itemPrev.要求数量++;
        } else {
          resultItem.items.push({...item, 要求数量: 1});
        }
      }
    }
    return result;
  };
  const getTotalLength = (rawLength: number, {touweisunhao = 0, qieduansunhao = 0}: 铝型材) => {
    return rawLength - touweisunhao * 2 - qieduansunhao;
  };
  const getRemainingLength = (totalLength: number, dpItem: ReturnType<typeof backpackDp>[number], {qieduansunhao = 0}: 铝型材) => {
    return totalLength - dpItem.value - (dpItem.cuts - 1) * qieduansunhao;
  };
  const bomsAll = getInputDataBoms(data);
  for (const 余料 of data.铝型材余料库存) {
    const boms = bomsAll.filter((v) => v.铝型材 === 余料.lvxingcai && v.型材颜色 === 余料.yanse && isBomUsable(v));
    if (boms.length < 1) {
      continue;
    }
    const 铝型材 = data.铝型材.find((v) => v.mingzi === 余料.lvxingcai);
    if (!铝型材) {
      continue;
    }
    const rawLength = 余料.yuliaochangdu;
    const totalLength = getTotalLength(rawLength, 铝型材);
    const yuliaorukuzuixiaochangdu = 铝型材.yuliaorukuzuixiaochangdu;
    const dpResult = backpackDp(boms, totalLength, 余料.kucunshuliang, 铝型材);
    for (const dpItem of dpResult) {
      const remainingLength = getRemainingLength(totalLength, dpItem, 铝型材);
      resultItems.push({
        vid: 余料.vid,
        铝型材: 余料.lvxingcai,
        物料长度: rawLength,
        物料颜色: boms[0].型材颜色,
        数量: 1,
        单支型材利用率: 0,
        排料后剩余长度: remainingLength,
        总损耗: rawLength - dpItem.value - remainingLength,
        BOM: dpItem.items,
        余料可以入库: remainingLength >= yuliaorukuzuixiaochangdu,
        余料标签信息: "",
        型材类型: "余料",
        库存位置编码: 余料.kucunweizhibianma,
        库存码: 余料.kucunma
      });
    }
  }
  for (const 铝型材 of data.铝型材) {
    const boms0 = bomsAll.filter((v) => v.铝型材 === 铝型材.mingzi && isBomUsable(v));
    if (boms0.length < 1) {
      continue;
    }
    const bomsMap = new Map<string, 型材Bom[]>();
    for (const bom of boms0) {
      const key = bom.型材颜色;
      const boms2 = bomsMap.get(key) || [];
      boms2.push(bom);
      bomsMap.set(key, boms2);
    }
    const rawLength = 铝型材.biaozhunchangdu;
    const totalLength = getTotalLength(rawLength, 铝型材);
    for (const boms of bomsMap.values()) {
      const dpResult = backpackDp(boms, totalLength, Infinity, 铝型材);
      for (const dpItem of dpResult) {
        const remainingLength = getRemainingLength(totalLength, dpItem, 铝型材);
        resultItems.push({
          vid: 铝型材.vid,
          铝型材: 铝型材.mingzi,
          物料长度: rawLength,
          物料颜色: boms[0].型材颜色,
          数量: 1,
          单支型材利用率: 0,
          排料后剩余长度: remainingLength,
          总损耗: rawLength - dpItem.value - remainingLength,
          余料可以入库: remainingLength >= 铝型材.yuliaorukuzuixiaochangdu,
          BOM: dpItem.items,
          型材类型: "标准型材"
        });
      }
    }
  }

  const result: 铝型材优化结果[] = [];
  for (const item of resultItems) {
    const group = result.find((v) => v.型材 === item.铝型材 && v.颜色 === item.物料颜色);
    if (group) {
      group.优化结果.push(item);
    } else {
      const 铝型材 = data.铝型材.find((v) => v.mingzi === item.铝型材);
      result.push({
        型材: item.铝型材,
        颜色: item.物料颜色,
        排序: 铝型材?.paixu ?? 0,
        切断90度损耗: 铝型材?.qieduan90dusunhao ?? 0,
        切断45度损耗: 铝型材?.qieduan45dusuanhao ?? 0,
        头尾损耗: 铝型材?.touweisunhao ?? 0,
        切断损耗: 铝型材?.qieduansunhao ?? 0,
        余料入库最小长度: 铝型材?.yuliaorukuzuixiaochangdu ?? 0,
        所有型材利用率: 0,
        优化结果: [item]
      });
    }
  }
  let totalLength = 0;
  let usedLength = 0;
  for (const resultItem of result) {
    let totalLength2 = 0;
    let usedLength2 = 0;
    resultItem.优化结果.sort((a, b) => b.物料长度 - a.物料长度);
    for (const item of resultItem.优化结果) {
      totalLength2 += item.物料长度;
      const usedLength3 = item.BOM.reduce((prev, curr) => prev + parseFloat(curr.型材长度) * curr.要求数量, 0);
      item.单支型材利用率 = getNum(usedLength3 / item.物料长度);
      usedLength2 += usedLength3;
    }
    resultItem.所有型材利用率 = getNum(usedLength2 / totalLength2);
    totalLength += totalLength2;
    usedLength += usedLength2;
  }
  result.sort((a, b) => a.排序 - b.排序);
  let 总利用率 = 0;
  if (totalLength > 0) {
    总利用率 = getNum(usedLength / totalLength);
  }
  return {铝型材优化结果: result, 总利用率};
};
export const getNum = (num: number) => Number(num.toFixed(3));
