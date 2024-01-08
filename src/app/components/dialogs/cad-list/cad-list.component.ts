import {CommonModule} from "@angular/common";
import {AfterViewInit, Component, ElementRef, Inject, ViewChild} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {MatRadioModule} from "@angular/material/radio";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTableModule} from "@angular/material/table";
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions, MatTooltipModule} from "@angular/material/tooltip";
import {DomSanitizer} from "@angular/platform-browser";
import {imgCadEmpty, timer} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {CadCollection} from "@app/cad/collections";
import {CadData} from "@lucilor/cad-viewer";
import {isBetween, isNumber, ObjectOf} from "@lucilor/utils";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetCadParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {difference} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject, lastValueFrom} from "rxjs";
import {TypedTemplateDirective} from "../../../modules/directives/typed-template.directive";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";
import {getOpenDialogFunc} from "../dialog.common";

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
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    NgScrollbar,
    MatRadioModule,
    MatTooltipModule,
    MatTableModule,
    SpinnerComponent,
    MatDialogActions,
    MatPaginatorModule,
    TypedTemplateDirective,
    MatDividerModule
  ]
})
export class CadListComponent extends Utils() implements AfterViewInit {
  length = 0;
  pageSizeOptions = [1, 10, 20, 50, 100];
  pageSize = 20;
  pageData: {data: CadData; img: string; checked: boolean}[] = [];
  tableData: any = [];
  displayedColumns = ["select", "mingzi", "wenjian", "create_time", "modify_time"];
  width = 300;
  height = 150;
  searchField = "选项";
  searchNameInput = "";
  checkedIndex = new BehaviorSubject<number>(-1);
  checkedIndexForce = false;
  checkedItems: string[] = [];
  checkedColumns: any[] = [];
  checkedInOtherPages = false;
  showCheckedOnly = false;
  loaderId = "cadList";
  loaderIdSubmit = "cadListSubmit";
  cadDataType!: CadData;
  @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;
  @ViewChild("singleSelectNone", {read: ElementRef}) singleSelectNone?: ElementRef<HTMLSpanElement>;

  constructor(
    public dialogRef: MatDialogRef<CadListComponent, CadListOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadListInput,
    private sanitizer: DomSanitizer,
    private http: CadDataService,
    private dialog: MatDialog,
    private spinner: SpinnerService,
    private message: MessageService
  ) {
    super();
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
    this.checkedIndex.subscribe(async (i) => {
      if (this.data.selectMode === "single") {
        if (this.pageData[i]) {
          const id = this.pageData[i].data.id;
          if (!this.checkedIndexForce && this.checkedItems[0] === id && this.checkLimit(0).valid) {
            this.checkedItems = [];
            this.checkedIndex.next(-1);
          } else {
            this.checkedItems = [id];
          }
        } else {
          // this.checkedItems = [];
        }
      }
    });
  }

  changePage(event: PageEvent) {
    this.syncCheckedItems();
    this.getData(event.pageIndex + 1);
  }

  syncCheckedItems() {
    if (this.data.selectMode === "multiple") {
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
    } else if (this.data.selectMode === "single") {
      const id = this.checkedItems[0];
      if (id) {
        const index = this.pageData.findIndex((v) => v.data.id === id);
        if (this.checkedIndex.value !== index) {
          this.checkedIndexForce = true;
          this.checkedIndex.next(index);
          this.checkedIndexForce = false;
        }
      } else if (this.checkedIndex.value !== -1) {
        this.checkedIndex.next(-1);
      }
    }
  }

  async getData(page: number, options: CadData["options"] = {}, matchType: "and" | "or" = "and") {
    if (!this.paginator) {
      return null;
    }
    const limit = this.paginator.pageSize;
    let result: Awaited<ReturnType<CadDataService["getCad"]>>;
    const collection = this.data.collection;
    if (this.data.source) {
      const total = this.data.source.length;
      const cads = this.data.source.slice((page - 1) * limit, page * limit);
      result = {cads, total};
    } else {
      const search = {...this.data.search};
      search[this.searchField] = this.searchNameInput;
      const params: GetCadParams = {collection, page, limit, search};
      params.qiliao = this.data.qiliao;
      params.options = options;
      params.optionsMatchType = matchType;
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
      const pageData = {data: d, img: imgCadEmpty, checked};
      this.pageData.push(pageData);
    });
    this.syncCheckedItems();
    const timerName = "cad-list-getData";
    timer.start(timerName);
    for (const data of this.pageData) {
      const url = await getCadPreview(collection, data.data, {http: this.http});
      data.img = this.sanitizer.bypassSecurityTrustUrl(url) as string;
    }
    timer.end(timerName, "渲染CAD列表");
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
    const ids = this.checkedItems;
    if (ids.length > 0) {
      this.spinner.show(this.loaderIdSubmit);
      const result = await this.http.getCad({ids, collection: this.data.collection});
      this.spinner.hide(this.loaderIdSubmit);
      this.dialogRef.close(result.cads);
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
}

export const selectModes = ["single", "multiple"] as const;

export type SelectMode = (typeof selectModes)[number];

export interface CadListInput {
  selectMode: SelectMode;
  checkedItems?: string[];
  checkedItemsLimit?: number | number[];
  options?: CadData["options"];
  collection: CadCollection;
  qiliao?: boolean;
  search?: ObjectOf<any>;
  standaloneSearch?: boolean;
  fixedSearch?: ObjectOf<any>;
  pageSize?: number;
  source?: CadData[];
  raw?: boolean;
}

export type CadListOutput = CadData[];

export const openCadListDialog = getOpenDialogFunc<CadListComponent, CadListInput, CadListOutput>(CadListComponent, {
  width: "85%",
  height: "85%"
});
