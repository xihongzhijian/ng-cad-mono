import {AfterViewInit, Component, computed, forwardRef, HostBinding, inject, signal, viewChild, viewChildren} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {MatSlideToggleChange, MatSlideToggleModule} from "@angular/material/slide-toggle";
import {imgCadEmpty} from "@app/app.common";
import {getCadQueryFields, setCadData, validateCad} from "@app/cad/cad-shujuyaoqiu";
import {getDateTimeString} from "@app/utils/get-value";
import {CadItemComponent} from "@components/lurushuju/cad-item/cad-item.component";
import {CadItemButton, CadItemForm, CadItemIsOnlineInfo, CadItemSelectable} from "@components/lurushuju/cad-item/cad-item.types";
import {CadData} from "@lucilor/cad-viewer";
import {isBetween, isNumber, ObjectOf, queryStringList, timeout} from "@lucilor/utils";
import {openCadForm} from "@modules/cad-editor/components/menu/cad-info/cad-info.utils";
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
import {difference, union} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {openCadEditorDialog} from "../cad-editor-dialog/cad-editor-dialog.component";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";
import {getOpenDialogFunc} from "../dialog.common";
import {CadListInput, CadListItemInfo, CadListOutput, CadListPageItem, selectModes} from "./cad-list.types";

@Component({
  selector: "app-cad-list",
  templateUrl: "./cad-list.component.html",
  styleUrls: ["./cad-list.component.scss"],
  imports: [
    FormsModule,
    forwardRef(() => CadItemComponent),
    forwardRef(() => InputComponent),
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    NgScrollbar,
    SpinnerComponent
  ]
})
export class CadListComponent implements AfterViewInit {
  dialogRef = inject<MatDialogRef<CadListComponent, CadListOutput>>(MatDialogRef);
  data: CadListInput = inject<CadListInput>(MAT_DIALOG_DATA, {optional: true}) ?? {selectMode: "none", collection: "cad"};

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
  showCheckedOnly = signal(false);
  loaderId = "cadList";
  loaderIdSubmit = "cadListSubmit";
  cadDataType!: CadData;
  imgCadEmpty = imgCadEmpty;
  downloadApi = this.http.getUrl("ngcad/downloadFile");

  paginator = viewChild(MatPaginator);
  cadItems = viewChildren<CadItemComponent>("cadItem");

  constructor() {
    const data = this.data;

    if (!data) {
      this.data = {selectMode: "single", collection: "cad"};
    }
    if (typeof data.pageSize === "number") {
      this.pageSize.set(data.pageSize);
    }
    if (!selectModes.includes(this.data.selectMode)) {
      this.data.selectMode = "single";
    }
    if (this.data.options) {
      this.searchOptions.set(this.data.options);
    }
  }

  async ngAfterViewInit() {
    if (Array.isArray(this.data.checkedItems)) {
      this.checkedIds.set(this.data.checkedItems.slice());
    }
    this.data.qiliao = this.data.qiliao === true;
    await timeout(0);
    await this.getData(1);
  }

  multiSelecting = signal(false);
  toggleMultiSelecting() {
    this.multiSelecting.update((v) => !v);
    if (!this.multiSelecting()) {
      switch (this.data.selectMode) {
        case "multiple":
          break;
        case "single":
          this.checkedIds.update((v) => v.slice(0, 1));
          break;
        default:
          this.checkedIds.set([]);
      }
    }
  }
  selectMode = computed<CadListInput["selectMode"]>(() => {
    if (this.multiSelecting()) {
      return "multiple";
    }
    return this.data.selectMode;
  });

  checkedIds = signal<string[]>([]);
  checkedInOtherPages = computed(() => {
    const ids = this.checkedIds();
    return !ids.every((v) => this.pageData().find((v2) => v2.data._id === v));
  });

