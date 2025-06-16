import {Component, computed, HostBinding, inject, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatTooltipModule} from "@angular/material/tooltip";
import {getFilepathUrl} from "@app/app.common";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {keysOf, ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getOptions} from "../lrsj-pieces/lrsj-pieces.utils";
import {LrsjStatusService} from "../services/lrsj-status.service";
import {getOptionsAll2InputInfo} from "../services/lrsj-status.utils";
import {算料数据} from "../xinghao-data";
import {SelectZuofaInput, SelectZuofaItem, SelectZuofaItemData, SelectZuofaOutput} from "./select-zuofa-dialog.types";

@Component({
  selector: "app-select-zuofa-dialog",
  imports: [ImageComponent, InputComponent, MatButtonModule, MatCheckboxModule, MatTooltipModule, NgScrollbarModule],
  templateUrl: "./select-zuofa-dialog.component.html",
  styleUrl: "./select-zuofa-dialog.component.scss"
})
export class SelectZuofaDialogComponent {
  dialogRef = inject<MatDialogRef<SelectZuofaDialogComponent, SelectZuofaOutput>>(MatDialogRef);
  data = inject<SelectZuofaInput>(MAT_DIALOG_DATA, {optional: true});

  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  menjiaoOptions = this.lrsjStatus.menjiaoOptionsManager.data;

  searchForm = signal({型号: "", 工艺: "", 产品分类: ""});
  searchFormMenjiao = signal({名字: "", 开启: "", 门铰: "", 门扇厚度: ""});
  displayMenjiaoKeys: (keyof 算料数据)[] = ["开启", "门铰", "门扇厚度"];
  inputInfos = computed<InputInfo[]>(() => {
    const xinghaoMenchuangs = this.lrsjStatus.xinghaoMenchuangs();
    const {fenlei} = this.data || {};
    const options = this.lrsjStatus.xinghaoOptionsManager.data();
    const data = this.searchForm();
    const xinghaoOptions: InputInfoOption<string>[] = [];
    for (const menchuang of xinghaoMenchuangs.items) {
      for (const gongyi of menchuang.gongyis?.items || []) {
        for (const xinghao of gongyi.xinghaos?.items || []) {
          xinghaoOptions.push({value: xinghao.mingzi, img: xinghao.tupian});
        }
      }
    }
    return [
      {
        type: "select",
        label: "型号",
        clearable: true,
        multiple: false,
        value: data.型号,
        options: xinghaoOptions,
        optionsDialog: {
          onChange: (val) => {
            this.searchForm.update((v) => ({...v, 型号: val.options[0].mingzi}));
          }
        }
      },
      {
        type: "select",
        label: "产品分类",
        clearable: true,
        multiple: false,
        value: data.产品分类,
        onChange: (val) => {
          this.searchForm.update((v) => ({...v, 产品分类: val}));
        },
        options: getOptions(options, "产品分类"),
        hidden: !!fenlei
      }
    ];
  });
  inputInfosMenjiao = computed<InputInfo[]>(() => {
    const menjiaoOptions = this.lrsjStatus.menjiaoOptionsManager.data();
    const data2 = this.searchFormMenjiao();
    const getOptionInputInfo2 = (key: keyof typeof data2) => {
      return getOptionsAll2InputInfo(menjiaoOptions, key, (info) => {
        info.value = data2[key];
        info.onChange = (val: string) => {
          this.searchFormMenjiao.update((v) => ({...v, [key]: val}));
        };
        info.disabled = false;
        info.clearable = true;
        if (info.type === "select") {
          info.multiple = false;
        }
      });
    };
    return [
      {type: "string", label: "名字", clearable: true, model: {key: "名字", data: data2}},
      getOptionInputInfo2("开启"),
      getOptionInputInfo2("门铰"),
      getOptionInputInfo2("门扇厚度")
    ];
  });

  items = signal<SelectZuofaItem[]>([]);
  async search() {
    const {excludeXinghaos, excludeZuofas, key, fenlei} = this.data || {};
    const keys = ["名字", "图片"];
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
    const params: ObjectOf<any> = {...this.searchForm(), compact: {keys}, excludeXinghaos, excludeGongyis: excludeZuofas};
    if (fenlei) {
      params.产品分类 = fenlei;
    }
    const menjiaoOptions = await this.lrsjStatus.menjiaoOptionsManager.fetch();
    const items0 = await this.http.getData<SelectZuofaItemData[]>("shuju/api/getGongyis", params);
    const items: SelectZuofaItem[] = [];
    const searchFormMenjiao = this.searchFormMenjiao();
    for (const item of items0 || []) {
      if (key && menjiaoOptions) {
        const items2 = (item as any)[key];
        if (Array.isArray(items2)) {
          for (const item2 of items2) {
            let isMatched = true;
            for (const menjiaoKey of keysOf(searchFormMenjiao)) {
              const val1 = item2[menjiaoKey];
              const val2 = searchFormMenjiao[menjiaoKey];
              if (!val2) {
                continue;
              }
              if (Array.isArray(val1) && val1.includes(val2)) {
                continue;
              } else if (typeof val1 === "string" && val1.includes(val2)) {
                continue;
              } else {
                isMatched = false;
                break;
              }
            }
            if (!isMatched) {
              continue;
            }
            items.push({data: {型号: item.型号, 产品分类: item.产品分类, 工艺做法: item.名字, 名字: item2.名字, data: item2}});
          }
        }
      } else {
        items.push({data: item});
      }
    }
    this.items.set(items);
  }
  async submit() {
    const items = this.items()
      .filter((item) => item.selected)
      .map((item) => item.data);
    if (items.length < 1) {
      this.message.alert("请先选择一项");
      return;
    }
    this.dialogRef.close({items});
  }
  cancel() {
    this.dialogRef.close();
  }

  getFilepathUrl(url: string | undefined) {
    return getFilepathUrl(url);
  }

  clickItem(i: number) {
    const items = this.items().slice();
    if (this.data?.multiple) {
      const item = items[i];
      item.selected = !item.selected;
    } else {
      for (const [j, item] of items.entries()) {
        if (i === j) {
          item.selected = !item.selected;
        } else {
          item.selected = false;
        }
      }
    }
    this.items.set(items);
  }
}

export const openSelectZuofaDialog = getOpenDialogFunc<SelectZuofaDialogComponent, SelectZuofaInput, SelectZuofaOutput>(
  SelectZuofaDialogComponent,
  {width: "calc(100vw - 20px)", height: "calc(100vh - 10px)", disableClose: true}
);
