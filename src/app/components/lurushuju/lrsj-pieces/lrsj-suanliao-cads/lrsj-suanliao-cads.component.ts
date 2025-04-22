import {Component, computed, effect, ElementRef, HostBinding, inject, signal, viewChild, viewChildren} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {session} from "@app/app.common";
import {filterCad} from "@app/cad/cad-shujuyaoqiu";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadData} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {SuanliaogongshiComponent} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import {HoutaiData} from "@views/suanliao/suanliao.types";
import {debounce} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {CadItemComponent} from "../../cad-item/cad-item.component";
import {CadItemButton} from "../../cad-item/cad-item.types";
import {openSelectZuofaDialog} from "../../select-zuofa-dialog/select-zuofa-dialog.component";
import {SelectZuofaItemData} from "../../select-zuofa-dialog/select-zuofa-dialog.types";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {SuanliaoTablesComponent} from "../../suanliao-tables/suanliao-tables.component";
import {SuanliaoDataParams, 算料数据} from "../../xinghao-data";
import {LrsjPiece} from "../lrsj-piece";
import {SuanliaoCadItemInfo} from "./lrsj-suanliao-cads.types";

@Component({
  selector: "app-lrsj-suanliao-cads",
  imports: [
    CadItemComponent,
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    NgScrollbarModule,
    SuanliaogongshiComponent,
    SuanliaoTablesComponent
  ],
  templateUrl: "./lrsj-suanliao-cads.component.html",
  styleUrl: "./lrsj-suanliao-cads.component.scss"
})
export class LrsjSuanliaoCadsComponent extends LrsjPiece {
  private dialog = inject(MatDialog);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);
  private spinner = inject(SpinnerService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  isKailiao = this.lrsjStatus.isKailiao;
  suanliaoData = this.lrsjStatus.suanliaoDataNew;

  cadItems = viewChildren(CadItemComponent);
  cadsScrollbar = viewChild<NgScrollbar>("cadsScrollbar");
  suanliaoTables = viewChild(SuanliaoTablesComponent);

  constructor() {
    super();
    this.lrsjStatus.suanliaoCadsValidateStart$.subscribe(async ({alert}) => {
      const result = await this.validate(alert);
      this.lrsjStatus.suanliaoCadsValidateEnd$.next(result);
    });
  }

  data = computed(() => {
    const {key1} = this.lrsjStatus.suanliaoCadsInfo() || {};
    if (!key1) {
      return null;
    }
    return this.suanliaoData()[key1];
  });
  suanliaoDataParams = computed<SuanliaoDataParams | null>(() => {
    const xinghao = this.lrsjStatus.xinghao();
    if (!xinghao) {
      return null;
    }
    const suanliaoDataInfo = this.lrsjStatus.suanliaoDataInfo();
    const suanliaoCadsInfo = this.lrsjStatus.suanliaoCadsInfo();
    const suanliaoData = this.suanliaoData();
    if (!suanliaoDataInfo || !suanliaoCadsInfo || !suanliaoData) {
      return null;
    }
    const [包边方向, 开启] = suanliaoCadsInfo.key1.split("+");
    return {
      选项: {
        型号: xinghao.名字,
        产品分类: suanliaoDataInfo.fenleiName,
        工艺做法: suanliaoDataInfo.zuofaName,
        包边方向,
        开启,
        门铰锁边铰边: suanliaoData.名字
      }
    };
  });
  openCadOptions = computed<OpenCadOptions>(() => {
    const data = this.data();
    if (!data) {
      return {};
    }
    const params = this.suanliaoDataParams();
    if (!params) {
      return {};
    }
    return {
      suanliaogongshiInfo: {
        data: {
          算料公式: data.算料公式,
          输入数据: data.输入数据
        },
        varNames: this.lrsjStatus.varNames(),
        slgs: {
          justify: (item) => {
            if (item.选项) {
              const removeKeys = ["产品分类", "包边方向", "开启"];
              for (const key of removeKeys) {
                delete item.选项[key];
              }
            }
          }
        }
      },
      suanliaoTablesInfo: {params}
    };
  });

  private _showMenuLeftKey = "suanliaoDataDialog.showMenuLeft";
  private _showMenuRightKey = "suanliaoDataDialog.showMenuRight";
  showMenuLeft = signal(session.load<boolean>(this._showMenuLeftKey) ?? true);
  showMenuRight = signal(session.load<boolean>(this._showMenuRightKey) ?? true);
  showMenuLeftEff = effect(() => {
    session.save(this._showMenuLeftKey, this.showMenuLeft());
  });
  showMenuRightEff = effect(() => {
    session.save(this._showMenuRightKey, this.showMenuRight());
  });

  isCadsReversed = signal(true);
  hiddenCads = signal<number[]>([]);
  toggleCadsReversed(value?: boolean) {
    if (typeof value === "boolean") {
      this.isCadsReversed.set(value);
    } else {
      this.isCadsReversed.update((v) => !v);
    }
  }
  filterCads(val: string) {
    const hiddenCads: number[] = [];
    for (const [i, cad] of this.data()?.算料CAD.entries() || []) {
      const yaoqiu = this.status.getCadYaoqiu(cad.分类);
      if (yaoqiu && !filterCad(val, cad, yaoqiu)) {
        hiddenCads.push(i);
      }
    }
    this.hiddenCads.set(hiddenCads);
  }
  suanliaoCadsSearch = computed<InputInfo>(() => ({
    type: "string",
    label: "搜索",
    onInput: debounce((val) => {
      this.filterCads(val);
    }, 500)
  }));
  cadInfos = computed(() => {
    const data = this.data();
    const hiddenCads = this.hiddenCads();
    const cadsInfos = (data?.算料CAD || []).map((cad, i) => {
      const yaoqiu = this.status.getCadYaoqiu(cad.分类);
      const hidden = hiddenCads.includes(i);
      return {cad, i, yaoqiu, hidden};
    });
    if (this.isCadsReversed()) {
      cadsInfos.reverse();
    }
    return cadsInfos;
  });

  updateSuanliaoData() {
    const {key1} = this.lrsjStatus.suanliaoCadsInfo() || {};
    if (!key1) {
      return;
    }
    const suanliaoData = {...this.suanliaoData()};
    suanliaoData[key1] = {...suanliaoData[key1]};
    this.suanliaoData.set(suanliaoData);
  }

  cadItemButtons = computed(() => {
    const buttons: CadItemButton<SuanliaoCadItemInfo>[] = [
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.removeCad.bind(this)}
    ];
    if (this.isKailiao()) {
      buttons.push({name: "添加孔位配置", onClick: this.addKwpz.bind(this)}, {name: "添加开料参数", onClick: this.addKlcs.bind(this)});
    }
    return buttons;
  });
  mubanExtraData = computed(() => {
    const data: Partial<CadData> = {};
    const options = this.suanliaoDataParams()?.选项;
    if (options) {
      data.options = options;
    }
    return data;
  });
  cadNameValidator = ((data: CadData) => {
    const names = this.data()?.算料CAD.map((v) => v.名字) || [];
    if (names.filter((v) => v === data.name).length > 1) {
      return {名字重复: true};
    }
    return null;
  }).bind(this);

  async copyCad(component: CadItemComponent<SuanliaoCadItemInfo>) {
    const data = this.data();
    if (!data) {
      return;
    }
    const cad = component.cad();
    const cadName = component.cadName();
    if (!(await this.message.confirm(`确定复制【${cadName}】吗？`))) {
      return;
    }
    const mubanData = component.mubanData();
    const cadData2 = (cad instanceof CadData ? cad : new CadData(cad.json)).clone(true);
    delete cadData2.info.imgId;
    cadData2.name += "_复制";
    const cad2 = getHoutaiCad(cadData2);
    if (mubanData) {
      const cadData = new CadData(mubanData.clone(true));
      const result = await this.http.setCad({collection: "kailiaocadmuban", cadData, force: true}, true);
      if (!result) {
        return;
      }
      component.setMubanId(result.id);
      component.mubanData.set(cadData);
    }
    data.算料CAD.splice(component.customInfo().index + 1, 0, cad2);
    this.updateSuanliaoData();
  }
  async removeCad(component: CadItemComponent<SuanliaoCadItemInfo>) {
    const data = this.data();
    if (!data) {
      return;
    }
    const cadName = component.cadName();
    if (!(await this.message.confirm(`删除【${cadName}】将同时删除对应的孔位配置、开料参数、开料模板，确定删除吗？`))) {
      return;
    }
    const mubanId = component.mubanId();
    if (mubanId) {
      await this.http.mongodbDelete("kailiaocadmuban", {id: mubanId});
    }
    const names = data.算料CAD.filter((v) => v.名字 === cadName);
    if (names.length < 2) {
      const params = this.suanliaoDataParams();
      await this.http.mongodbDelete("kailiaokongweipeizhi", {filter: {...params, 名字: cadName}});
      await this.http.mongodbDelete("kailiaocanshu", {filter: {...params, 名字: cadName + "中空参数"}});
      this.suanliaoTables()?.update();
    }
    data.算料CAD.splice(component.customInfo().index, 1);
    this.updateSuanliaoData();
  }

  async addKwpz(component: CadItemComponent<SuanliaoCadItemInfo>) {
    const suanliaoTables = this.suanliaoTables();
    if (!suanliaoTables) {
      return;
    }
    const resData = await this.http.mongodbInsert(suanliaoTables.klkwpzCollection, {
      ...this.suanliaoDataParams(),
      名字: component.cadName()
    });
    if (resData) {
      suanliaoTables.updateKlkwpzTable();
    }
  }
  async addKlcs(component: CadItemComponent<SuanliaoCadItemInfo>) {
    const suanliaoTables = this.suanliaoTables();
    if (!suanliaoTables) {
      return;
    }
    const response = await this.http.mongodbInsert<HoutaiData>(suanliaoTables.klcsCollection, {
      ...this.suanliaoDataParams(),
      名字: component.cadName + "中空参数",
      分类: "切中空"
    });
    if (response) {
      suanliaoTables.updateKlcsTable();
    }
  }

  async selectSuanliaoCads() {
    const data = this.data();
    if (!data) {
      return;
    }
    const zxpjData: ZixuanpeijianInput = {
      data: {
        零散: data.算料CAD.map((v) => {
          const cad = new CadData(v.json);
          cad.info.isSuanliaoSelected = true;
          return {data: cad, info: {houtaiId: v._id, zhankai: [], calcZhankai: []}};
        })
      },
      step: 3,
      stepFixed: true,
      noValidateCads: true,
      gongshis: data.算料公式
    };
    const result = await openZixuanpeijianDialog(this.dialog, {data: zxpjData});
    if (result) {
      data.算料CAD = result.零散.map((v) => {
        return getHoutaiCad(v.data, {houtaiId: v.info.houtaiId});
      });
      this.updateSuanliaoData();
    }
  }
  async copyCadsFromOthers() {
    const suanliaoDataInfo = this.lrsjStatus.suanliaoDataInfo();
    const suanliaoCadsInfo = this.lrsjStatus.suanliaoCadsInfo();
    if (!suanliaoDataInfo || !suanliaoCadsInfo) {
      return;
    }
    const result = await openSelectZuofaDialog(this.dialog, {
      data: {
        key: "算料数据",
        fenlei: suanliaoDataInfo.fenleiName
      }
    });
    const itemData = result?.items[0] as SelectZuofaItemData<算料数据>;
    if (!itemData.工艺做法 || !itemData.data) {
      return;
    }
    const key1 = suanliaoCadsInfo.key1;
    const [包边方向, 开启] = key1.split("+");
    const suanliaoDataParams: SuanliaoDataParams = {
      选项: {
        型号: itemData.型号,
        产品分类: itemData.产品分类,
        工艺做法: itemData.工艺做法,
        包边方向,
        开启,
        门铰锁边铰边: itemData.data.名字
      }
    };
    const suanliaoDataParams2 = this.suanliaoDataParams() || undefined;
    for (const cad of itemData.data[key1].算料CAD) {
      const zhankai = cad.json.zhankai?.[0];
      if (!zhankai) {
        continue;
      }
      let zhankaiKey: string | undefined;
      let mubanId: string | undefined;
      const zhankaiKeys = ["neikaimuban", "kailiaomuban"];
      for (const key of zhankaiKeys) {
        if (zhankai[key]) {
          zhankaiKey = key;
          mubanId = zhankai[key];
          break;
        }
      }
      if (!zhankaiKey || !mubanId) {
        continue;
      }
      if (mubanId) {
        const ids = await this.http.mongodbCopy("kailiaocadmuban", mubanId, {extraData: suanliaoDataParams2, force: true}, {silent: true});
        if (ids?.[0]) {
          zhankai[zhankaiKey] = ids[0];
        } else {
          for (const key of zhankaiKeys) {
            delete zhankai[key];
          }
        }
      }
    }

    const data = this.data();
    if (data) {
      data.算料CAD.push(...itemData.data[key1].算料CAD);
      data.算料公式.push(...itemData.data[key1].算料公式);
      this.updateSuanliaoData();
    }
    const suanliaoTables = this.suanliaoTables();
    if (suanliaoTables) {
      this.spinner.show(this.spinner.defaultLoaderId);
      const klkwpzData = await suanliaoTables.getKlkwpzData(suanliaoDataParams);
      const klcsData = await suanliaoTables.getKlcsData(suanliaoDataParams);
      await this.http.mongodbInsertMulti(
        suanliaoTables.klkwpzCollection,
        klkwpzData.map((v) => ({名字: v.名字, 孔位配置: v.孔位配置})),
        {extraData: suanliaoDataParams2},
        {silent: true}
      );
      await this.http.mongodbInsertMulti(
        suanliaoTables.klcsCollection,
        klcsData.map((v) => ({名字: v.名字, 参数: v.参数})),
        {extraData: suanliaoDataParams2},
        {silent: true}
      );
      await suanliaoTables.update();
      this.spinner.hide(this.spinner.defaultLoaderId);
    }
  }

  async validate(alert: boolean) {
    const cadItems = this.cadItems();
    const errors: string[] = [];
    for (const item of cadItems) {
      for (const err of item.validate()) {
        if (!errors.includes(err)) {
          errors.push(err);
        }
      }
    }

    if (alert) {
      await timeout(0);
      const targetY = window.innerHeight / 2;
      const errorElInfos: {el: HTMLElement; y: number; order: number}[] = [];
      this.el.nativeElement.querySelectorAll<HTMLElement>(".error, .name-error").forEach((el) => {
        const {top, bottom} = el.getBoundingClientRect();
        errorElInfos.push({el, y: (top + bottom) / 2, order: Math.abs((top + bottom) / 2 - targetY)});
      });
      errorElInfos.sort((a, b) => a.order - b.order);
      const scrollbar = this.cadsScrollbar();
      if (errorElInfos.length > 0 && scrollbar) {
        const dy = errorElInfos[0].y - targetY;
        if (dy !== 0) {
          scrollbar.scrollTo({top: scrollbar.nativeElement.scrollTop + dy});
        }
      }
      if (errors.length > 0) {
        this.message.error(errors.join("<br>"));
      }
    }
    return errors;
  }
}
