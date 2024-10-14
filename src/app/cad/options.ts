import {ObjectOf} from "@lucilor/utils";

export const cadOptions = {
  bancaihoudufangxiang: {
    values: [
      {value: "gt0", label: "方向1"},
      {value: "lt0", label: "方向2"},
      {value: "none", label: "不指定"}
    ],
    defaultValue: "none"
  },
  bancaiwenlifangxiang: {values: ["垂直", "水平", "不限", "指定垂直", "指定水平", "指定不限"], defaultValue: "垂直"},
  bianxingfangshi: {values: ["自由", "高比例变形", "宽比例变形", "宽高比例变形"], defaultValue: "自由"},
  huajianwenlifangxiang: {values: ["垂直", "水平"], defaultValue: "垂直"},
  kailiaopaibanfangshi: {values: ["自动排版", "不排版", "必须排版"], defaultValue: "自动排版"},
  suanliaochuli: {values: ["算料+显示展开+开料", "算料+开料", "算料+显示展开", "算料"], defaultValue: "算料+显示展开+开料"},
  suanliaodanxianshi: {
    values: [
      "尺寸",
      "板材",
      "尺寸+板材",
      "名字",
      "名字+板材",
      "名字+展开宽",
      "名字+展开宽+展开高",
      "名字+展开高+展开宽",
      "名字+展开高+板材",
      "名字+展开宽+展开高+板材",
      "名字+展开高",
      "展开宽",
      "展开高",
      "展开宽+展开高",
      "展开高+展开宽",
      "展开宽+板材",
      "展开高+板材",
      "展开宽+展开高+板材",
      "展开高+展开宽+板材",
      "都不显示",
      "所有"
    ],
    defaultValue: "展开宽+展开高+板材"
  },
  企料包边类型: {values: ["自动判断", "胶条位包", "外面包", "胶条位包+外面包", "无"], defaultValue: "自动判断"},
  属于门框门扇: {values: ["未区分", "门框", "门扇"], defaultValue: "未区分"},
  指定板材分组: {
    values: [
      "门框板材",
      "底框板材",
      "门扇板材",
      "辅板1",
      "辅板2",
      "辅板3",
      "辅板4",
      "辅板5",
      "辅板6",
      "辅板7",
      "辅板8",
      "辅板9",
      "套门门扇板材"
    ],
    defaultValue: ""
  },
  算料单展开显示位置: {values: ["CAD上面", "CAD下面", "CAD中间", "CAD左边", "CAD右边"], defaultValue: "CAD下面"},
  装配示意图自动拼接锁边铰边: {values: ["都拼接", "只拼接锁边", "只拼接铰边", "不拼接"], defaultValue: "都拼接"}
} as const;

export const cadLineOptions = {
  zhankaixiaoshuchuli: {values: ["不处理", "舍去小数", "小数进一", "四舍五入", "0.5取整", "保留一位小数四舍五入"], defaultValue: "不处理"},
  suanliaosanxiaoshuchuli: {values: ["默认", "舍去小数", "小数进一", "四舍五入", "保留一位", "保留两位"], defaultValue: "默认"}
} as const;

export const cadDimensionOptions = {
  xiaoshuchuli: {values: ["四舍五入", "舍去小数", "小数进一", "保留一位", "保留两位"], defaultValue: "四舍五入"}
} as const;

export const cadOptionOptions: ObjectOf<{values: string[]; defaultValue: string}> = {
  开启: {values: ["外开", "内开"], defaultValue: ""},
  包边方向: {values: ["包边在外", "包边在内"], defaultValue: ""},
  锁向: {values: ["左锁", "右锁"], defaultValue: ""}
};
