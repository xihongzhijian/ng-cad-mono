import {CommonModule} from "@angular/common";
import {AfterViewInit, Component, HostBinding, Inject, ViewChild} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions, MatTooltipModule} from "@angular/material/tooltip";
import {DomSanitizer} from "@angular/platform-browser";
import {imgCadEmpty} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {CadData} from "@lucilor/cad-viewer";
import {isBetween, isNumber} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetCadParams} from "@modules/http/services/cad-data.service.types";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {difference} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {lastValueFrom} from "rxjs";
import {TypedTemplateDirective} from "../../../modules/directives/typed-template.directive";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {openCadEditorDialog} from "../cad-editor-dialog/cad-editor-dialog.component";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";
import {getOpenDialogFunc} from "../dialog.common";
import {CadListInput, CadListOutput, selectModes} from "./cad-list.types";

export const customTooltipOptions: MatTooltipDefaultOptions = {
  showDelay: 500,
  hideDelay: 0,
  touchendHideDelay: 0,
  position: "above"
};
@Component({
  selector: "app-cad-list",
  templateUrl: "./cad-list.component.html",
  styleUrls: ["./cad-list.component.scss"],
  providers: [{provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: customTooltipOptions}],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    NgScrollbar,
    SpinnerComponent,
    TypedTemplateDirective
  ]
})
export class CadListComponent implements AfterViewInit {
  @HostBinding("class") class = "ng-page";
  length = 0;
  pageSizeOptions = [1, 10, 20, 50, 100];
  pageSize = 20;
  pageData: {data: CadData; img: string; checked: boolean}[] = [];
  tableData: any = [];
  displayedColumns = ["select", "mingzi", "wenjian", "create_time", "modify_time"];
  width = 300;
  height = 150;
  searchField = "名字";
  searchNameInput = "";
  checkedIndexForce = false;
  checkedItems: string[] = [];
  checkedColumns: any[] = [];
  checkedInOtherPages = false;
  showCheckedOnly = false;
  loaderId = "cadList";
  loaderIdSubmit = "cadListSubmit";
  cadDataType!: CadData;
  imgCadEmpty = imgCadEmpty;
  @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;

  constructor(
    public dialogRef: MatDialogRef<CadListComponent, CadListOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadListInput,
    private sanitizer: DomSanitizer,
    private http: CadDataService,
    private dialog: MatDialog,
    private message: MessageService,
    private status: AppStatusService
  ) {
    if (!data) {
      this.data = {selectMode: "single", collection: "cad"};
    }
    if (typeof data?.pageSize === "number") {
      this.pageSize = data.pageSize;
    }
    if (!selectModes.includes(this.data.selectMode)) {
      this.data.selectMode = "single";
    }
  }

  async ngAfterViewInit() {
    if (!this.paginator) {
      return;
    }
    await lastValueFrom(this.paginator.initialized);
    if (Array.isArray(this.data.checkedItems)) {
      this.checkedItems = this.data.checkedItems.slice();
    }
    this.data.qiliao = this.data.qiliao === true;
    this.getData(1);
  }

  changePage(event: PageEvent) {
    this.syncCheckedItems();
    this.getData(event.pageIndex + 1);
  }

  syncCheckedItems() {
    const toRemove: string[] = [];
    let checkedNum = 0;
    this.pageData.forEach((v) => {
      const index = this.checkedItems.indexOf(v.data.id);
      if (v.checked) {
        if (index === -1) {
          this.checkedItems.push(v.data.id);
        } else {
          this.checkedItems[index] = v.data.id;
        }
        checkedNum++;
      } else if (index > -1) {
        toRemove.push(v.data.id);
      }
    });
    this.checkedItems = difference(this.checkedItems, toRemove);
    this.checkedInOtherPages = checkedNum < this.checkedItems.length;
  }

  async getData(page: number, options: CadData["options"] = {}, matchType: "and" | "or" = "and") {
    if (!this.paginator) {
      return null;
    }
    const limit = this.paginator.pageSize;
    let result: Awaited<ReturnType<CadDataService["getCad"]>>;
    const {collection, standaloneSearch} = this.data;
    if (this.data.source) {
      const total = this.data.source.length;
      const cads = this.data.source.slice((page - 1) * limit, page * limit);
      result = {cads, total};
    } else {
      const search = {...this.data.search};
      if (!standaloneSearch || this.searchNameInput) {
        if (!search[this.searchField] || this.searchNameInput) {
          search[this.searchField] = this.searchNameInput;
        }
      }
      const params: GetCadParams = {collection, page, limit, search};
      params.qiliao = this.data.qiliao;
      params.options = options;
      params.optionsMatchType = matchType;
      const keys: (keyof CadData)[] = ["id", "name", "options", "conditions", "type", "type2"];
      params.fields = keys.map((v) => `json.${v}`);
      if (this.showCheckedOnly) {
        params.ids = this.checkedItems.slice();
      }
      if (this.data.fixedSearch) {
        params.search = {...params.search, ...this.data.fixedSearch};
      }
      result = await this.http.getCad(params);
    }
    this.length = result.total;
    this.pageData.length = 0;
    result.cads.forEach(async (d) => {
      const checked = this.checkedItems.find((v) => v === d.id) ? true : false;
      const img = this.http.getCadImgUrl(d.id);
      const pageData = {data: d, img, checked};
      this.pageData.push(pageData);
    });
    this.syncCheckedItems();
    return result;
  }

