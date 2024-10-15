import {CalcResult, Formulas} from "@app/utils/calc";
import {
  CalcZxpjResult,
  Step1Data,
  ZixuanpeijianCadItem,
  ZixuanpeijianMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {MongodbDataBase} from "@modules/http/services/cad-data.service.types";
import {MsbjData} from "@views/msbj/msbj.types";
import {MenshanKey, XhmrmsbjInfo, XhmrmsbjTableData} from "@views/xhmrmsbj/xhmrmsbj.types";

export interface SuanliaoInput {
  materialResult: Formulas;
  gongshi: Formulas;
  tongyongGongshi: Formulas;
  inputResult: Formulas;
  型号选中门扇布局: ObjectOf<XhmrmsbjInfo>;
  配件模块CAD: ObjectOf<ObjectOf<any[]>>;
  门扇布局CAD: any[];
  bujuNames: MenshanKey[];
  varNames: string[];
  xhmrmsbj: XhmrmsbjTableData;
  msbjs: MsbjData[];
  step1Data?: Step1Data;
  silent?: boolean;
}

export interface SuanliaoOutputData {
  action: "suanliaoEnd";
  data: SuanliaoOutput;
}

export interface SuanliaoOutput extends CalcZxpjResult {
  materialResult: Formulas;
  materialResultDiff: Formulas;
  配件模块CAD: ZixuanpeijianMokuaiItem[];
  门扇布局CAD: ZixuanpeijianCadItem[];
  效果图使用变量?: ObjectOf<ObjectOf<Formulas>>;
}

export interface 根据输入值计算选中配件模块无依赖的公式结果输入 {
  vars: Formulas;
  型号选中门扇布局: ObjectOf<XhmrmsbjInfo>;
}

export interface 根据输入值计算选中配件模块无依赖的公式结果输出 {
  成功: ObjectOf<Formulas>;
  失败: ObjectOf<Formulas>;
}

export interface LastSuanliao {
  input: SuanliaoInput;
  output: SuanliaoOutput;
}

export interface SuanliaoCalcError {
  message: string;
  details?: string | string[];
  cads?: CadData[];
  calc?: {formulas: Formulas; vars: Formulas; result: CalcResult | null};
  info?: ObjectOf<any>;
}

export interface HoutaiData extends MongodbDataBase {
  选项?: ObjectOf<any>;
  条件?: any[];
  分类?: string;
}
