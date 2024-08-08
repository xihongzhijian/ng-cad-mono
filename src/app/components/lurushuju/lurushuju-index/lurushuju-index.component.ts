import {ChangeDetectionStrategy, Component, computed, HostBinding, inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatMenuModule} from "@angular/material/menu";
import {getBooleanStr, getCopyName, setGlobal} from "@app/app.common";
import {AboutComponent} from "@app/components/about/about.component";
import {openZixuanpeijianDialog} from "@app/components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@app/components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {FloatingDialogModule} from "@app/modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {MessageService} from "@app/modules/message/services/message.service";
import {AppStatusService} from "@app/services/app-status.service";
import {environment} from "@env";
import {ObjectOf} from "@lucilor/utils";
import {NgScrollbarModule} from "ngx-scrollbar";
import {LrsjSuanliaoCadsComponent} from "../lrsj-pieces/lrsj-suanliao-cads/lrsj-suanliao-cads.component";
import {LrsjSuanliaoDataComponent} from "../lrsj-pieces/lrsj-suanliao-data/lrsj-suanliao-data.component";
import {LrsjXinghaosComponent} from "../lrsj-pieces/lrsj-xinghaos/lrsj-xinghaos.component";
import {LrsjZuofasComponent} from "../lrsj-pieces/lrsj-zuofas/lrsj-zuofas.component";
import {LurushujuNavComponent} from "../lurushuju-nav/lurushuju-nav.component";
import {openSelectZuofaDialog} from "../select-zuofa-dialog/select-zuofa-dialog.component";
import {LrsjStatusService} from "../services/lrsj-status.service";
import {openTongyongshujuDialog} from "../tongyongshuju-dialog/tongyongshuju-dialog.component";
import {ToolbarBtn} from "./lurushuju-index.types";

