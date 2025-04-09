import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  HostBinding,
  inject,
  Inject,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatPaginator, MatPaginatorModule, PageEvent} from "@angular/material/paginator";
import {filePathUrl} from "@app/app.common";
import {FetchManager} from "@app/utils/fetch-manager";
import {TableDataBase} from "@app/utils/table-data/table-data-base";
import {isTypeOf, ObjectOf, queryString, timeout} from "@lucilor/utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetOptionsParamsSingle, GetOptionsResultItem} from "@modules/http/services/cad-data.service.types";
import {DataAndCount} from "@modules/http/services/http.service.types";
import {InputInfo, InputInfoObject} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {cloneDeep, debounce, isEmpty} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {ImageComponent} from "../../../modules/image/components/image/image.component";
import {InputComponent} from "../../../modules/input/components/input.component";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {getOpenDialogFunc} from "../dialog.common";
import {CadOptionsInput, CadOptionsOutput, CadOptionsPageDataItem} from "./cad-options.types";

@Component({
  selector: "app-cad-options",
  templateUrl: "./cad-options.component.html",
  styleUrls: ["./cad-options.component.scss"],
  imports: [
    ClickStopPropagationDirective,
    forwardRef(() => InputComponent),
    ImageComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogActions,
    MatIconModule,
    MatPaginatorModule,
    NgScrollbar,
    SpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadOptionsComponent implements AfterViewInit {
  private http = inject(CadDataService);
  private spinner = inject(SpinnerService);
  private message = inject(MessageService);

  @HostBinding("class") class = ["ng-page"];

  pageData = signal<CadOptionsPageDataItem[]>([]);
  length = signal(0);
  pageSizeOptions = signal([50, 100, 200, 500]);
  pageSize = signal(100);
  checkedIdsCurr = new Set<number>();
  checkedIdsOthers = new Set<number>();
  loaderIds = {optionsLoader: "cadOptions", submitLoaderId: "cadOptionsSubmit"};

  filePathUrl = filePathUrl;
  paginator = viewChild(MatPaginator);
  showPaginator = signal(true);
  noImage = signal(false);

  constructor(
    public dialogRef: MatDialogRef<CadOptionsComponent, CadOptionsOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadOptionsInput
  ) {}

  async ngAfterViewInit() {
    await timeout(0);
    await this.getData(1);
  }

  optionOptionsCache = new Map<string, ObjectOf<string>>();
  optionOptions = signal<ObjectOf<string>[]>([]);
  optionOptionsEff = effect(() => {
    if (!this.data.optionOptions) {
      return;
    }
    const {value} = this.data.optionOptions || {};
    const arr: ReturnType<typeof this.optionOptions> = [];
    for (const [i, item] of this.pageData().entries()) {
      const key = String(item.vid);
      const cacheValue = this.optionOptionsCache.get(key);
      if (cacheValue) {
        arr[i] = cacheValue;
      } else if (value?.[key] && isTypeOf(value[key], "object")) {
        arr[i] = value[key];
      }
      if (!isTypeOf(arr[i], "object")) {
        arr[i] = {};
      }
      if (isEmpty(arr[i])) {
        arr[i][""] = "";
      }
    }
    this.optionOptions.set(arr);
  });
  optionOptionsInputInfos = computed(() => {
    const infos: InputInfoObject<string, string, string>[] = [];
    if (!this.data.optionOptions) {
      return infos;
    }
    const items = this.pageData();
    const optionOptions = this.optionOptions();
    for (const [i, optionOption] of optionOptions.entries()) {
      const item = items[i];
      infos.push({
        type: "object",
        label: "选项",
        value: optionOption,
        onChange: (val) => {
          this.optionOptionsCache.set(String(item.vid), val);
          optionOptions[i] = val;
          this.optionOptions.update((v) => [...v]);
        },
        ...this.data.optionOptions.info
      });
    }
    return infos;
  });

  async submit() {
    const result: CadOptionsOutput = {
      options: [],
      newTabChanged: this.newTabChanged()
    };
    if (this.data.defaultValue) {
      const {value, required} = this.data.defaultValue;
      if (required && !value && this.checkedIdsCurr.size > 1) {
        this.message.error("请选择默认值");
        return;
      }
      result.defaultValue = value;
    }
    result.options = [];
    for (const [i, item] of this.pageData().entries()) {
      if (item.checked) {
        result.options.push({vid: item.vid, mingzi: item.name});
      }
      if (this.data.optionOptions) {
        if (!result.optionOptions) {
          result.optionOptions = {};
        }
        const optionOption = this.optionOptions()[i];
        if (isTypeOf(optionOption, "object")) {
          delete optionOption[""];
        }
        if (!isEmpty(optionOption)) {
          result.optionOptions[item.vid] = optionOption;
        }
      }
    }
    if (this.checkedIdsOthers.size > 0) {
      const dataInOthers = await this.getOptions(
        {
          name: this.data.name,
          data: this.data.data,
          xinghao: this.data.xinghao,
          includeTingyong: true,
          values: Array.from(this.checkedIdsOthers),
          fields: ["vid"],
          nameField: this.data.nameField,
          info: this.data.info
        },
        [this.loaderIds.submitLoaderId],
        false
      );
      if (dataInOthers) {
        for (const item of dataInOthers.data || []) {
          result.options.push({vid: item.vid, mingzi: item.name});
        }
      }
    }
    this.dialogRef.close(result);
  }

  close() {
    this.dialogRef.close();
  }

  search(stayOnPage = false, refreshLocalOptions = false) {
    const paginator = this.paginator();
    if (paginator) {
      if (!stayOnPage) {
        paginator.pageIndex = 0;
      }
      this.getData(paginator.pageIndex + 1, refreshLocalOptions);
    } else {
      this.getData(undefined, refreshLocalOptions);
    }
  }

  changePage(event: PageEvent) {
    this.getData(event.pageIndex + 1);
  }

  emptyTypeName = "未分组";
  optionTypesManager = new FetchManager({types: [], map: new Map()}, async () => {
    const {typeFiltering, name, options} = this.data;
    const types: string[] = [];
    const map = new Map<number, string[]>();
    if (!typeFiltering) {
      return {types, map};
    }
    let records: TableDataBase[] | GetOptionsResultItem[] | undefined = options;
    if (!Array.isArray(records)) {
      records = await this.http.queryMySql({table: name, fields: [typeFiltering.field], withGuanlian: true});
    }
    let hasEmptyType = false;
    for (const record of records) {
      let types2: string | string[] = (record as any)[typeFiltering.field];
      if (!Array.isArray(types2)) {
        types2 = [types2];
      }
      types2 = types2.filter((v) => v && typeof v === "string");
      if (types2.length < 1) {
        hasEmptyType = true;
      }
      for (const type of types2) {
        if (!types.includes(type)) {
          types.push(type);
        }
      }
      map.set(record.vid, types2);
    }
    if (hasEmptyType) {
      types.unshift(this.emptyTypeName);
    }
    return {types, map};
  });
  activeOptionTypes = signal<string[]>([]);
  optionTypesInputInfo = computed(() => {
    const {typeFiltering} = this.data;
    if (!typeFiltering) {
      return null;
    }
    const info: InputInfo = {
      type: "select",
      label: "类型",
      appearance: "list",
      multiple: true,
      options: this.optionTypesManager.data().types
    };
    return info;
  });
  toggleActiveOptionType(type: string | null) {
    // const types = this.activeOptionTypes();
    // if (types.includes(type)) {
    //   this.activeOptionTypes.set(types.filter((v) => v !== type));
    // } else {
    //   this.activeOptionTypes.set([...types, type]);
    // }
    if (type) {
      if (!this.activeOptionTypes().includes(type)) {
        this.activeOptionTypes.set([type]);
        this.search();
      }
    } else {
      this.activeOptionTypes.set([]);
      this.search();
    }
  }

  searchValue = signal("");
  searchInputInfo = computed(() => {
    const onChange = (val: string) => {
      this.searchValue.set(val);
      this.search();
    };
    const info: InputInfo = {
      label: "搜索",
      type: "string",
      autoFocus: true,
      value: this.searchValue(),
      onInput: debounce(onChange, 500),
      onChange,
      clearable: true,
      style: {flex: "0 1 300px"}
    };
    return info;
  });
  async getOptions(params: GetOptionsParamsSingle, loader: Parameters<typeof this.spinner.show>, refreshLocalOptions: boolean) {
    let data: DataAndCount<GetOptionsResultItem[]> | null = null;
    const {options} = this.data;
    const activeOptionTypes = this.activeOptionTypes();
    const typesMap = this.optionTypesManager.data().map;
    if (Array.isArray(options)) {
      if (refreshLocalOptions) {
        const {refreshOptions} = this.data;
        this.spinner.show(...loader);
        if (typeof refreshOptions === "function") {
          const data2 = await refreshOptions();
          data = {data: data2, count: data2.length};
        } else {
          data = await this.http.getOptionsAndCount({...params, page: 1, limit: Infinity});
        }
        if (data) {
          options.length = 0;
          options.push(...(data.data || []));
        }
        this.spinner.hide(loader[0]);
      }
      const field = (params.fields?.[0] || "name") as keyof GetOptionsResultItem;
      const options2 = options.filter((v) => {
        if (params.values && !params.values.includes(v[field])) {
          return false;
        }
        if (activeOptionTypes.length > 0) {
          const types = typesMap.get(v.vid) || [];
          if (types.length < 1) {
            if (!activeOptionTypes.includes(this.emptyTypeName)) {
              return false;
            }
          } else {
            if (!activeOptionTypes.some((type) => types.includes(type))) {
              return false;
            }
          }
        }
        return queryString(this.searchValue(), v.name);
      });
      data = {data: options2, count: options2.length};
      this.showPaginator.set(false);
    } else {
      this.spinner.show(...loader);
      data = await this.http.getOptionsAndCount(params);
      this.spinner.hide(loader[0]);
      this.showPaginator.set(true);
    }
    return data;
  }

  async getData(page?: number, refreshLocalOptions = false) {
    const {checkedIdsCurr, checkedIdsOthers} = this;
    checkedIdsCurr.clear();
    let pageData = this.pageData();
    for (const {vid, checked} of pageData) {
      if (checked) {
        checkedIdsOthers.add(vid);
      }
    }
    const filter = cloneDeep(this.data.filter || {});
    const {typeFiltering} = this.data;
    const types = this.activeOptionTypes();
    if (typeFiltering && types.length > 0) {
      filter.where_in = {...filter.where_in, [typeFiltering.field]: types};
    }
    const data = await this.getOptions(
      {
        name: this.data.name,
        search: this.searchValue(),
        page,
        limit: this.paginator()?.pageSize,
        data: this.data.data,
        xinghao: this.data.xinghao,
        filter,
        fields: this.data.fields,
        nameField: this.data.nameField,
        info: this.data.info
      },
      [this.loaderIds.optionsLoader, {text: "获取CAD数据"}],
      refreshLocalOptions
    );
    this.length.set(data?.count || 0);
    pageData = (data?.data || []).map((v) => {
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
    pageData.sort((a, b) => {
      const getOrder = (v: typeof a) => (v.checked ? 0 : 1);
      return getOrder(a) - getOrder(b);
    });
    this.pageData.set(pageData);
    this.noImage.set(this.data.noImage || pageData.every((v) => !v.img));
    return data;
  }

  onCheckboxChange(i: number) {
    const {multi} = this.data;
    const items = this.pageData();
    const item = items[i];
    item.checked = !item.checked;
    const {checkedIdsCurr} = this;
    if (!multi && item.checked) {
      for (const item2 of items) {
        if (item !== item2) {
          item2.checked = false;
        }
      }
      checkedIdsCurr.clear();
    }
    this.pageData.set(items.map((v) => ({...v})));
    if (item.checked) {
      checkedIdsCurr.add(item.vid);
    } else {
      checkedIdsCurr.delete(item.vid);
    }
  }

  selectAll() {
    const pageData = this.pageData();
    const isAllSelected = pageData.every((v) => v.checked);
    for (const [i, item] of pageData.entries()) {
      const shouldChange = isAllSelected ? item.checked : !item.checked;
      if (shouldChange) {
        this.onCheckboxChange(i);
      }
    }
  }

  setDefaultValue(i: number) {
    const item = this.pageData()[i];
    if (!item.checked) {
      this.onCheckboxChange(i);
    }
    const {defaultValue} = this.data;
    if (!defaultValue) {
      return;
    }
    if (defaultValue.value === item.name) {
      defaultValue.value = "";
    } else {
      defaultValue.value = item.name;
    }
  }

  newTabChanged = signal(false);
  async editInNewTab() {
    const {openInNewTab, name} = this.data;
    if (!openInNewTab) {
      return;
    }
    const url = await this.http.getShortUrl(name);
    if (url) {
      window.open(url);
    }
    if (await this.message.newTabConfirm()) {
      this.newTabChanged.set(true);
      this.search(true, true);
    }
  }
}

export const openCadOptionsDialog = getOpenDialogFunc<CadOptionsComponent, CadOptionsInput, CadOptionsOutput>(CadOptionsComponent, {
  width: "80vw",
  height: "80vh"
});
