import {KeyValuePipe, NgTemplateOutlet} from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  HostBinding,
  inject,
  Inject,
  signal,
  viewChild,
  viewChildren
} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {imgCadEmpty} from "@app/app.common";
import {getCadQueryFields, setCadData, validateCad} from "@app/cad/cad-shujuyaoqiu";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {isBetween, isNumber, ObjectOf, queryStringList, timeout} from "@lucilor/utils";
import {getCadInfoInputs2} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetCadParams, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {getHoutaiCad} from "@modules/http/services/cad-data.service.utils";
import {HttpOptions} from "@modules/http/services/http.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {openExportPage} from "@views/export/export.utils";
import {openImportPage} from "@views/import/import.utils";
import {difference} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {TypedTemplateDirective} from "../../../modules/directives/typed-template.directive";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {openCadEditorDialog} from "../cad-editor-dialog/cad-editor-dialog.component";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";
import {getOpenDialogFunc} from "../dialog.common";
import {CadListInput, CadListItemInfo, CadListOutput, CadListPageItem, selectModes} from "./cad-list.types";

@Component({
  selector: "app-cad-list",
  templateUrl: "./cad-list.component.html",
  styleUrls: ["./cad-list.component.scss"],
  standalone: true,
  imports: [
    FormsModule,
    forwardRef(() => CadItemComponent),
    InputComponent,
    KeyValuePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatIconModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    NgScrollbar,
    NgTemplateOutlet,
    SpinnerComponent,
    TypedTemplateDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadListComponent implements AfterViewInit {
  private http = inject(CadDataService);
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";
  length = signal(0);
  pageSizeOptions = signal([1, 10, 20, 50, 100]);
  pageSize = signal(20);
  pageData = signal<CadListPageItem[]>([]);
  width = 300;
  height = 150;
  checkedItems = signal<string[]>([]);
  checkedInOtherPages = signal(false);
  showCheckedOnly = signal(false);
  loaderId = "cadList";
  loaderIdSubmit = "cadListSubmit";
  cadDataType!: CadData;
  imgCadEmpty = imgCadEmpty;
  cadItemButtons = signal<CadItemButton<CadListItemInfo>[]>([]);
  downloadApi = this.http.getUrl("ngcad/downloadFile");
  multiDeleting = signal(false);

  paginator = viewChild(MatPaginator);
  cadItems = viewChildren<CadItemComponent>("cadItem");

  constructor(
    public dialogRef: MatDialogRef<CadListComponent, CadListOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadListInput
  ) {
    if (!data) {
      this.data = {selectMode: "single", collection: "cad"};
    }
    if (typeof data?.pageSize === "number") {
      this.pageSize.set(data.pageSize);
    }
    if (!selectModes.includes(this.data.selectMode)) {
      this.data.selectMode = "single";
    }
    if (this.data.options) {
      this.searchOptions.set(this.data.options);
    }
    this.cadItemButtons.set([
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.deleteCad.bind(this)}
    ]);
  }

  async ngAfterViewInit() {
    if (Array.isArray(this.data.checkedItems)) {
      this.checkedItems.set(this.data.checkedItems.slice());
    }
    this.data.qiliao = this.data.qiliao === true;
    await timeout(0);
    await this.getData(1);
  }

  changePage(event: PageEvent) {
    this.syncCheckedItems();
    this.getData(event.pageIndex + 1);
  }

  syncCheckedItems() {
    const toRemove: string[] = [];
    let checkedNum = 0;
    const checkedItems = this.checkedItems().slice();
    this.pageData.update((v) =>
      v.map((v2) => {
        const index = checkedItems.indexOf(v2.data._id);
        if (v2.checked) {
          if (index === -1) {
            checkedItems.push(v2.data._id);
          } else {
            checkedItems[index] = v2.data._id;
          }
          checkedNum++;
        } else if (index > -1) {
          toRemove.push(v2.data._id);
        }
        return {...v2};
      })
    );
    this.checkedItems.set(difference(checkedItems, toRemove, [""]));
    this.checkedInOtherPages.set(checkedNum < this.checkedItems.length);
  }

  searchField = signal("名字");
  searchNameInput = signal("");
  searchForm1 = computed(() => {
    const form: InputInfo[] = [
      {
        type: "select",
        label: "搜索类型",
        multiple: false,
        hidden: !!this.data.source,
        options: [{value: "_id", label: "ID"}, "名字", "选项", "条件"],
        value: this.searchField(),
        onChange: (val) => this.searchField.set(val),
        style: {flex: "0 1 100px", width: 0}
      },
      {
        type: "string",
        label: "搜索CAD",
        value: this.searchNameInput(),
        onChange: (val) => {
          this.searchNameInput.set(val);
          this.search();
        },
        suffixIcons: [{name: "search", onClick: () => this.search()}],
        hint: "按回车开始搜索",
        style: {flex: "0 1 150px", width: 0}
      }
    ];
    return form;
  });
  searchOptions = signal<ObjectOf<string>>({开启: ""});
  searchForm2 = computed(() => {
    const data = {...this.searchOptions()};
    const form: InputInfo<typeof data>[] = [
      {
        type: "select",
        label: "选项筛选：开启",
        multiple: false,
        options: [{value: "", label: "全部"}, "外开", "内开"],
        model: {data, key: "开启"},
        onChange: () => {
          this.searchOptions.set(data);
          this.search();
        },
        style: {flex: "0 1 150px", width: 0}
      }
    ];
    return form;
  });
  async getData(page: number, options: CadData["options"] = {}, matchType: "and" | "or" = "and") {
    const paginator = this.paginator();
    if (!paginator) {
      return null;
    }
    const limit = paginator.pageSize;
    let result: Awaited<ReturnType<CadDataService["getCad"]>>;
    const pageData: ReturnType<typeof this.pageData> = [];
    this.length.set(0);
    const {collection, standaloneSearch} = this.data;
    const searchField = this.searchField();
    const searchNameInput = this.searchNameInput();
    const searchOptions = this.searchOptions();
    if (this.data.source) {
      let cadsAll = this.data.source;
      if (searchNameInput) {
        cadsAll = cadsAll.filter((v) => queryStringList(searchNameInput, [v.name, v.id]));
      }
      const total = cadsAll.length;
      const cads = cadsAll.slice((page - 1) * limit, page * limit);
      result = {cads, total};
    } else {
      const search = {...this.data.search};
      if (!standaloneSearch || searchNameInput) {
        if (!search[searchField] || searchNameInput) {
          search[searchField] = searchNameInput;
        }
      }
      const params: GetCadParams = {collection, page, limit, search};
      params.qiliao = this.data.qiliao;
      params.options = options;
      params.optionsMatchType = matchType;
      if (!this.data.yaoqiu) {
        await this.status.cadYaoqiusManager.fetch();
        this.data.yaoqiu = this.status.getCadYaoqiu("配件库");
      }
      params.fields = getCadQueryFields(this.data.yaoqiu);
      if (this.showCheckedOnly()) {
        params.ids = this.checkedItems().slice();
      }
      if (this.data.fixedSearch) {
        params.search = {...params.search, ...this.data.fixedSearch};
      }
      if (this.data.yaoqiu?.选择CAD弹窗筛选数据要求) {
        params.search = {...params.search, $where: this.data.yaoqiu.选择CAD弹窗筛选数据要求};
      }
      const searchOptions2 = {...searchOptions};
      for (const key of Object.keys(searchOptions2)) {
        if (!searchOptions2[key]) {
          delete searchOptions2[key];
        }
      }
      if (Object.keys(searchOptions2).length > 0) {
        params.options = searchOptions2;
        params.optionsMatchLoose = true;
      }
      result = await this.http.getCad(params);
    }
    this.length.set(result.total);
    result.cads.forEach((d) => {
      const checked = this.checkedItems().find((v) => v === d.id) ? true : false;
      pageData.push({data: getHoutaiCad(d), checked});
    });
    this.pageData.set(pageData);
    this.syncCheckedItems();
    return result;
  }

  async search(matchType: "and" | "or" = "and") {
    const paginator = this.paginator();
    if (!paginator) {
      return;
    }
    paginator.pageIndex = 0;
    await this.getData(paginator.pageIndex + 1, {}, matchType);
  }

  async advancedSearch() {
    const paginator = this.paginator();
    if (!paginator) {
      return;
    }
    const result = await openCadSearchFormDialog(this.dialog, {});
    if (result) {
      paginator.pageIndex = 0;
      this.getData(paginator.pageIndex + 1, result);
    }
  }

  toggleSelectAll() {
    if (this.allChecked()) {
      this.pageData.update((v) => v.map((v2) => ({...v2, checked: false})));
      this.checkedItems.set([]);
    } else {
      this.pageData.update((v) => v.map((v2) => ({...v2, checked: true})));
      this.syncCheckedItems();
    }
  }

  allChecked = computed(() => this.pageData().every((v) => !v.checked));
  partiallyChecked = computed(() => {
    if (this.checkedInOtherPages()) {
      return true;
    }
    const ckeckedNum = this.pageData().filter((v) => v.checked).length;
    return ckeckedNum > 0 && ckeckedNum < this.pageData.length;
  });

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
    const ids = this.checkedItems();
    const {data} = this;
    const {collection, raw, vars, source} = data;
    const yaoqiuItems = data.yaoqiu?.选中CAD要求 || [];
    let cads: (CadData | HoutaiCad)[] = [];
    if (ids.length > 0) {
      if (source) {
        cads = source.filter((v) => ids.includes(v.id));
      } else if (raw) {
        const result = await this.http.getCadRaw({ids, collection});
        cads = result?.data || [];
      } else {
        const result = await this.http.getCad({ids, collection});
        cads = result.cads;
      }
      for (const cad of cads) {
        if (cad instanceof CadData) {
          setCadData(cad, yaoqiuItems, vars);
        } else {
          const cad2 = new CadData(cad.json);
          setCadData(cad2, yaoqiuItems, vars);
          Object.assign(cad, getHoutaiCad(cad2));
        }
      }
      const getInvalidCad = () => {
        const result: {cad: CadData; i: number}[] = [];
        for (const [i, v] of cads.entries()) {
          const cad = v instanceof CadData ? v : new CadData(v.json);
          if (!validateCad(cad, yaoqiuItems)) {
            result.push({cad, i});
          }
        }
        return result;
      };
      const toEdit = getInvalidCad();
      if (toEdit.length > 0) {
        for (const {cad, i} of toEdit) {
          const yaoqiuItems2 = data.yaoqiu?.CAD弹窗修改属性 || [];
          const form = getCadInfoInputs2(yaoqiuItems2, yaoqiuItems, cad, this.dialog, this.status, true, []);
          let title = "编辑CAD";
          const name = cad.name;
          if (name) {
            title += `【${name}】`;
          }
          const result = await this.message.form(form, {title});
          if (result) {
            const cad2 = cads[i];
            if (cad2 instanceof CadData) {
              Object.assign(cad2, cad);
            } else {
              Object.assign(cad2, getHoutaiCad(cad));
            }
          }
        }
        if (getInvalidCad().length > 0) {
          return;
        }
      }
      this.dialogRef.close(cads as any);
    } else {
      this.dialogRef.close([]);
    }
  }

  close() {
    this.dialogRef.close();
  }

  toggleShowCheckedOnly(evnet: MatSlideToggleChange) {
    this.showCheckedOnly.set(evnet.checked);
    this.search();
  }

  clickItem(i: number) {
    const {selectMode} = this.data;
    if (selectMode === "multiple") {
      this.pageData.update((v) =>
        v.map((v2, j) => {
          if (i === j) {
            return {...v2, checked: !v2.checked};
          }
          return v2;
        })
      );
    } else if (selectMode === "single") {
      this.checkedItems.set([]);
      this.pageData.update((v) =>
        v.map((v2, j) => {
          if (i === j) {
            return {...v2, checked: !v2.checked};
          }
          return {...v2, checked: false};
        })
      );
    } else {
      return;
    }
    this.syncCheckedItems();
  }

  returnZero() {
    return 0;
  }

  async addCad() {
    const {addCadFn, addCadData, yaoqiu, gongshis} = this.data;
    if (typeof addCadFn === "function") {
      const res = await addCadFn();
      if (res) {
        this.search();
      }
      return;
    }
    const cadData = new CadData(addCadData);
    const yaoqiuItems = yaoqiu?.新建CAD要求 || [];
    const yaoqiuItems2 = yaoqiu?.选中CAD要求 || [];
    setCadData(cadData, yaoqiuItems);
    const form = getCadInfoInputs2(yaoqiuItems, yaoqiuItems2, cadData, this.dialog, this.status, true, gongshis);
    const result = await this.message.form(form);
    if (!result) {
      return;
    }
    const {collection} = this.data;
    const data = getHoutaiCad(cadData);
    const resData = await this.http.mongodbInsert(collection, data, {force: !!yaoqiu});
    if (resData) {
      if (await this.message.confirm("是否编辑新的CAD？")) {
        const data2 = new CadData(resData);
        if (data2) {
          await openCadEditorDialog(this.dialog, {data: {data: data2, collection, center: true, gongshis}});
        }
      }
      this.search();
    }
  }

  async copyCad(component: CadItemComponent<CadListItemInfo>) {
    const {index: i} = component.customInfo;
    const item = this.pageData()[i];
    if (!(await this.message.confirm(`是否确定复制【${item.data.名字}】？`))) {
      return;
    }
    const {collection} = this.data;
    const items = await this.http.mongodbCopy<HoutaiCad>(collection, [item.data._id]);
    if (items?.[0]) {
      if (await this.message.confirm("是否编辑新的CAD？")) {
        const data = new CadData(items[0].json);
        const gongshis = this.data.gongshis;
        await openCadEditorDialog(this.dialog, {data: {data, collection, center: true, gongshis}});
      }
      this.search();
    }
  }

  async deleteCad(component: CadItemComponent<CadListItemInfo>) {
    const {index: i} = component.customInfo;
    const item = this.pageData()[i];
    if (!(await this.message.confirm(`是否确定删除【${item.data.名字}】？`))) {
      return;
    }
    if (await this.http.mongodbDelete(this.data.collection, {id: item.data._id})) {
      this.search();
    }
  }

  async getCad(id: string, options?: HttpOptions) {
    const {collection} = this.data;
    const {cads} = await this.http.getCad({id, collection}, options);
    return cads.at(0);
  }

  async openImportPage() {
    openImportPage(this.status, {collection: this.data.collection, yaoqiu: this.data.yaoqiu, lurushuju: true});
    if (await this.message.newTabConfirm()) {
      this.search();
    }
  }

  openExportPage() {
    const ids = this.checkedItems().slice();
    openExportPage(this.status, {ids, search: this.data.search, lurushuju: true});
  }

  getItemSelectable(item: CadListPageItem): CadItemComponent<CadListItemInfo>["selectable"] {
    if (this.multiDeleting()) {
      return {selected: item.toDelete, onChange: this.onSelectChange.bind(this)};
    } else if (this.data.selectMode !== "none") {
      return {selected: item.checked, onChange: this.onSelectChange.bind(this)};
    }
    return undefined;
  }

  onSelectChange(component: CadItemComponent<CadListItemInfo>) {
    const {index: i} = component.customInfo;
    const {selectMode} = this.data;
    const multiDeleting = this.multiDeleting();
    let needsSync = false;
    if (multiDeleting) {
      this.pageData.update((v) =>
        v.map((v2, j) => {
          if (i === j) {
            return {...v2, toDelete: !v2.toDelete};
          }
          return v2;
        })
      );
    } else if (selectMode === "multiple" || multiDeleting) {
      this.pageData.update((v) =>
        v.map((v2, j) => {
          if (i === j) {
            return {...v2, checked: !v2.checked};
          }
          return v2;
        })
      );
      needsSync = true;
    } else if (selectMode === "single") {
      this.checkedItems.set([]);
      this.pageData.update((v) =>
        v.map((v2, j) => {
          if (i === j) {
            return {...v2, checked: !v2.checked};
          }
          return {...v2, checked: false};
        })
      );
      needsSync = true;
    }
    if (needsSync) {
      this.syncCheckedItems();
    }
  }

  async toggleMultiDeleting() {
    const data = this.pageData();
    if (this.multiDeleting()) {
      const ids = data.filter((v) => v.toDelete).map((v) => v.data._id);
      if (ids.length > 0 && (await this.message.confirm(`是否删除${ids.length}个选中的cad？`))) {
        if (await this.http.mongodbDelete(this.data.collection, {ids})) {
          await this.search();
        }
      }
    }
    this.multiDeleting.update((v) => !v);
    this.pageData.update((v) => v.map((v2) => ({...v2, toDelete: false})));
  }

  afterFetch(component: CadItemComponent<CadListItemInfo>) {
    const {index: i} = component.customInfo;
    this.pageData.update((v) => v.map((v2, j) => (i === j ? {...v2, isFetched: true} : v2)));
  }
}

export const openCadListDialog = getOpenDialogFunc<CadListComponent, CadListInput, CadListOutput>(CadListComponent, {
  width: "100%",
  height: "100%"
});
