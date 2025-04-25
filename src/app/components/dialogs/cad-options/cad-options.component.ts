import {AfterViewInit, Component, computed, effect, forwardRef, HostBinding, inject, Inject, signal, viewChild} from "@angular/core";
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
import {cloneDeep, debounce, difference, differenceWith, isEmpty, unionWith} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {ImageComponent} from "../../../modules/image/components/image/image.component";
import {InputComponent} from "../../../modules/input/components/input.component";
import {SpinnerComponent} from "../../../modules/spinner/components/spinner/spinner.component";
import {getOpenDialogFunc} from "../dialog.common";
import {CadOptionsInput, CadOptionsOutput} from "./cad-options.types";

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
  ]
})
export class CadOptionsComponent implements AfterViewInit {
  private http = inject(CadDataService);
  private spinner = inject(SpinnerService);
  private message = inject(MessageService);

  @HostBinding("class") class = ["ng-page"];

  pageData = signal<GetOptionsResultItem[]>([]);
  length = signal(0);
  pageSizeOptions = signal([50, 100, 200, 500]);
  pageSize = signal(100);
  loaderIds = {optionsLoader: "cadOptions", submitLoaderId: "cadOptionsSubmit"};

  constructor(
    public dialogRef: MatDialogRef<CadOptionsComponent, CadOptionsOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadOptionsInput
  ) {}

  async ngAfterViewInit() {
    await timeout(0);
    await this.getData(1);
  }

  filePathUrl = filePathUrl;
  paginator = viewChild(MatPaginator);
  showPaginator = signal(true);

  noImage1 = computed(() => {
    if (this.data.noImage) {
      return true;
    }
    const items = this.pageData();
    return items.every((v) => !v.img);
  });
  noImage2 = signal(true);
  toggleNoImage2() {
    this.noImage2.update((v) => !v);
  }
  noImage2Count = signal(0);
  noImage2CountEff = effect(() => {
    if (!this.noImage2()) {
      this.noImage2Count.update((v) => v + 1);
    }
  });
  noImage = computed(() => this.noImage1() || this.noImage2());

  checkedItems = signal<GetOptionsResultItem[]>([]);

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
    const checkedItems = this.checkedItems().slice();
    if (this.data.defaultValue) {
      const {value, required} = this.data.defaultValue;
      if (required && !value && checkedItems.length > 1) {
        this.message.error("请选择默认值");
        return;
      }
      result.defaultValue = value;
    }
    result.options = [];
    const {checkedItems: checkedNames = [], checkedVids = []} = this.data;
    const checkedNames2: typeof checkedNames = [];
    const checkedVids2: typeof checkedVids = [];
    for (const item of checkedItems) {
      checkedNames2.push(item.name);
      checkedVids2.push(item.vid);
      result.options.push({vid: item.vid, mingzi: item.name});
      if (this.data.optionOptions) {
        if (!result.optionOptions) {
          result.optionOptions = {};
        }
        const optionOption = this.optionOptionsCache.get(String(item.vid));
        if (optionOption && isTypeOf(optionOption, "object")) {
          delete optionOption[""];
        }
        if (!isEmpty(optionOption)) {
          result.optionOptions[item.vid] = optionOption;
        }
      }
    }

    const getOptions = async (field: string, values: any[]) => {
      const res = await this.getOptions(
        {
          name: this.data.name,
          data: this.data.data,
          xinghao: this.data.xinghao,
          includeTingyong: true,
          values,
          fields: [field],
          nameField: this.data.nameField,
          info: this.data.info
        },
        [this.loaderIds.submitLoaderId],
        false
      );
      return res?.data || [];
    };
    const checkedItemsInited = this._checkedItemsInited.values();
    const checkedNames3: typeof checkedNames = [];
    const checkedVids3: typeof checkedVids = [];
    for (const item of checkedItemsInited) {
      checkedNames3.push(item.name);
      checkedVids3.push(item.vid);
    }
    const checkedNames4 = difference(checkedNames, checkedNames2, checkedNames3);
    const checkedVids4 = difference(checkedVids, checkedVids2, checkedVids3);
    if (checkedNames4.length > 0) {
      checkedItems.push(...(await getOptions("mingzi", checkedNames4)));
    }
    if (checkedVids4.length > 0) {
      checkedItems.push(...(await getOptions("vid", checkedVids4)));
    }

    for (const item of checkedItems) {
      if (!result.options.some((v) => v.vid === item.vid)) {
        result.options.push({vid: item.vid, mingzi: item.name});
      }
      if (this.data.optionOptions) {
        if (!result.optionOptions) {
          result.optionOptions = {};
        }
        const optionOption = this.optionOptionsCache.get(String(item.vid));
        if (optionOption && isTypeOf(optionOption, "object")) {
          delete optionOption[""];
        }
        if (!isEmpty(optionOption)) {
          result.optionOptions[item.vid] = optionOption;
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

  private _checkedItemsInited = new Map<number, GetOptionsResultItem>();
  async getData(page?: number, refreshLocalOptions = false) {
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
    const pageData = data?.data || [];
    const checkedItems = this.checkedItems();
    for (const item of pageData) {
      const i = checkedItems.findIndex((v) => v.vid === item.vid);
      if (i >= 0) {
        checkedItems[i] = item;
      }
    }
    const {checkedItems: checkedNames, checkedVids} = this.data;
    for (const item of pageData) {
      if (checkedItems.some((v) => v.vid === item.vid) || this._checkedItemsInited.has(item.vid)) {
        continue;
      }
      if (checkedNames && checkedNames.includes(item.name)) {
        checkedItems.push(item);
        this._checkedItemsInited.set(item.vid, item);
      }
      if (checkedVids && checkedVids.includes(item.vid)) {
        checkedItems.push(item);
        this._checkedItemsInited.set(item.vid, item);
      }
    }
    this.checkedItems.set([...checkedItems]);
    pageData.sort((a, b) => {
      const getOrder = (v: typeof a) => (checkedItems.some((v2) => v2.vid === v.vid) ? 0 : 1);
      return getOrder(a) - getOrder(b);
    });
    this.pageData.set(pageData);
    return data;
  }

  onCheckboxChange(i: number) {
    const {multi} = this.data;
    const items = this.pageData();
    const item = items[i];
    let checkedItems = this.checkedItems();
    if (checkedItems.some((v) => v.vid === item.vid)) {
      checkedItems = differenceWith(checkedItems, [item], (a, b) => a.vid === b.vid);
    } else {
      if (multi) {
        checkedItems = unionWith(checkedItems, [item], (a, b) => a.vid === b.vid);
      } else {
        checkedItems = [item];
      }
    }
    this.checkedItems.set(checkedItems);
  }

  selectAll() {
    const items = this.pageData();
    const checkedItems = this.checkedItems();
    const isAllSelected = items.every((v) => checkedItems.some((v2) => v2.vid === v.vid));
    if (isAllSelected) {
      this.checkedItems.set(differenceWith(checkedItems, items, (a, b) => a.vid === b.vid));
    } else {
      this.checkedItems.set(unionWith(checkedItems, items, (a, b) => a.vid === b.vid));
    }
  }

  setDefaultValue(i: number) {
    const item = this.pageData()[i];
    const checkedItems = this.checkedItems();
    if (!checkedItems.some((v) => v.vid === item.vid)) {
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
