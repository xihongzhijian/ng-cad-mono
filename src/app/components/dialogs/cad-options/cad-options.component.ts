import {NgFor, NgIf} from "@angular/common";
import {AfterViewInit, Component, forwardRef, Inject, ViewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxChange, MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl} from "@app/app.common";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, queryString} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetOptionsParams, OptionsData, OptionsDataData, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {NgScrollbar} from "ngx-scrollbar";
import {lastValueFrom} from "rxjs";
import {ImageComponent} from "../../../modules/image/components/image/image.component";
import {InputComponent} from "../../../modules/input/components/input.component";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-options",
  templateUrl: "./cad-options.component.html",
  styleUrls: ["./cad-options.component.scss"],
  standalone: true,
  imports: [
    forwardRef(() => InputComponent),
    NgIf,
    MatButtonModule,
    NgScrollbar,
    SpinnerComponent,
    NgFor,
    MatTooltipModule,
    MatCheckboxModule,
    ImageComponent,
    MatPaginatorModule,
    MatDialogActions
  ]
})
export class CadOptionsComponent implements AfterViewInit {
  pageData: (OptionsData["data"][number] & {checked: boolean})[] = [];
  searchValue = "";
  length = 100;
  pageSizeOptions = [50, 100, 200, 500];
  pageSize = 50;
  checkedIdsCurr = new Set<number>();
  checkedIdsOthers = new Set<number>();
  loaderIds = {optionsLoader: "cadOptions", submitLoaderId: "cadOptionsSubmit"};
  searchInputInfo: InputInfo<this> = {
    label: "搜索",
    type: "string",
    autoFocus: true,
    model: {data: this, key: "searchValue"},
    onChange: () => {
      this.search();
    }
  };
  filePathUrl = filePathUrl;
  @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;
  constructor(
    public dialogRef: MatDialogRef<CadOptionsComponent, CadOptionsOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadOptionsInput,
    private dataService: CadDataService,
    private spinner: SpinnerService
  ) {
    this.data.multi = this.data.multi !== false;
  }

  async ngAfterViewInit() {
    if (!this.paginator) {
      return;
    }
    await lastValueFrom(this.paginator.initialized);
    this.getData(1);
  }

  async submit() {
    const data = await this.getOptions(
      {
        name: this.data.name,
        data: this.data.data,
        xinghao: this.data.xinghao,
        includeTingyong: true,
        values: Array.from(this.checkedIdsCurr).concat(Array.from(this.checkedIdsOthers)) as any,
        fields: ["vid"]
      },
      [this.loaderIds.submitLoaderId]
    );
    if (!data) {
      return;
    }
    this.dialogRef.close(data.data.map((v) => ({vid: v.vid, mingzi: v.name})));
  }

  close() {
    this.dialogRef.close();
  }

  searchKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.search();
    }
  }

  search() {
    if (!this.paginator) {
      return;
    }
    this.paginator.pageIndex = 0;
    this.getData(this.paginator.pageIndex + 1);
  }

  changePage(event: PageEvent) {
    this.getData(event.pageIndex + 1);
  }

  async getOptions(params: GetOptionsParams, loader: Parameters<typeof this.spinner.show>) {
    let data: OptionsData | null;
    if (Array.isArray(this.data.options)) {
      const field = (params.fields?.[0] || "name") as keyof OptionsDataData;
      const options = this.data.options.filter((v) => {
        if (params.values && !params.values.includes(v[field])) {
          return false;
        }
        return queryString(this.searchValue, v.name);
      });
      data = {data: options, count: options.length};
    } else {
      this.spinner.show(...loader);
      data = await this.dataService.getOptions(params);
      this.spinner.hide(loader[0]);
    }
    return data;
  }

  async getData(page: number) {
    const {checkedIdsCurr, checkedIdsOthers, pageData} = this;
    checkedIdsCurr.clear();
    for (const {vid, checked} of pageData) {
      if (checked) {
        checkedIdsOthers.add(vid);
      }
    }
    const data = (await this.getOptions(
      {
        name: this.data.name,
        search: this.searchValue,
        page,
        limit: this.paginator?.pageSize,
        data: this.data.data,
        xinghao: this.data.xinghao,
        filter: this.data.filter,
        fields: this.data.fields
      },
      [this.loaderIds.optionsLoader, {text: "获取CAD数据"}]
    )) || {data: [], count: 0};
    this.length = data.count;
    this.pageData = data.data.map((v) => {
      let checked = false;
      if (this.data.checkedItems?.includes(v.name)) {
        checked = true;
      } else if (this.data.checkedVids?.includes(v.vid)) {
        checked = true;
      }
      if (checked) {
        checkedIdsCurr.add(v.vid);
        checkedIdsOthers.delete(v.vid);
      }
      return {...v, checked};
    });
    return data;
  }

  onCheckboxChange(item: CadOptionsComponent["pageData"][number], event?: MatCheckboxChange) {
    const {multi} = this.data;
    if (!multi) {
      this.pageData.forEach((v) => (v.checked = false));
    }
    if (event) {
      item.checked = event.checked;
    } else {
      item.checked = !item.checked;
    }
    const {checkedIdsCurr} = this;
    if (item.checked) {
      if (!multi) {
        checkedIdsCurr.clear();
      }
      checkedIdsCurr.add(item.vid);
    } else {
      checkedIdsCurr.delete(item.vid);
    }
  }

  selectAll() {
    for (const item of this.pageData) {
      if (!item.checked) {
        this.onCheckboxChange(item);
      }
    }
  }

  selectReverse() {
    for (const item of this.pageData) {
      this.onCheckboxChange(item);
    }
  }
}

export const openCadOptionsDialog = getOpenDialogFunc<CadOptionsComponent, CadOptionsInput, CadOptionsOutput>(CadOptionsComponent, {
  width: "80vw",
  height: "80vh"
});

export interface CadOptionsInput {
  data?: CadData;
  name: string;
  checkedItems?: string[];
  checkedVids?: number[];
  multi?: boolean;
  xinghao?: string;
  filter?: ObjectOf<any>;
  fields?: string[];
  options?: OptionsDataData[];
}

export type CadOptionsOutput = TableDataBase[];
