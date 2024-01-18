import {Component, HostBinding, Inject, OnInit} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {getFilepathUrl} from "@app/app.common";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbarModule} from "ngx-scrollbar";
import {getOptions} from "../lurushuju-index/lurushuju-index.utils";
import {SelectGongyiInput, SelectGongyiItem, SelectGongyiItemData, SelectGongyiOutput} from "./select-gongyi-dialog.types";

@Component({
  selector: "app-select-gongyi-dialog",
  standalone: true,
  imports: [ImageComponent, InputComponent, MatButtonModule, MatCheckboxModule, NgScrollbarModule],
  templateUrl: "./select-gongyi-dialog.component.html",
  styleUrl: "./select-gongyi-dialog.component.scss"
})
export class SelectGongyiDialogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";
  searchForm = {型号: "", 工艺: "", 产品分类: ""};
  inputInfos: InputInfo<typeof this.searchForm>[] = [];
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
    const options = this.data?.options || {};
    const data = this.searchForm;
    this.inputInfos = [
      {type: "string", label: "型号", clearable: true, model: {key: "型号", data}},
      {type: "select", label: "工艺", clearable: true, model: {key: "工艺", data}, options: getOptions(options, "工艺")},
      {type: "select", label: "产品分类", clearable: true, model: {key: "产品分类", data}, options: getOptions(options, "产品分类")}
    ];
  }

  async search() {
    const {excludeXinghaos} = this.data || {};
    const params = {...this.searchForm, compact: true, excludeXinghaos};
    const items = await this.http.getData<SelectGongyiItemData[]>("shuju/api/getGongyis", params);
    this.items = (items || []).map((data) => ({data}));
  }

  getFilepathUrl(url: string) {
    return getFilepathUrl(url);
  }

  clickItem(i: number) {
    for (const [j, item] of this.items.entries()) {
      if (i === j) {
        item.selected = !item.selected;
      } else {
        item.selected = false;
      }
    }
  }
}

export const openSelectGongyiDialog = getOpenDialogFunc<SelectGongyiDialogComponent, SelectGongyiInput, SelectGongyiOutput>(
  SelectGongyiDialogComponent,
  {width: "calc(100vw - 20px)", height: "calc(100vh - 10px)", disableClose: true}
);
