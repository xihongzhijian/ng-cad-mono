import {Component, HostBinding, Inject, OnInit} from "@angular/core";
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
import {getOptionInputInfo, getOptions} from "../lurushuju-index/lurushuju-index.utils";
import {算料数据} from "../xinghao-data";
import {SelectGongyiInput, SelectGongyiItem, SelectGongyiItemData, SelectGongyiOutput} from "./select-gongyi-dialog.types";

@Component({
  selector: "app-select-gongyi-dialog",
  standalone: true,
  imports: [ImageComponent, InputComponent, MatButtonModule, MatCheckboxModule, MatTooltipModule, NgScrollbarModule],
  templateUrl: "./select-gongyi-dialog.component.html",
  styleUrl: "./select-gongyi-dialog.component.scss"
})
export class SelectGongyiDialogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";
  searchForm = {型号: "", 工艺: "", 产品分类: ""};
  searchFormMenjiao = {名字: "", 开启: "", 门铰: "", 门扇厚度: ""};
  displayMenjiaoKeys: (keyof 算料数据)[] = ["开启", "门铰", "门扇厚度"];
  inputInfos: InputInfo<typeof this.searchForm>[] = [];
  inputInfosMenjiao: InputInfo<typeof this.searchFormMenjiao>[] = [];
  items: SelectGongyiItem[] = [];

  constructor(
    private http: CadDataService,
    private message: MessageService,
    public dialogRef: MatDialogRef<SelectGongyiDialogComponent, SelectGongyiOutput>,
    @Inject(MAT_DIALOG_DATA) public data?: SelectGongyiInput
  ) {}

  ngOnInit(): void {
    this.updateInputInfos();
  }

  async submit() {
    const items = this.items.filter((item) => item.selected).map((item) => item.data);
    if (items.length < 1) {
      this.message.alert("请先选择一项");
      return;
    }
    this.dialogRef.close({items});
  }

  cancel() {
    this.dialogRef.close();
  }

  updateInputInfos() {
    const {xinghaos, xinghaoOptions: options, menjiaoOptions, fenlei} = this.data || {};
    const data = this.searchForm;
    const xinghaoOptions = (xinghaos || []).map<InputInfoOption>(({mingzi, tupian}) => ({value: mingzi, img: tupian}));
    this.inputInfos = [
      {
        type: "select",
        label: "型号",
        clearable: true,
        model: {key: "型号", data},
        options: xinghaoOptions,
        optionsDialog: {
          onChange: () => {
            this.searchForm.工艺 = "";
          }
        }
      },
      {
        type: "select",
        label: "工艺",
        clearable: true,
        model: {key: "工艺", data},
        options: getOptions(options, "工艺"),
        onChange: () => {
          this.searchForm.型号 = "";
        }
      },
      {
        type: "select",
        label: "产品分类",
        clearable: true,
        model: {key: "产品分类", data},
        options: getOptions(options, "产品分类"),
        hidden: !!fenlei
      }
    ];
    if (menjiaoOptions) {
      const data2 = this.searchFormMenjiao;
      const getOptionInputInfo2 = (key: keyof typeof data2) => {
        return getOptionInputInfo(menjiaoOptions, key, (info) => {
          info.model = {key, data: data2};
          info.disabled = false;
          info.multiple = false;
          info.clearable = true;
        });
      };
      this.inputInfosMenjiao = [
        {type: "string", label: "名字", clearable: true, model: {key: "名字", data: data2}},
        getOptionInputInfo2("开启"),
        getOptionInputInfo2("门铰"),
        getOptionInputInfo2("门扇厚度")
      ];
    } else {
      this.inputInfosMenjiao = [];
    }
  }

  async search() {
    const {excludeXinghaos, excludeGongyis, key, menjiaoOptions, fenlei} = this.data || {};
    const keys = ["名字", "图片"];
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
    const params: ObjectOf<any> = {...this.searchForm, compact: {keys}, excludeXinghaos, excludeGongyis};
    if (fenlei) {
      params.产品分类 = fenlei;
    }
    const items = await this.http.getData<SelectGongyiItemData[]>("shuju/api/getGongyis", params);
    this.items = [];
    for (const item of items || []) {
      if (key && menjiaoOptions) {
        const items2 = (item as any)[key];
        if (Array.isArray(items2)) {
          for (const item2 of items2) {
            let isMatched = true;
            for (const menjiaoKey of keysOf(this.searchFormMenjiao)) {
              const val1 = (item2 as any)[menjiaoKey];
              const val2 = this.searchFormMenjiao[menjiaoKey];
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
            this.items.push({data: {型号: item.型号, 产品分类: item.产品分类, 工艺做法: item.名字, 名字: item2.名字, data: item2}});
          }
        }
      } else {
        const item2: SelectGongyiItem = {data: item};
        if (key === "算料CAD") {
          const 算料CAD = item.算料CAD;
          const count = Array.isArray(算料CAD) ? 算料CAD.length : 0;
          if (count > 0) {
            item2.info = [`算料CAD数量：${count}`];
            this.items.push(item2);
          }
        } else {
          this.items.push(item2);
        }
      }
    }
  }

  getFilepathUrl(url: string | undefined) {
    return getFilepathUrl(url);
  }

  clickItem(i: number) {
    if (this.data?.multiple) {
      const item = this.items[i];
      item.selected = !item.selected;
    } else {
      for (const [j, item] of this.items.entries()) {
        if (i === j) {
          item.selected = !item.selected;
        } else {
          item.selected = false;
        }
      }
    }
  }
}

export const openSelectGongyiDialog = getOpenDialogFunc<SelectGongyiDialogComponent, SelectGongyiInput, SelectGongyiOutput>(
  SelectGongyiDialogComponent,
  {width: "calc(100vw - 20px)", height: "calc(100vh - 10px)", disableClose: true}
);
