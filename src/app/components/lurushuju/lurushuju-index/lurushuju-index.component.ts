import {ChangeDetectionStrategy, Component, computed, HostBinding, inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatMenuModule} from "@angular/material/menu";
import {setGlobal} from "@app/app.common";
import {getBooleanStr} from "@app/utils/get-value";
import {AboutComponent} from "@components/about/about.component";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianInput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {environment} from "@env";
import {getFileSize, ObjectOf} from "@lucilor/utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {LrsjSuanliaoCadsComponent} from "../lrsj-pieces/lrsj-suanliao-cads/lrsj-suanliao-cads.component";
import {LrsjSuanliaoDataComponent} from "../lrsj-pieces/lrsj-suanliao-data/lrsj-suanliao-data.component";
import {LrsjXinghaosComponent} from "../lrsj-pieces/lrsj-xinghaos/lrsj-xinghaos.component";
import {LrsjZuofasComponent} from "../lrsj-pieces/lrsj-zuofas/lrsj-zuofas.component";
import {LurushujuNavComponent} from "../lurushuju-nav/lurushuju-nav.component";
import {LrsjStatusService} from "../services/lrsj-status.service";
import {openTongyongshujuDialog} from "../tongyongshuju-dialog/tongyongshuju-dialog.component";
import {ToolbarBtn} from "./lurushuju-index.types";

@Component({
  selector: "app-lurushuju-index",
  imports: [
    AboutComponent,
    ClickStopPropagationDirective,
    FloatingDialogModule,
    LrsjSuanliaoCadsComponent,
    LrsjSuanliaoDataComponent,
    LrsjXinghaosComponent,
    LrsjZuofasComponent,
    LurushujuNavComponent,
    MatButtonModule,
    MatCheckboxModule,
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

  xinghaoSizeText = computed(() => {
    const size = this.lrsjStatus.xinghaoSize();
    const sizeStr = getFileSize(size, {outputUnit: "MB"});
    return size >= 0 ? `数据大小: ${sizeStr}` : "";
  });
  toolbarBtns = computed<ToolbarBtn[]>(() => {
    const xinghao = this.lrsjStatus.xinghao();
    const pieceInfos = this.lrsjStatus.pieceInfos();
    const xinghaoSizeText = this.xinghaoSizeText();
    const xinghaoSizeClass = this.lrsjStatus.isXinghaoSizeExceeded() ? ["error"] : [];
    return [
      {name: "添加"},
      {name: "编辑", accent: this.lrsjStatus.editMode()},
      {name: "复制做法", hidden: !pieceInfos.zuofas.show},
      {name: "返回", style: {display: this.lrsjStatus.canGoBack() ? "" : "none"}},
      {name: ""},
      {name: "通用数据"},
      {name: "通用公式"},
      {name: ""},
      {name: "配件库"},
      {name: "模块库"},
      {name: "从其他做法复制", hidden: !pieceInfos.suanliaoCads.show},
      {name: ""},
      {name: "型号专用公式", hidden: !xinghao},
      {name: "型号专用CAD", hidden: !xinghao},
      {name: "", class: ["flex-110"]},
      {name: environment.beta ? "测试版" : "正式版", type: "text"},
      {name: xinghaoSizeText, type: "text", class: xinghaoSizeClass, hidden: !xinghaoSizeText}
    ];
  });
  async onToolbarBtnClick(btn: ToolbarBtn) {
    const pieceInfos = this.lrsjStatus.pieceInfos();
    switch (btn.name) {
      case "添加":
        break;
      case "编辑":
        this.lrsjStatus.editMode.update((v) => !v);
        return;
      case "复制做法":
        await this.lrsjZuofas()?.copyZuofaFromOthers();
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
      case "配件库":
        if (pieceInfos.suanliaoCads.show) {
          this.lrsjSuanliaoCads()?.selectSuanliaoCads();
        } else {
          this.openZxpj(false);
        }
        return;
      case "模块库":
        {
          const app = (window.top as any)?.app;
          if (app) {
            app.openTabToNext("模块库");
          } else {
            this.status.openInNewTab(["/布局模块"], {queryParams: {page: "模块库"}});
          }
        }
        return;
      case "从其他做法复制":
        await this.lrsjSuanliaoCads()?.copyCadsFromOthers();
        return;
      case "型号专用公式":
        await this.xinghaoZhuanyongGongshi();
        return;
      case "型号专用CAD":
        this.openZxpj(true);
        return;
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
      lingsanOptions: isXinghao && xinghao ? {getAll: true, useTypePrefix: true, xinghao} : {getAll: true}
    };
    await openZixuanpeijianDialog(this.dialog, {data});
  }
  async xinghaoZhuanyongGongshi() {
    const xinghaoName = this.lrsjStatus.xinghao()?.名字;
    if (!xinghaoName) {
      return;
    }
    const search2 = {分类: "型号专用公式", "选项.型号": xinghaoName};
    const extraData = {分类: "型号专用公式", 选项: {型号: xinghaoName}};
    const url = await this.http.getShortUrl("算料公式", {search2, extraData});
    if (url) {
      window.open(url);
    }
  }

  moreBtns = computed(() => {
    const btns: {name: string; onClick: () => void}[] = [
      {name: "复制页面信息", onClick: this.copyInfo.bind(this)},
      {name: "粘贴页面信息", onClick: this.pasteInfo.bind(this)},
      {
        name: "重新生成所有cad图片",
        onClick: () => {
          this.status.openInNewTab(["/refresh-cad-imgs"]);
        }
      }
    ];
    if (!environment.production) {
      const toggleforceUpdateCadImgBtnName = () => `强制刷新CAD图片(${getBooleanStr(this.status.forceUpdateCadImg)})`;
      const toggleforceUpdateCadImgBtn: (typeof btns)[number] = {
        name: toggleforceUpdateCadImgBtnName(),
        onClick: () => {
          this.status.forceUpdateCadImg = !this.status.forceUpdateCadImg;
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

  aboutComponent = viewChild(AboutComponent);
  showChangelog() {
    this.aboutComponent()?.showChangelog();
  }
}
