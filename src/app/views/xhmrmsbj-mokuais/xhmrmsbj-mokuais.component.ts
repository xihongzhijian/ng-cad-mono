import {Component, computed, ElementRef, HostBinding, inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {DomSanitizer} from "@angular/platform-browser";
import {Calc} from "@app/utils/calc";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {getMokuaiTitle, replaceMenshanName} from "@components/dialogs/zixuanpeijian/zixuanpeijian.utils";
import {FormulaInfo} from "@components/formulas/formulas.types";
import {getFormulaInfos} from "@components/formulas/formulas.utils";
import {CadData} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {getMkdxpzSlgsFormulas, getNodeFormulasKey, getNodeFormulasKeys, nodeFormulasKeysRaw} from "@views/msbj/msbj.utils";
import {LastSuanliao} from "@views/suanliao/suanliao.types";
import {getMokuaiFormulas, XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {Properties} from "csstype";
import {NgScrollbar} from "ngx-scrollbar";
import {FormulasComponent} from "../../components/formulas/formulas.component";

@Component({
  selector: "app-xhmrmsbj-mokuais",
  templateUrl: "./xhmrmsbj-mokuais.component.html",
  styleUrls: ["./xhmrmsbj-mokuais.component.scss"],
  imports: [NgScrollbar, FormulasComponent, MatDividerModule, MatDialogActions, MatButtonModule]
})
export class XhmrmsbjMokuaisComponent {
  dialogRef = inject<MatDialogRef<XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisOutput>>(MatDialogRef);
  data = inject<XhmrmsbjMokuaisInput>(MAT_DIALOG_DATA);

  private calc = inject(CalcService);
  private domSanitizer = inject(DomSanitizer);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  formulaStyles: Properties = {fontSize: "18px"};
  section1 = viewChild<ElementRef<HTMLDivElement>>("section1");

  getMokuaiTitle(mokuai: ZixuanpeijianMokuaiItem) {
    const url = getMokuaiTitle(mokuai, {status: this.status, isVersion2024: this.data.isVersion2024});
    return this.domSanitizer.bypassSecurityTrustHtml(url);
  }

  infos = computed(() => {
    const {lastSuanliao} = this.data.data;
    const {input, output} = lastSuanliao;
    const materialResult = output.materialResult;
    const mkdxFormulaInfos: XhmrmsbjMkdxFormulaInfo[] = [];
    const xuanzhongMokuaiInfos: XhmrmsbjXuanzhongMokuaiInfo[] = [];
    for (const key of input.bujuNames) {
      const value = input.型号选中门扇布局[key];
      if (!value) {
        continue;
      }
      const mokuaidaxiaoResult = output.门扇布局大小?.[key] || {};
      const mkdxFormulaInfo: XhmrmsbjMkdxFormulaInfo = {name: key, formulaInfos: []};
      const xuanzhongMokuaiInfo: XhmrmsbjXuanzhongMokuaiInfo = {name: key, nodes: []};
      const nodeNames = value.模块节点?.map((v) => v.层名字) || [];
      const nodeNameKeysAll = getNodeFormulasKeys(nodeNames);
      for (const node of value.模块节点 || []) {
        const mokuai = node.选中模块;
        if (mokuai) {
          const mokuai2 = output.配件模块CAD.find((v) => {
            const {门扇名字, 模块名字} = v.info || {};
            return 门扇名字 === key && 模块名字 === node.层名字 && v.weiyima === mokuai.weiyima;
          });
          const cads: CadData[] = [];
          const formulas = {...getMokuaiFormulas(value, node, mokuai, {}, materialResult).formulas};
          const formulas2 = {...output.materialResult, ...mokuaidaxiaoResult};
          if (mokuai2) {
            Calc.mergeFormulas(formulas2, mokuai2.suanliaogongshi);
            for (const cadItem of mokuai2.cads) {
              cads.push(new CadData(cadItem.data));
              Calc.mergeFormulas(formulas2, cadItem.info.dimensionVars);
            }
            formulas2.门扇布局 = mokuai2.info?.门扇布局?.name || "";
          }
          const formulasResult = getMkdxpzSlgsFormulas(value.选中布局数据?.模块大小配置, materialResult, key);
          const gongshi = {...formulasResult.data};
          const nodeNameKeys = getNodeFormulasKeys([node.层名字]);
          for (const key2 of Object.keys(gongshi)) {
            if (nodeNameKeysAll.includes(key2) && !nodeNameKeys.includes(key2)) {
              delete gongshi[key2];
            }
          }
          for (const key2 of nodeFormulasKeysRaw) {
            formulas2[key2] = formulas2[getNodeFormulasKey(node.层名字, key2)];
          }
          replaceMenshanName(key, gongshi);
          Calc.mergeFormulas(formulas, gongshi);
          const gongshiResult = this.calc.calc.calcFormulas(formulas, formulas2);
          Calc.mergeFormulas(formulas2, gongshiResult.succeedTrim);
          for (const key2 of nodeFormulasKeysRaw) {
            const key3 = getNodeFormulasKey(node.层名字, key2);
            if (key3 in formulas2) {
              formulas2[key2] = formulas2[key3];
            }
          }
          xuanzhongMokuaiInfo.nodes.push({
            layer: node.层名字,
            mokuai,
            formulaInfos: getFormulaInfos(this.calc, formulas, formulas2)
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

  openXhmrmsbj() {
    const xhmrmsbj = this.data.xhmrmsbj;
    this.status.openInNewTab(["/型号默认门扇布局"], {queryParams: {id: xhmrmsbj.id}});
  }
}

export interface XhmrmsbjMokuaisInput {
  xhmrmsbj: XhmrmsbjData;
  xinghao: MrbcjfzXinghaoInfo;
  data: {lastSuanliao: LastSuanliao};
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