@Component({
  selector: "app-lurushuju-index",
  standalone: true,
  imports: [
    AboutComponent,
    FloatingDialogModule,
    ImageComponent,
    LrsjSuanliaoCadsComponent,
    LrsjSuanliaoDataComponent,
    LrsjXinghaosComponent,
    LrsjZuofasComponent,
    LurushujuNavComponent,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    NgScrollbarModule
  ],
  templateUrl: "./lurushuju-index.component.html",
  styleUrl: "./lurushuju-index.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LurushujuIndexComponent {
  private dialog = inject(MatDialog);
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = ["ng-page"];

  pieceInfos = this.lrsjStatus.pieceInfos;

  lrsjXinghaos = viewChild(LrsjXinghaosComponent);
  lrsjZuofas = viewChild(LrsjZuofasComponent);
  lrsjSuanliaoData = viewChild(LrsjSuanliaoDataComponent);
  lrsjSuanliaoCads = viewChild(LrsjSuanliaoCadsComponent);

  constructor() {
    setGlobal("lrsj", this);
  }

  toolbarBtns = computed<ToolbarBtn[]>(() => {
    return [
      {name: "关闭", color: "primary"},
      {name: ""},
      {name: "添加", color: "primary"},
      {name: "编辑", color: this.lrsjStatus.editMode() ? "accent" : "primary"},
      {name: "复制做法", color: "primary", style: {display: this.lrsjStatus.xinghao() ? "" : "none"}},
      {name: "返回", color: "primary", style: {display: this.lrsjStatus.canGoBack() ? "" : "none"}},
      {name: ""},
      {name: "通用数据", color: "primary"},
      {name: "通用公式", color: "primary"},
      {name: "示意图", color: "primary"},
      {name: ""},
      {name: "配件库", color: "primary"},
      {name: "模块库", color: "primary"},
      {name: "", class: ["flex-110"]},
      {name: "测试", color: "primary"}
    ];
  });
  async onToolbarBtnClick(btn: ToolbarBtn) {
    switch (btn.name) {
      case "关闭":
        break;
      case "添加":
        break;
      case "编辑":
        this.lrsjStatus.editMode.update((v) => !v);
        return;
      case "复制做法":
        await this.copyZuofa();
        return;
      case "返回":
        this.lrsjStatus.goBack();
        return;
      case "通用数据":
        await openTongyongshujuDialog(this.dialog, {data: {}});
        return;
      case "通用公式":
        {
          const where = {分类: "型号通用公式"};
          const url = await this.http.getShortUrl("算料公式", {search2: where, extraData: where, forceInsert: true});
          if (url) {
            window.open(url);
          }
        }
        return;
      case "示意图":
        break;
      case "配件库":
        await this.openZxpj(false);
        return;
      case "模块库":
        break;
      case "测试":
        break;
    }
    await this.message.alert("?");
  }
  async openZxpj(isXinghao: boolean) {
    const xinghao = this.lrsjStatus.xinghao()?.名字;
    const data: ZixuanpeijianInput = {
      step: 3,
      stepFixed: true,
      noValidateCads: true,
      readonly: true,
      lingsanOptions: isXinghao && xinghao ? {getAll: true, typePrefix: true, xinghao} : {getAll: true}
    };
    await openZixuanpeijianDialog(this.dialog, {data});
  }
  async copyZuofa() {
    const xinghao = this.lrsjStatus.xinghao();
    if (!xinghao) {
      return;
    }
    const xinghaoOptions = await this.lrsjStatus.getXinghaoOptions();
    const result = await openSelectZuofaDialog(this.dialog, {
      data: {xinghaoOptions, multiple: true}
    });
    if (!result) {
      return;
    }
    const targetFenlei = await this.message.prompt<string>({
      type: "select",
      label: "复制到哪个分类",
      options: xinghao.显示产品分类,
      hint: "若留空则复制到对应分类"
    });
    if (typeof targetFenlei !== "string") {
      return;
    }
    let successCount = 0;
    const 型号2 = xinghao.名字;
    const gongyiNames: ObjectOf<string[]> = {};
    for (const item of result.items) {
      const {型号, 产品分类, 名字} = item;
      const 产品分类2 = targetFenlei || 产品分类;
      if (!gongyiNames[产品分类2]) {
        gongyiNames[产品分类2] = xinghao.产品分类[产品分类2].map((v) => v.名字);
      }
      const 复制名字 = getCopyName(gongyiNames[产品分类2], item.名字);
      const success = await this.http.getData<boolean>("shuju/api/copyGongyi", {名字, 复制名字, 型号, 型号2, 产品分类, 产品分类2});
      if (success) {
        gongyiNames[产品分类2].push(复制名字);
        successCount++;
      }
    }
    if (successCount > 0) {
      const xinghao2 = await this.lrsjStatus.refreshXinghao(true);
      const data = xinghao2?.产品分类[targetFenlei]?.at(-1);
      if (data) {
        // TODO
        // for (const menjiaoData of data.算料数据) {
        //   updateMenjiaoData(menjiaoData);
        // }
        await this.lrsjStatus.submitZuofa(targetFenlei, data, ["算料数据"]);
      }
    }
  }

  moreBtns = computed(() => {
    const btns: {name: string; onClick: () => void}[] = [
      {name: "复制页面信息", onClick: this.copyInfo.bind(this)},
      {name: "粘贴页面信息", onClick: this.pasteInfo.bind(this)},
      {
        name: "重新生成所有cad图片",
        onClick: () => this.status.openInNewTab(["/refresh-cad-imgs"])
      }
    ];
    if (!environment.production) {
      const toggleforceUpdateCadImgBtnName = () => `强制刷新CAD图片(${getBooleanStr(this.status.forceUpdateCadImg2)})`;
      const toggleforceUpdateCadImgBtn: (typeof btns)[number] = {
        name: toggleforceUpdateCadImgBtnName(),
        onClick: () => {
          this.status.forceUpdateCadImg2 = !this.status.forceUpdateCadImg2;
          toggleforceUpdateCadImgBtn.name = toggleforceUpdateCadImgBtnName();
        }
      };
      btns.push(toggleforceUpdateCadImgBtn);
    }
    return btns;
  });

  copyInfo() {
    const info = this.lrsjStatus.info();
    const text = Object.entries(info)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    this.message.copyText(text);
  }
  async pasteInfo(text?: string) {
    if (!text) {
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        console.error(e);
      }
    }
    if (text) {
      const info = text.split("\n").reduce<ObjectOf<string>>((acc, line) => {
        const [k, v] = line.split(": ");
        if (k && typeof v === "string") {
          acc[k] = v.replace(/\r/g, "");
        }
        return acc;
      }, {});
      await this.lrsjStatus.setInfo(info);
    }
  }
}
