import {ChangeDetectionStrategy, Component, computed, effect, HostBinding, inject, output, signal, viewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {filePathUrl, getBooleanStr, getCopyName, getFilepathUrl} from "@app/app.common";
import {FloatingDialogModule} from "@app/modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {InputInfo} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {ObjectOf} from "packages/utils/lib";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {getZuofa, sortZuofas, XinghaoRaw, 工艺做法} from "../../xinghao-data";
import {LrsjPiece, LrsjPieceInfo} from "../lrsj-piece";
import {LrsjZuofaComponent} from "../lrsj-zuofa/lrsj-zuofa.component";
import {ZuofaInfo} from "./lrsj-zuofas.types";

@Component({
  selector: "app-lrsj-zuofas",
  standalone: true,
  imports: [FloatingDialogModule, ImageComponent, LrsjZuofaComponent, MatButtonModule, MatDividerModule, MatIconModule, NgScrollbarModule],
  templateUrl: "./lrsj-zuofas.component.html",
  styleUrl: "./lrsj-zuofas.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LrsjZuofasComponent extends LrsjPiece {
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);

  @HostBinding("class.hidden") hidden = false;

  xinghao = this.lrsjStatus.xinghao;
  editMode = this.lrsjStatus.editMode;
  saveInfo = output();

  menchuangName = computed(() => this.lrsjStatus.xinghaoMenchuangs.item()?.mingzi);
  gongyiName = computed(() => this.lrsjStatus.xinghaoMenchuangs.item()?.gongyis?.item()?.mingzi);
  zuofaInfos = signal<ZuofaInfo[]>([]);

  scrollbar = viewChild.required<NgScrollbar>("scrollbar");

  constructor() {
    super();
    effect(() => {
      const xinghao = this.xinghao();
      this.hidden = !xinghao;
      this.isReadyForInfo.next(!!xinghao);
    });
  }

  getInfo() {
    const obj: ObjectOf<string[]> = {};
    for (const info of this.zuofaInfos()) {
      const {fenlei, zuofa} = info;
      if (!obj[fenlei]) {
        obj[fenlei] = [];
      }
      obj[fenlei].push(zuofa.名字);
    }
    return {
      工艺做法: this.zuofaInfos()
        .map(({fenlei, zuofa}) => `${fenlei}:${zuofa.名字}`)
        .join(";")
    };
  }
  async setInfo(info: LrsjPieceInfo) {
    const {工艺做法} = info;
    if (typeof 工艺做法 !== "string") {
      return;
    }
    for (const str of 工艺做法.split(";")) {
      const [fenlei, zuofaName] = str.split(":");
      await this.openZuofa(fenlei, zuofaName);
    }
  }

  exitXinghao() {
    this.lrsjStatus.updateXinghao(null);
    this.emitSaveInfo();
  }

  getFilepathUrl(url: string) {
    return getFilepathUrl(url);
  }
  getBooleanStr(value: boolean) {
    return getBooleanStr(value);
  }

  async addZuofa(产品分类: string) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const names = xinghao.产品分类[产品分类].map((gongyi) => gongyi.名字);
    const 名字 = await this.message.prompt({
      type: "string",
      label: "",
      validators: (control) => {
        const value = control.value;
        if (!value) {
          return {"请输入工艺做法名字，下单时需要选择": true};
        }
        if (names.includes(value)) {
          return {名字已存在: true};
        }
        return null;
      }
    });
    if (!名字) {
      return;
    }
    const 型号 = xinghao.名字;
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/addGongyi", {名字, 型号, 产品分类});
    await this.lrsjStatus.updateXinghaoFenlei(xinghaoRaw?.产品分类);
    this.openZuofa(产品分类, 名字);
  }
  async removeZuofa(产品分类: string, 名字: string) {
    const xinghao = this.xinghao();
    if (!xinghao || !(await this.message.confirm("确定删除选中的工艺做法吗？"))) {
      return;
    }
    const 型号 = xinghao.名字;
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/removeGongyi", {名字, 型号, 产品分类});
    await this.lrsjStatus.updateXinghaoFenlei(xinghaoRaw?.产品分类);
  }
  async copyZuofa(产品分类: string, 名字: string) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const names = xinghao.产品分类[产品分类].map((gongyi) => gongyi.名字);
    let 复制名字 = await this.message.prompt({
      type: "string",
      label: "复制工艺做法",
      hint: "若留空则自动生成名字",
      validators: (control) => {
        const value = control.value;
        if (names.includes(value)) {
          return {名字已存在: true};
        }
        if (value === 名字) {
          return {不能与原名字相同: true};
        }
        return null;
      }
    });
    if (复制名字 === null) {
      return;
    }
    if (!复制名字) {
      复制名字 = getCopyName(names, 名字);
    }
    const 型号 = xinghao.名字;
    const xinghaoRaw = await this.http.getData<XinghaoRaw>("shuju/api/copyGongyi", {名字, 复制名字, 型号, 产品分类});
    await this.lrsjStatus.updateXinghaoFenlei(xinghaoRaw?.产品分类);
  }
  async editZuofa(产品分类: string, 名字: string) {
    const xinghao = this.xinghao();
    if (!xinghao) {
      return;
    }
    const gongyis = xinghao.产品分类[产品分类];
    const data0 = gongyis.find((gongyi) => gongyi.名字 === 名字);
    if (!data0) {
      return;
    }
    const data = cloneDeep(data0);
    const form: InputInfo<Partial<工艺做法>>[] = [
      {type: "string", label: "名字", model: {data, key: "名字"}, validators: Validators.required},
      {
        type: "image",
        label: "图片",
        value: data.图片,
        prefix: filePathUrl,
        clearable: true,
        onChange: async (val, info) => {
          if (val) {
            const result = await this.http.uploadImage(val);
            if (result?.url) {
              info.value = result.url;
              data.图片 = result.url;
            }
          } else {
            info.value = "";
            data.图片 = "";
          }
        }
      },
      {type: "boolean", label: "停用", model: {data, key: "停用"}},
      {type: "number", label: "排序", model: {data, key: "排序"}},
      {type: "boolean", label: "录入完成", model: {data, key: "录入完成"}},
      {type: "boolean", label: "默认值", model: {data, key: "默认值"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      const updateDatas: ObjectOf<typeof result> = {[名字]: result};
      if (result.默认值) {
        for (const gongyi of gongyis) {
          if (gongyi.名字 !== 名字) {
            gongyi.默认值 = false;
            updateDatas[gongyi.名字] = {默认值: false};
          }
        }
      }
      const 型号 = xinghao.名字;
      const success = await this.http.post<boolean>("shuju/api/editGongyi", {型号, 产品分类, updateDatas});
      if (success) {
        const mingziOld = data0.名字;
        const mingziNew = data.名字;
        if (mingziOld !== mingziNew) {
          const params = {xinghao: 型号, fenlei: 产品分类, mingziOld, mingziNew};
          await this.http.getData("shuju/api/onGongyiNameChange", params);
        }
        const paixu1 = data0.排序;
        const paixu2 = data.排序;
        Object.assign(data0, result);
        if (paixu1 !== paixu2) {
          sortZuofas(gongyis);
          this.lrsjStatus.setXinghao({产品分类: xinghao.产品分类}, true);
        }
      }
    }
  }
  async openZuofa(fenlei: string, zuofaName: string) {
    let zuofa = this.xinghao()?.产品分类[fenlei].find((v) => v.名字 === zuofaName);
    if (!zuofa) {
      return;
    }
    zuofa = getZuofa(zuofa, await this.lrsjStatus.getZuofaOptionsAll());
    const infos = this.zuofaInfos().slice();
    const i = infos.findIndex((v) => v.fenlei === fenlei && v.zuofa.名字 === zuofaName);
    if (i < 0) {
      infos.push({fenlei, zuofa, position: signal({x: 0, y: 0})});
    }
    this.zuofaInfos.set(infos);
    this.saveInfo.emit();
  }
  closeZuofa(i: number) {
    const infos = this.zuofaInfos().filter((_, j) => j !== i);
    this.zuofaInfos.set(infos);
    this.saveInfo.emit();
  }

  scrollToFenlei(i: number) {
    const scrollbar = this.scrollbar();
    const el = scrollbar.viewport.nativeElement.querySelector(`[data-i="${i}"]`);
    if (el) {
      scrollbar.scrollToElement(el);
    }
  }
  scrollToZuofa(i: number, j: number) {
    const scrollbar = this.scrollbar();
    const el = scrollbar.viewport.nativeElement.querySelector(`[data-ij="${i},${j}"]`);
    if (el) {
      scrollbar.scrollToElement(el);
    }
  }
}