  search(withOption = false, matchType: "and" | "or" = "and") {
    if (!this.paginator) {
      return;
    }
    this.paginator.pageIndex = 0;
    const options = withOption ? this.data.options : {};
    this.getData(this.paginator.pageIndex + 1, options, matchType);
  }

  async advancedSearch() {
    if (!this.paginator) {
      return;
    }
    const result = await openCadSearchFormDialog(this.dialog, {});
    if (result) {
      this.paginator.pageIndex = 0;
      this.getData(this.paginator.pageIndex + 1, result);
    }
  }

  searchKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.search();
    }
  }

  toggleSelectAll() {
    if (this.allChecked()) {
      this.pageData.forEach((v) => (v.checked = false));
      this.checkedItems.length = 0;
    } else {
      this.pageData.forEach((v) => (v.checked = true));
      this.syncCheckedItems();
    }
  }

  allChecked() {
    return !this.pageData.every((v) => !v.checked);
  }

  partiallyChecked() {
    if (this.checkedInOtherPages) {
      return true;
    }
    const ckeckedNum = this.pageData.filter((v) => v.checked).length;
    return ckeckedNum > 0 && ckeckedNum < this.pageData.length;
  }

  checkLimit(count: number) {
    const limit = this.data.checkedItemsLimit;
    const result = {valid: false, message: ""};
    if (isNumber(limit) && this.checkedItems.length !== limit) {
      result.message = `请选择${limit}个cad`;
      return result;
    }
    if (Array.isArray(limit)) {
      let [min, max] = limit;
      const minIsNumber = isNumber(min);
      const maxIsNumber = isNumber(max);
      if (minIsNumber && maxIsNumber) {
        if (min > max) {
          [min, max] = [max, min];
        }
        if (!isBetween(count, min, max)) {
          if (min === max) {
            result.message = `请选择${min}个cad`;
          } else {
            result.message = `请选择${min}到${max}个cad`;
          }
          return result;
        }
      } else if (minIsNumber) {
        if (count < min) {
          result.message = `请选择至少${min}个cad`;
          return result;
        }
      } else if (maxIsNumber) {
        if (count > max) {
          result.message = `请选择至多${max}个cad`;
          return result;
        }
      }
    }
    result.valid = true;
    return result;
  }

  async submit() {
    this.syncCheckedItems();
    const checkLimitResult = this.checkLimit(this.checkedItems.length);
    if (!checkLimitResult.valid) {
      this.message.error(checkLimitResult.message);
      return;
    }
    const {checkedItems: ids, data} = this;
    const {collection, raw} = data;
    if (ids.length > 0) {
      if (raw) {
        const result = await this.http.getCadRaw({ids, collection});
        this.dialogRef.close((result?.data || []) as any);
      } else {
        const result = await this.http.getCad({ids, collection});
        this.dialogRef.close(result.cads);
      }
    } else {
      this.dialogRef.close([]);
    }
  }

  close() {
    this.dialogRef.close();
  }

  toggleShowCheckedOnly(evnet: MatSlideToggleChange) {
    this.showCheckedOnly = evnet.checked;
    this.search();
  }

  clickItem(i: number) {
    if (this.data?.selectMode === "multiple") {
      const item = this.pageData[i];
      item.checked = !item.checked;
    } else {
      for (const [j, item] of this.pageData.entries()) {
        if (i === j) {
          item.checked = !item.checked;
        } else {
          item.checked = false;
        }
      }
    }
  }

  returnZero() {
    return 0;
  }

  async addCad() {
    const name = await this.message.prompt({type: "string", label: "CAD名字", validators: Validators.required});
    if (!name) {
      return;
    }
    const {collection} = this.data;
    const id = await this.http.mongodbInsert(collection, {...this.data.addCadData, 名字: name});
    if (id) {
      if (await this.message.confirm("是否编辑新的CAD？")) {
        const {cads} = await this.http.getCad({collection, id});
        const data = cads[0];
        if (data) {
          await openCadEditorDialog(this.dialog, {data: {data, collection, center: true}});
        }
      }
      this.search();
    }
  }

  async editCad(i: number) {
    const item = this.pageData[i];
    this.status.openCadInNewTab(item.data.id, this.data.collection);
    if (await this.message.newTabConfirm()) {
      this.search();
    }
  }

  async copyCad(i: number) {
    const item = this.pageData[i];
    if (!(await this.message.confirm(`是否确定复制【${item.data.name}】？`))) {
      return;
    }
    const {collection} = this.data;
    const ids = await this.http.mongodbCopy(collection, [item.data.id]);
    if (ids) {
      if (await this.message.confirm("是否编辑新的CAD？")) {
        const {cads} = await this.http.getCad({collection, ids});
        const data = cads[0];
        if (data) {
          await openCadEditorDialog(this.dialog, {data: {data, collection, center: true}});
        }
      }
      this.search();
    }
  }

  async deleteCad(i: number) {
    const item = this.pageData[i];
    if (!(await this.message.confirm(`是否确定删除【${item.data.name}】？`))) {
      return;
    }
    if (await this.http.mongodbDelete(this.data.collection, item.data.id)) {
      this.search();
    }
  }

  async onCadImgError(i: number) {
    const item = this.pageData[i];
    const {collection} = this.data;
    const cads = await this.http.getCad({id: item.data.id, collection}, {spinner: false});
    const data = cads.cads[0];
    if (!data) {
      return;
    }
    const url = await getCadPreview(collection, data, {http: this.http});
    item.img = url;
  }
}

export const openCadListDialog = getOpenDialogFunc<CadListComponent, CadListInput, CadListOutput>(CadListComponent, {
  width: "100%",
  height: "100%"
});