  changePage(event: PageEvent) {
    this.getData(event.pageIndex + 1);
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
        onChange: (val) => {
          this.searchField.set(val);
        },
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
  async getCadYaoqiu() {
    if (!this.data.yaoqiu) {
      this.data.yaoqiu = await this.status.fetchAndGetCadYaoqiu("配件库");
    }
    return this.data.yaoqiu;
  }
  async getDataSearch() {
    const search = {...this.data.search};
    const {standaloneSearch} = this.data;
    const searchNameInput = this.searchNameInput();
    const searchField = this.searchField();
    if (!standaloneSearch || searchNameInput) {
      if (!search[searchField] || searchNameInput) {
        search[searchField] = searchNameInput;
      }
    }
    const yaoqiu = await this.getCadYaoqiu();
    if (this.data.fixedSearch) {
      Object.assign(search, this.data.fixedSearch);
    }
    if (yaoqiu?.选择CAD弹窗筛选数据要求) {
      search.$where = yaoqiu.选择CAD弹窗筛选数据要求;
    }
    for (const key of Object.keys(search)) {
      if ([null, undefined, ""].includes(search[key])) {
        delete search[key];
      }
    }
    return search;
  }
  async getCadParams(page?: number, options: CadData["options"] = {}, matchType: "and" | "or" = "and") {
    const paginator = this.paginator();
    if (!paginator) {
      return null;
    }
    const {collection} = this.data;
    const limit = paginator.pageSize;
    const params: GetCadParams = {collection, page, limit};
    params.qiliao = this.data.qiliao;
    params.options = options;
    params.optionsMatchType = matchType;
    params.search = await this.getDataSearch();
    params.fields = getCadQueryFields(this.data.yaoqiu);
    if (this.showCheckedOnly()) {
      params.ids = this.checkedIds().slice();
    }
    const searchOptions = this.searchOptions();
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
    return params;
  }
  async getData(page: number, options: CadData["options"] = {}, matchType: "and" | "or" = "and") {
    let result: Awaited<ReturnType<CadDataService["getCad"]>>;
    const pageData: ReturnType<typeof this.pageData> = [];
    this.length.set(0);
    if (this.data.source) {
      const searchNameInput = this.searchNameInput();
      let cadsAll = this.data.source;
      if (searchNameInput) {
        cadsAll = cadsAll.filter((v) => queryStringList(searchNameInput, [v.name, v.id]));
      }
      const total = cadsAll.length;
      const paginator = this.paginator();
      if (!paginator) {
        return null;
      }
      const limit = paginator.pageSize;
      const cads = cadsAll.slice((page - 1) * limit, page * limit);
      result = {cads, total};
    } else {
      const params = await this.getCadParams(page, options, matchType);
      if (!params) {
        return null;
      }
      result = await this.http.getCad(params);
    }
    this.length.set(result.total);
    result.cads.forEach((d) => {
      pageData.push({data: getHoutaiCad(d)});
    });
    this.pageData.set(pageData);
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
    const checkedIds = this.checkedIds();
    const pageIds = this.pageData().map((v) => v.data._id);
    if (this.allChecked()) {
      this.checkedIds.set(difference(checkedIds, pageIds));
    } else {
      this.checkedIds.set(union(checkedIds, pageIds));
    }
  }

  allChecked = computed(() => {
    const checkedIds = this.checkedIds();
    return this.pageData().every((v) => checkedIds.includes(v.data._id));
  });
  partiallyChecked = computed(() => {
    if (this.checkedInOtherPages()) {
      return true;
    }
    const ckeckedNum = this.checkedIds().length;
    return ckeckedNum > 0 && ckeckedNum < this.pageData().length;
  });

  checkLimit(count: number) {
    const limit = this.data.checkedItemsLimit;
    const result = {valid: false, message: ""};
    if (isNumber(limit) && count !== limit) {
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

  canSubmit = computed(() => {
    if (this.multiSelecting() && this.data.selectMode !== "multiple") {
      return this.checkedIds().length < 2;
    }
    return true;
  });
  async submit() {
    const ids = this.checkedIds();
    const checkLimitResult = this.checkLimit(ids.length);
    if (!checkLimitResult.valid) {
      this.message.error(checkLimitResult.message);
      return;
    }
    const {data} = this;
    const {collection, raw, vars, source, yaoqiu} = data;
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
          setCadData(cad, yaoqiu, "set", vars);
        } else {
          const cad2 = new CadData(cad.json);
          setCadData(cad2, yaoqiu, "set", vars);
          Object.assign(cad, getHoutaiCad(cad2));
        }
      }
      const getInvalidCad = () => {
        const result: {cad: CadData; i: number}[] = [];
        for (const [i, v] of cads.entries()) {
          const cad = v instanceof CadData ? v : new CadData(v.json);
          if (!validateCad(cad, yaoqiu, "set")) {
            result.push({cad, i});
          }
        }
        return result;
      };
      const toEdit = getInvalidCad();
      if (toEdit.length > 0) {
        for (const {cad, i} of toEdit) {
          const cad2 = await openCadForm(data.yaoqiu, collection, cad, this.http, this.dialog, this.status, this.message, true);
          if (cad2) {
            const cad3 = cads[i];
            if (cad3 instanceof CadData) {
              Object.assign(cad3, cad2);
            } else {
              Object.assign(cad3, getHoutaiCad(cad2));
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
    const selectMode = this.selectMode();
    const checkedIds = this.checkedIds();
    const id = this.pageData()[i].data._id;
    if (selectMode === "multiple") {
      if (checkedIds.includes(id)) {
        this.checkedIds.set(difference(checkedIds, [id]));
      } else {
        this.checkedIds.set(union(checkedIds, [id]));
      }
    } else if (selectMode === "single") {
      if (checkedIds.includes(id)) {
        this.checkedIds.set([]);
      } else {
        this.checkedIds.set([id]);
      }
    }
  }

  returnZero() {
    return 0;
  }

  async getCad(id: string, options?: HttpOptions) {
    const {collection} = this.data;
    const {cads} = await this.http.getCad({id, collection}, options);
    return cads.at(0);
  }

  async openImportPage() {
    const {collection, yaoqiu} = this.data;
    openImportPage(this.status, {collection, yaoqiu, lurushuju: true});
    if (await this.message.newTabConfirm()) {
      this.search();
    }
  }
  async openExportPage() {
    const ids = this.checkedIds().slice();
    const {collection} = this.data;
    const search = await this.getDataSearch();
    openExportPage(this.status, {collection, ids, search, lurushuju: true});
  }

  async importCads() {
    this.message.importData<ObjectOf<any>[]>(true, async (cads) => {
      const {collection} = this.data;
      const yaoqiu = await this.getCadYaoqiu();
      let needsRefresh = false;
      for (const cad of cads) {
        const cad2 = new CadData(cad);
        setCadData(cad2, yaoqiu, "set");
        const cad3 = await this.http.setCad({collection, cadData: cad2}, false);
        if (cad3) {
          needsRefresh = true;
        }
      }
      if (needsRefresh) {
        await this.search();
      }
    });
  }
  async exportCads(all: boolean) {
    let params: GetCadParams | null;
    if (all) {
      params = await this.getCadParams();
      if (!params) {
        return;
      }
      delete params.fields;
    } else {
      const ids = this.checkedIds().slice();
      if (ids.length < 1) {
        await this.message.alert("请选择要导出的cad");
        return;
      }
      const {collection} = this.data;
      params = {ids, collection};
    }
    const {cads} = await this.http.getCad(params);
    const title = getDateTimeString();
    const cads2 = cads.map((v) => v.export());
    await this.message.exportData(cads2, `cads_${title}`);
  }

  cadItemButtons = computed(() => {
    const buttons: CadItemButton<CadListItemInfo>[] = [
      {name: "复制", onClick: this.copyCad.bind(this)},
      {name: "删除", onClick: this.deleteCad.bind(this)}
    ];
    return buttons;
  });
  cadItemForm = signal<CadItemForm<CadListItemInfo>>({noDefaultTexts: true});
  toggleShowCadItemFormTexts() {
    this.cadItemForm.update((v) => ({...v, noDefaultTexts: !v.noDefaultTexts}));
  }
  fetchedCadIds = signal<string[]>([]);
  cadItemInfos = computed(() => {
    const infos: {
      isOnline: CadItemIsOnlineInfo<CadListItemInfo>;
      selectable?: CadItemSelectable<CadListItemInfo>;
    }[] = [];
    for (const item of this.pageData()) {
      const info: (typeof infos)[number] = {isOnline: {isFetched: false, afterFetch: this.afterFetch.bind(this)}};
      infos.push(info);
      if (this.selectMode() !== "none") {
        info.selectable = {
          selected: this.checkedIds().includes(item.data._id),
          onChange: this.onSelectChange.bind(this)
        };
      }
    }
    return infos;
  });
  beforeEditCad(data: HoutaiCad) {
    this.data.beforeEditCad?.(data);
  }
  afterEditCad(data: HoutaiCad) {
    this.data.afterEditCad?.(data);
  }
  onSelectChange(component: CadItemComponent<CadListItemInfo>) {
    const {index} = component.customInfo();
    this.clickItem(index);
  }
  afterFetch(component: CadItemComponent<CadListItemInfo>) {
    const {index: i} = component.customInfo();
    this.pageData.update((v) => v.map((v2, j) => (i === j ? {...v2, isFetched: true} : v2)));
  }
  async addCad() {
    const {addCadData, yaoqiu, gongshis, collection} = this.data;
    const cad2 = await openCadForm(yaoqiu, collection, null, this.http, this.dialog, this.status, this.message, true);
    if (!cad2) {
      return;
    }
    if (addCadData) {
      Object.assign(cad2, addCadData);
    }
    const data = getHoutaiCad(cad2);
    const resData = await this.http.mongodbInsert<HoutaiCad>(collection, data, {force: !!yaoqiu});
    if (resData) {
      const data2 = new CadData(resData.json);
      if (await this.message.confirm("是否编辑新的CAD？")) {
        await openCadEditorDialog(this.dialog, {data: {data: data2, collection, center: true, gongshis}});
      }
      this.search();
    }
  }
  async copyCad(component: CadItemComponent<CadListItemInfo>) {
    const {index: i} = component.customInfo();
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
    const {index: i} = component.customInfo();
    const item = this.pageData()[i];
    if (!(await this.message.confirm(`是否确定删除【${item.data.名字}】？`))) {
      return;
    }
    if (await this.http.mongodbDelete(this.data.collection, {id: item.data._id})) {
      this.checkedIds.update((v) => difference(v, [item.data._id]));
      await this.search();
    }
  }
  async deleteCads() {
    const ids = this.checkedIds();
    if (ids.length < 1) {
      await this.message.alert("请选择要删除的cad");
      return;
    }
    if (!(await this.message.confirm(`是否删除${ids.length}个选中的cad？`))) {
      return;
    }
    if (await this.http.mongodbDelete(this.data.collection, {ids})) {
      this.checkedIds.set([]);
      await this.search();
    }
  }
}

export const openCadListDialog = getOpenDialogFunc<CadListComponent, CadListInput, CadListOutput>(CadListComponent, {
  width: "100%",
  height: "100%"
});
