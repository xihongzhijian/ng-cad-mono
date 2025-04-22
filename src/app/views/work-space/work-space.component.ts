import {Component, computed, HostBinding, inject, OnInit, signal} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {setGlobal} from "@app/app.common";
import {ItemsManager} from "@app/utils/items-manager";
import {environment} from "@env";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/input.types";
import {convertOptions, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {DefaultWorkDataFormInfo, DefaultWorkDataListItem, WorkSpaceData} from "./work-space.types";
import {WorkSpaceManager} from "./work-space.utils";

@Component({
  selector: "app-work-space",
  imports: [MatButtonModule, NgScrollbarModule],
  templateUrl: "./work-space.component.html",
  styleUrl: "./work-space.component.scss"
})
export class WorkSpaceComponent implements OnInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  constructor() {
    setGlobal("workSpace", this);
  }

  ngOnInit() {
    this.refresh();
  }

  manager = new WorkSpaceManager();
  defaultWorkDataFormInfo = signal<DefaultWorkDataFormInfo | null>(null);

  production = environment.production;
  editXiaodaohangsDocs = computed(() => this.defaultWorkDataFormInfo()?.xiaodaohangsDocs);

  showMoreButtons = signal(!this.production);
  toggleShowMoreButtons() {
    this.showMoreButtons.update((v) => !v);
  }

  async refresh() {
    const data = await this.http.getData<WorkSpaceData>("jichu/work/getWorkData");
    this.manager.import(data);
    this.defaultWorkDataFormInfo.set(await this.http.getData<DefaultWorkDataFormInfo | null>("jichu/work/getDefaultWorkDataFormInfo"));
  }

  async editType(i: number) {
    const types = this.manager.types();
    const typePrev = types[i];
    const type = cloneDeep(typePrev);
    const getter = new InputInfoWithDataGetter(type);
    const form = [getter.string("name", {label: "名字"}), getter.number("order", {label: "排序"})];
    const result = await this.message.form(form);
    if (result) {
      const typeExisted = types.find((v, j) => v.name === type.name && i !== j);
      const favorites = this.manager.favorites();
      if (typeExisted) {
        if (!(await this.message.confirm("该分类已存在，是否合并？"))) {
          return;
        }
        if (typeof typeExisted.order !== "number") {
          typeExisted.order = type.order;
        }
        for (const item of favorites) {
          if (item.type === type.name) {
            item.type = typeExisted.name;
          }
        }
        types.splice(i, 1);
      } else {
        types[i] = type;
      }
      if (typePrev.name !== type.name) {
        for (const item of favorites) {
          if (item.type === typePrev.name) {
            item.type = type.name;
          }
        }
      }
      if (typePrev.order !== type.order) {
        if (typeof type.order !== "number") {
          delete type.order;
        }
      }
      this.manager.favorites.update((v) => [...v]);
      await this.submit();
    }
  }

  async editFavorite(i: number) {
    const types = this.manager.types();
    const favorites = this.manager.favorites();
    const favoritePrev = favorites[i];
    const favorite = cloneDeep(favoritePrev);
    const typeNames = types.map((v) => v.name);
    const getter = new InputInfoWithDataGetter(favorite);
    const form = [
      getter.string("type", {label: "分类", options: typeNames, fixedOptions: typeNames}),
      getter.number("order", {label: "排序", autoFocus: true})
    ];
    const result = await this.message.form(form);
    if (result) {
      favorites[i] = favorite;
      this.manager.favorites.update((v) => [...v]);
      await this.submit();
    }
  }

  async removeFavorite(i: number) {
    const favorites = this.manager.favorites();
    const favorite = favorites[i];
    if (!(await this.message.confirm(`确定删除【${favorite.xiao}】？`))) {
      return;
    }
    favorites.splice(i, 1);
    this.manager.favorites.update((v) => [...v]);
    await this.submit();
  }

  async openFavorite(i: number) {
    const favorites = this.manager.favorites();
    const favorite = favorites[i];
    const parent = window.parent as any;
    if (parent.app) {
      await parent.app.openTab(favorite.id, 1);
    } else {
      const url = await this.http.getShortUrl(favorite.xiao);
      if (url) {
        window.open(url);
      }
    }
  }

  async submit() {
    const data = this.manager.export();
    await this.http.getData("jichu/work/setWorkData", {data});
  }

  async clear() {
    if (!(await this.message.confirm("是否清空当前数据？"))) {
      return;
    }
    this.manager.clear();
    await this.submit();
  }

  async import() {
    const file = (await selectFiles({accept: ".json"}))?.[0];
    if (!file) {
      return;
    }
    let data: WorkSpaceData | null = null;
    try {
      data = JSON.parse(await file.text());
    } catch (e) {
      console.error(e);
    }
    if (!data) {
      return;
    }
    data.user = this.manager.user();
    this.manager.import(data);
    await this.submit();
  }

  export() {
    const data = this.manager.export();
    delete data.user;
    downloadByString(JSON.stringify(data), {filename: "工作台.json"});
  }

  async loadDefaultWorkData(data: WorkSpaceData) {
    this.manager.import(data);
    await this.submit();
  }

  async removeDefaultWorkData(key: string, juese: string | null = null, confirm = false) {
    if (confirm && !(await this.message.confirm("是否确定删除？"))) {
      return;
    }
    const arr = key.split(".");
    if (arr.length === 2) {
      key = arr[0];
      juese = arr[1];
    }
    await this.http.getData("jichu/work/unsetDefaultWorkData", {key, juese});
    await this.defaultWorkDataListManager.fetch(true);
  }

  getDefaultWorkDataForm(type: "set" | "unset") {
    const values = {key: "", juese: ""};
    const form: InputInfo<typeof values>[] = [];
    const {defaultWorkDataPathKeys, jueses} = this.defaultWorkDataFormInfo() || {};
    const labelKey = type === "set" ? "labelSet" : "labelUnset";
    if (defaultWorkDataPathKeys) {
      form.push({
        type: "select",
        label: defaultWorkDataPathKeys[labelKey],
        options: convertOptions(defaultWorkDataPathKeys.options),
        model: {data: values, key: "key"},
        validators: Validators.required,
        onChange: (val: string) => {
          const hasJuese = val === "角色";
          form[1].hidden = !hasJuese;
          form[1].validators = hasJuese ? Validators.required : undefined;
        }
      });
    }
    if (jueses) {
      form.push({
        type: "string",
        label: jueses[labelKey],
        options: convertOptions(jueses.options),
        optionRequired: true,
        model: {data: values, key: "juese"},
        hidden: true
      });
    }
    return {form, values};
  }

  async setDefaultWorkData() {
    const {form, values} = this.getDefaultWorkDataForm("set");
    const result = await this.message.form(form);
    if (result) {
      const data = this.manager.export();
      await this.http.getData("jichu/work/setDefaultWorkData", {...values, data});
      await this.defaultWorkDataListManager.fetch(true);
    }
  }

  async unsetDefaultWorkData() {
    const {form, values} = this.getDefaultWorkDataForm("unset");
    const result = await this.message.form(form);
    if (result) {
      await this.removeDefaultWorkData(values.key, values.juese);
    }
  }

  async importDefaultWorkData() {
    if (!(await this.message.confirm("加载默认配置会覆盖当前配置，是否继续？"))) {
      return;
    }
    const data = await this.http.getData<WorkSpaceData>("jichu/work/getDefaultWorkData");
    if (data) {
      await this.loadDefaultWorkData(data);
    }
  }

  defaultWorkDataListManager = new ItemsManager(
    async () => {
      const items = await this.http.getData<DefaultWorkDataListItem[]>("jichu/work/getDefaultWorkDataList");
      return items || [];
    },
    (a, b) => a.key === b.key
  );
  defaultWorkDataList = this.defaultWorkDataListManager.items;

  showDefaultWorkDataList = signal(false);
  async toggleShowDefaultWorkDataList() {
    this.showDefaultWorkDataList.update((v) => !v);
  }
}
