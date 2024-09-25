import {ChangeDetectionStrategy, computed, ElementRef, HostBinding, inject, viewChild} from "@angular/core";
import {Component, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {DomSanitizer} from "@angular/platform-browser";
import {Formulas, toFixed} from "@app/utils/calc";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {getMokuaiTitleWithUrl, replaceMenshanName} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {FormulaInfo} from "@components/formulas/formulas.component";
import {输入} from "@components/lurushuju/xinghao-data";
import {CadData} from "@lucilor/cad-viewer";
import {isBetween, isTypeOf, ObjectOf, timeout} from "@lucilor/utils";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {LastSuanliao} from "@views/suanliao/suanliao.types";
import {Properties} from "csstype";
import {NgScrollbar} from "ngx-scrollbar";
import {FormulasComponent} from "../../components/formulas/formulas.component";

@Component({
  selector: "app-xhmrmsbj-mokuais",
  templateUrl: "./xhmrmsbj-mokuais.component.html",
  styleUrls: ["./xhmrmsbj-mokuais.component.scss"],
  standalone: true,
  imports: [NgScrollbar, FormulasComponent, MatDividerModule, MatDialogActions, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XhmrmsbjMokuaisComponent {
  private calc = inject(CalcService);
  private domSanitizer = inject(DomSanitizer);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  formulaStyles: Properties = {fontSize: "18px"};
  section1 = viewChild<ElementRef<HTMLDivElement>>("section1");

  constructor(
    public dialogRef: MatDialogRef<XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisOutput>,
    @Inject(MAT_DIALOG_DATA) public data: XhmrmsbjMokuaisInput
  ) {}

  getMokuaiTitle(mokuai: ZixuanpeijianMokuaiItem) {
    const url = getMokuaiTitleWithUrl(this.status, this.data.isVersion2024, mokuai);
    return this.domSanitizer.bypassSecurityTrustHtml(url);
  }

  infos = computed(() => {
    const {lastSuanliao, mokuaidaxiaoResults} = this.data.data;
    const {input, output} = lastSuanliao;
    const mkdxFormulaInfos: XhmrmsbjMkdxFormulaInfo[] = [];
    const xuanzhongMokuaiInfos: XhmrmsbjXuanzhongMokuaiInfo[] = [];
    for (const key of input.bujuNames) {
      const value = input.型号选中门扇布局[key];
      if (!value) {
        continue;
      }
      const mokuaidaxiaoResult = mokuaidaxiaoResults[key] || {};
      const mkdxFormulaInfo: XhmrmsbjMkdxFormulaInfo = {name: key, formulaInfos: []};
      const xuanzhongMokuaiInfo: XhmrmsbjXuanzhongMokuaiInfo = {name: key, nodes: []};
      for (const node of value.模块节点 || []) {
        const mokuai = node.选中模块;
        if (mokuai) {
          const mokuai2 = output.配件模块CAD.find((v) => {
            const {门扇名字, 模块名字} = v.info || {};
            return 门扇名字 === key && 模块名字 === node.层名字 && v.weiyima === mokuai.weiyima;
          });
          const cads: CadData[] = [];
          const suanliaogongshi = {...mokuai.suanliaogongshi};
          for (const [k, v] of [...mokuai.gongshishuru, ...mokuai.xuanxiangshuru]) {
            if (!isTypeOf(v, ["number", "string"])) {
              continue;
            }
            if (k in suanliaogongshi) {
              suanliaogongshi[k] = v;
            }
          }
          const formulas2 = {...output.materialResult};
          if (mokuai2) {
            Object.assign(formulas2, mokuai2.suanliaogongshi);
            for (const cadItem of mokuai2.cads) {
              cads.push(new CadData(cadItem.data));
              Object.assign(formulas2, cadItem.info.dimensionVars);
            }
            formulas2.门扇布局 = mokuai2.info?.门扇布局?.name || "";
          }
          Object.assign(formulas2, mokuaidaxiaoResult);
          const gongshi = value.选中布局数据?.模块大小配置?.算料公式 || {};
          replaceMenshanName(key, gongshi);
          Object.assign(suanliaogongshi, gongshi);
          const gongshiResult = this.calc.calc.calcFormulas(gongshi, formulas2);
          Object.assign(formulas2, gongshiResult.succeedTrim);
          for (const key2 of ["总宽", "总高"]) {
            const key3 = node.层名字 + key2;
            if (key3 in formulas2) {
              formulas2[key2] = formulas2[key3];
            }
          }
          xuanzhongMokuaiInfo.nodes.push({
            layer: node.层名字,
            mokuai,
            formulaInfos: getFormulaInfos(this.calc, suanliaogongshi, formulas2)
          });
        }
      }
      mkdxFormulaInfo.formulaInfos = getFormulaInfos(this.calc, mokuaidaxiaoResult);
      mkdxFormulaInfos.push(mkdxFormulaInfo);
      xuanzhongMokuaiInfos.push(xuanzhongMokuaiInfo);
    }
    return {mkdxFormulaInfos, xuanzhongMokuaiInfos};
  });

  async updateSection1() {
    await timeout(0);
    const section1El = this.section1()?.nativeElement;
    if (section1El) {
      const containerEl = section1El.querySelector(".flex-column");
      if (containerEl) {
        const {width} = containerEl.getBoundingClientRect();
        section1El.style.width = width + "px";
      }
    }
  }

  close() {
    this.dialogRef.close();
  }
}

export interface XhmrmsbjMokuaisInput {
  data: {lastSuanliao: LastSuanliao; mokuaidaxiaoResults: ObjectOf<Formulas>};
  isVersion2024: boolean;
}

export type XhmrmsbjMokuaisOutput = void;

export const openXhmrmsbjMokuaisDialog = getOpenDialogFunc<XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisInput, XhmrmsbjMokuaisOutput>(
  XhmrmsbjMokuaisComponent,
  {width: "100%", height: "100%"}
);

export interface XhmrmsbjMkdxFormulaInfo {
  name: string;
  formulaInfos: FormulaInfo[];
}

export interface XhmrmsbjXuanzhongMokuaiInfo {
  name: string;
  nodes: {
    layer: string;
    mokuai: ZixuanpeijianMokuaiItem;
    formulaInfos: FormulaInfo[];
  }[];
}

export const getFormulaInfos = (
  calc: CalcService,
  formulas: Formulas,
  formulas2?: Formulas,
  input?: {shurus: 输入[]; onChange: (val: number) => void}
) => {
  const infos: FormulaInfo[] = [];
  const getValues = (val: string | number) => {
    const values: FormulaInfo["values"] = [];
    if (typeof val === "number") {
      values.push({eq: true, name: toFixed(val, 2)});
    } else if (typeof val === "string") {
      val = val.trim();
      const valReplaced = val.replaceAll(/^(.*)扇.面蓝线宽/g, "$1扇蓝线宽");
      values.push({eq: true, name: valReplaced});
      const val2 = calc.calc.replaceVars(val, formulas2);
      if (val !== val2) {
        values.push({eq: true, name: val2});
      }
    }
    return values;
  };
  for (const [key, value] of Object.entries(formulas)) {
    const keys: FormulaInfo["keys"] = [{eq: true, name: key}];
    const values: FormulaInfo["values"] = getValues(value);
    if (formulas2 && key in formulas2) {
      const valuePrev = values.at(-1)?.name;
      const value2 = getValues(formulas2[key]).filter((v) => v.name !== valuePrev);
      if (value2.length > 0) {
        const valueNext = value2[0].name;
        let calcResult = calc.calc.calcExpress(`(${valuePrev}) === (${valueNext})`, formulas2);
        if (calcResult.value !== true) {
          calcResult = calc.calc.calcExpress(`(\`${valuePrev}\`) === (\`${valueNext}\`)`, formulas2);
        }
        if (calcResult.value !== true) {
          calcResult = calc.calc.calcExpress(`(eval(\`${valuePrev}\`)) === (\`${valueNext}\`)`, formulas2);
        }
        value2[0].eq = calcResult.value === true;
        values.push(...value2);
      }
    }
    const valueLast = values.at(-1);
    if (valueLast && input) {
      const shuru = input.shurus.find((v) => v.名字 === key && v.下单用途 === "输入");
      if (shuru) {
        const range = shuru.取值范围?.split("-").map((v) => parseFloat(v)) || [];
        const getNum = (n: any, defaultVal: number) => {
          if (typeof n === "number" && !isNaN(n)) {
            return n;
          }
          return defaultVal;
        };
        if (["undefined", "null", ""].includes(String(formulas[key]))) {
          formulas[key] = shuru.默认值;
        }
        const min = getNum(range[0], -Infinity);
        const max = getNum(range[1], Infinity);
        valueLast.inputInfo = {
          type: "number",
          label: "",
          model: {key, data: formulas},
          readonly: !shuru.可以修改,
          validators: (control) => {
            const val = control.value;
            if (!isBetween(val, min, max)) {
              return {超出取值范围: true};
            }
            return null;
          },
          onChange: (val) => input.onChange(val)
        };
      }
    }
    infos.push({keys, values});
  }
  return infos;
};
