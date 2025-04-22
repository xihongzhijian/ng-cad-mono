import {ChangeDetectionStrategy, Component, effect, forwardRef, HostBinding, inject, input, signal} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatDialog} from "@angular/material/dialog";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadData, CadLine} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep, uniq} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, filter, lastValueFrom} from "rxjs";
import {InputComponent} from "../../modules/input/components/input.component";
import {Klkwpz, KlkwpzItem, KlkwpzSource} from "./klkwpz";

@Component({
  selector: "app-klkwpz",
  templateUrl: "./klkwpz.component.html",
  styleUrls: ["./klkwpz.component.scss"],
  imports: [forwardRef(() => InputComponent), MatButtonModule, MatCardModule, NgScrollbar],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlkwpzComponent {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  data = input.required<KlkwpzSource>({});
  cadId = input<string>();

  klkwpz = new Klkwpz();
  formData = signal<KlkwpzFormItem[]>([]);
  cadData?: CadData;
  cadMubanData?: CadData;

  dataEff = effect(() => {
    const data = this.data();
    this.klkwpz.init(data);
    this.formData.set(this.klkwpz.data.map((item) => this._getItemData(item)));
  });
  private _cadIdEffPending$ = new BehaviorSubject(false);
  cadIdEff = effect(async () => {
    const id = this.cadId();
    if (!id) {
      return;
    }
    await lastValueFrom(this._cadIdEffPending$.pipe(filter((v) => v)));
    this._cadIdEffPending$.next(true);
    const result = await this.http.getCad({collection: "cad", id});
    if (result.cads.length > 0) {
      this.cadData = result.cads[0];
      const mubanId = this.cadData.zhankai[0].kailiaomuban;
      if (mubanId) {
        const result2 = await this.http.getCad({collection: "kailiaocadmuban", id: mubanId});
        if (result2.cads.length > 0) {
          this.cadMubanData = result2.cads[0];
        }
      }
    }
    this._cadIdEffPending$.next(false);
  });

  private _createItem(name: string): KlkwpzItem {
    return this.klkwpz.getKlkwpzItem(name, {});
  }

  private _getItemData(item: KlkwpzItem) {
    if (!item.自增等距阵列) {
      item.自增等距阵列 = this._createItem("").自增等距阵列;
    }
    delete item.固定行列阵列;
    delete item.固定行列阵列;
    const typesData = {
      type2: (() => {
        if (item.baseX && item.baseY) {
          return "取开料模板横线竖线交点";
        }
        return "在算料CAD的打孔面上";
      })(),
      type3: (() => {
        if (item.自增等距阵列 || item.固定行列阵列) {
          if (item.板材孔位阵列范围) {
            return "按指定宽高打阵列孔";
          } else if (item.板材打孔范围缩减) {
            return "按展开高打阵列孔（缩短范围）";
          }
          return "按展开高打阵列孔";
        }
        return "打单个孔";
      })()
    };
    const getter = new InputInfoWithDataGetter(item, {validators: Validators.required});
    const getter2 = new InputInfoWithDataGetter(typesData, {validators: Validators.required});
    const result: KlkwpzFormItem = {
      item,
      inputs1: [
        getter.string("name", {
          label: "孔名字",
          suffixIcons: [
            {
              name: "list",
              onClick: async () => {
                const resultData = await this.openKongweiList();
                if (resultData && resultData.length > 0) {
                  item.name = resultData[0].name;
                }
              }
            }
          ]
        }),
        getter2.selectSingle("type3", ["打单个孔", "按展开高打阵列孔", "按展开高打阵列孔（缩短范围）", "按指定宽高打阵列孔"], {
          label: "打孔类型",
          onChange: () => {
            this._updateItemInputs3(result, typesData);
          }
        }),
        {
          type: "select",
          label: "允许孔超出零件边缘",
          options: ["不允许超出", "允许左右超出", "允许上下超出", "都允许超出"],
          value: (() => {
            const {不删除超出板材的孔, 删除超出板材的孔X, 删除超出板材的孔Y} = item;
            let removeX = 删除超出板材的孔X === "是";
            let removeY = 删除超出板材的孔Y === "是";
            if (不删除超出板材的孔 === "是") {
              removeX = false;
              removeY = false;
            } else if (!removeX && !removeY) {
              removeX = true;
              removeY = true;
            }
            if (!removeX && !removeY) {
              return "都允许超出";
            } else if (removeX && removeY) {
              return "不允许超出";
            } else if (removeX) {
              return "允许上下超出";
            } else {
              return "允许左右超出";
            }
          })(),
          onChange: (val: string) => {
            if (val === "允许左右超出") {
              delete item.不删除超出板材的孔;
              delete item.删除超出板材的孔X;
              item.删除超出板材的孔Y = "是";
            } else if (val === "允许上下超出") {
              delete item.不删除超出板材的孔;
              item.删除超出板材的孔X = "是";
              delete item.删除超出板材的孔Y;
            } else if (val === "都允许超出") {
              item.不删除超出板材的孔 = "是";
              delete item.删除超出板材的孔X;
              delete item.删除超出板材的孔Y;
            } else {
              delete item.不删除超出板材的孔;
              delete item.删除超出板材的孔X;
              delete item.删除超出板材的孔Y;
            }
          }
        }
      ],
      inputs2: [],
      inputs3: []
    };
    this._updateItemInputs2(result, typesData);
    this._updateItemInputs3(result, typesData);
    return result;
  }

  private _updateItemInputs2(data: KlkwpzFormItem, typesData: {type2: string}) {
    const item = data.item;
    const arr: InputInfo[] = [];
    const getter = new InputInfoWithDataGetter(item, {validators: Validators.required});
    const getter2 = new InputInfoWithDataGetter(typesData, {validators: Validators.required});
    const info0 = getter2.selectSingle("type2", ["取开料模板横线竖线交点", "在算料CAD的打孔面上"], {
      label: "打孔起始点",
      onChange: () => {
        this._updateItemInputs2(data, typesData);
      }
    });
    const type2 = typesData.type2;
    if (type2 === "取开料模板横线竖线交点") {
      delete item.face;
      if (!item.baseX) {
        item.baseX = "";
      }
      if (!item.baseY) {
        item.baseY = "";
      }
      let lineNamesH: string[];
      let lineNamesV: string[];
      if (this.cadMubanData) {
        const linesH: CadLine[] = [];
        const linesV: CadLine[] = [];
        for (const e of this.cadMubanData.entities.line) {
          if (e.isHorizontal()) {
            linesH.push(e);
          } else if (e.isVertical()) {
            linesV.push(e);
          }
        }
        lineNamesH = uniq(linesH.map((e) => e.mingzi).filter(Boolean));
        lineNamesV = uniq(linesV.map((e) => e.mingzi).filter(Boolean));
      } else {
        lineNamesH = [];
        lineNamesV = [];
      }
      arr.push(info0, {
        type: "group",
        label: " ",
        infos: [
          getter.string("baseX", {label: "竖线名字", options: lineNamesV}),
          getter.string("baseY", {label: "横线名字", options: lineNamesH})
        ]
      });
    } else if (type2 === "在算料CAD的打孔面上") {
      delete item.baseX;
      delete item.baseY;
      if (!item.face) {
        item.face = "";
      }
      let lineNames: string[];
      if (this.cadData) {
        lineNames = uniq(this.cadData.entities.line.map((e) => e.mingzi).filter(Boolean));
      } else {
        lineNames = [];
      }
      if (!lineNames.includes("展开平板顶点定位")) {
        lineNames.push("展开平板顶点定位");
      }
      arr.push(
        {
          type: "group",
          label: "",
          infos: [info0, getter.string("face", {label: "打孔面名字", options: lineNames})]
        },
        getter.coordinate("anchor1", {label: "", labelX: "打孔面起始点X", labelY: "打孔面起始点Y", compact: true})
      );
    }
    arr.push(
      getter.coordinate("anchor2", {label: "", labelX: "孔cad定位点X", labelY: "孔cad定位点Y", compact: true}),
      getter.string("x", {label: "第一个孔定位点到打孔起始点的x方向距离"}),
      getter.string("y", {label: "第一个孔定位点到打孔起始点的y方向距离"})
    );
    data.inputs2 = arr;
  }

  private _updateItemInputs3(data: KlkwpzFormItem, typesData: {type3: string}) {
    const item = data.item;
    let arr: InputInfo[] = [];
    let hasMatrix = true;
    const type3 = typesData.type3;
    if (type3 === "按展开高打阵列孔") {
      delete item.板材孔位阵列范围;
      delete item.板材打孔范围缩减;
    } else if (type3 === "按展开高打阵列孔（缩短范围）") {
      if (!item.板材打孔范围缩减) {
        item.板材打孔范围缩减 = {上: "", 下: "", 左: "", 右: ""};
      }
      const getter = new InputInfoWithDataGetter(item.板材打孔范围缩减, {validators: Validators.required});
      arr.push({
        type: "group",
        label: "阵列范围缩减",
        infos: [getter.string("上"), getter.string("下"), getter.string("左"), getter.string("右")]
      });
      delete item.板材孔位阵列范围;
    } else if (type3 === "按指定宽高打阵列孔") {
      delete item.板材打孔范围缩减;
      if (!item.板材孔位阵列范围) {
        item.板材孔位阵列范围 = {宽: "", 高: ""};
      }
      const getter2 = new InputInfoWithDataGetter(item.板材孔位阵列范围, {validators: Validators.required});
      arr.push({
        type: "group",
        label: "板材孔位阵列范围",
        infos: [getter2.string("宽"), getter2.string("高")]
      });
    } else {
      delete item.板材孔位阵列范围;
      delete item.板材打孔范围缩减;
      hasMatrix = false;
    }
    if (hasMatrix) {
      item.类型 = "自增等距阵列";
      const matrix: KlkwpzItem["自增等距阵列"] = {自增方向: "上右", 行数: "1", 列数: "1", 行距: "0", 列距: "0", 孔依附板材边缘: "否"};
      if (!item.自增等距阵列) {
        item.自增等距阵列 = matrix;
      } else {
        item.自增等距阵列 = {...matrix, ...item.自增等距阵列};
      }
      delete item.固定行列阵列;
      delete item.增加指定偏移;
      const getter = new InputInfoWithDataGetter(item.自增等距阵列, {validators: Validators.required});
      arr = [
        getInputInfoGroup([
          getter.selectSingle("自增方向", ["上右", "下右", "上左", "下左"]),
          getter.selectBooleanStr("孔依附板材边缘", {label: "剪切相交XY线"})
        ]),
        getInputInfoGroup([getter.string("行数"), getter.string("列数"), getter.string("行距"), getter.string("列距")]),
        ...arr
      ];
    } else {
      delete item.类型;
      delete item.自增等距阵列;
      delete item.固定行列阵列;
      delete item.增加指定偏移;
      const getter = new InputInfoWithDataGetter(item, {validators: Validators.required});
      arr = [getter.selectBooleanStr("孔依附板材边缘", {label: "剪切相交XY线"}), ...arr];
    }
    data.inputs3 = arr;
  }

  addItem(i: number, fromItem?: KlkwpzItem) {
    let item: KlkwpzItem;
    if (fromItem) {
      item = cloneDeep(fromItem);
    } else {
      item = this._createItem("");
    }
    this.klkwpz.data.splice(i + 1, 0, item);
    this.formData.update((v) => {
      v.splice(i + 1, 0, this._getItemData(item));
      return [...v];
    });
  }

  removeItem(i: number) {
    this.klkwpz.data.splice(i, 1);
    this.formData.update((v) => {
      v.splice(i, 1);
      return [...v];
    });
  }

  private _isInfoEmpty(info: InputInfo): boolean {
    if (info.type === "group") {
      if (info.infos) {
        return info.infos.some((v) => this._isInfoEmpty(v));
      } else {
        return false;
      }
    }
    if (info.model) {
      const {data, key} = info.model;
      if (data && key) {
        return [undefined, null, ""].includes(data[key]);
      }
    }
    return false;
  }

  submit() {
    for (const item of this.formData()) {
      const inputs = [...item.inputs1, ...item.inputs2, ...item.inputs3];
      for (const info of inputs) {
        if (this._isInfoEmpty(info)) {
          this.message.alert("请填写完整信息");
          return false;
        }
      }
    }
    return true;
  }

  printItem(item: KlkwpzItem) {
    console.log(this.klkwpz.exportItem(item));
  }

  getInfoClass(info: InputInfo) {
    const result: string[] = [info.label];
    if (this._isInfoEmpty(info)) {
      result.push("empty");
    }
    return result.join(" ");
  }

  async openKongweiList() {
    return await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "cad", search: {分类: "孔"}, pageSize: 50}});
  }
}

export interface KlkwpzFormItem {
  item: KlkwpzItem;
  inputs1: InputInfo[];
  inputs2: InputInfo[];
  inputs3: InputInfo[];
}
