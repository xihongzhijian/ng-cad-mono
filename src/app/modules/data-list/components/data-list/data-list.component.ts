import {NgTemplateOutlet} from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTree, MatTreeModule} from "@angular/material/tree";
import {session} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {getValueString} from "@app/utils/get-value";
import {environment} from "@env";
import {downloadByString, getElementVisiblePercentage, ObjectOf, queryString, queryStringList, selectFiles, timeout} from "@lucilor/utils";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption, InputInfoSelect} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep, debounce} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {BehaviorSubject, filter, firstValueFrom} from "rxjs";
import {v4} from "uuid";
import {
  DataListItem,
  DataListNavData,
  DataListNavNameChangeEvent,
  DataListNavNodeRaw,
  DataListQueryItemField as DataListqueryItemFieldInfo,
  dataListQueryItemFieldsDefault as dataListqueryItemFieldInfosDefault
} from "./data-list.types";
import {
  DataListNavNode,
  findActiveDataListNavNode,
  getDataListNavNodeList,
  getDataListNavNodePath,
  getDataListNavNodesFlat,
  getNodePathSelect,
  moveDataListNavNode,
  sortDataListItems,
  sortDataListNavNodeList,
  updateDataListNavNodeList
} from "./data-list.utils";

@Component({
  selector: "app-data-list",
  imports: [
    InputComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTreeModule,
    NgScrollbarModule,
    NgTemplateOutlet,
    TypedTemplateDirective
  ],
  templateUrl: "./data-list.component.html",
  styleUrl: "./data-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataListComponent<T extends DataListItem = DataListItem> implements OnInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  navDataName = input.required<string>();
  navDataTitle = input.required<string>();
  itemsAllIn = input<T[]>([], {alias: "itemsAll"});
  queryItemFieldInfos = input<DataListqueryItemFieldInfo<T>[]>(dataListqueryItemFieldInfosDefault);
  items = model<T[]>([]);
  activeNavNode = model<DataListNavNode | null>(null);
  navNameChange = output<DataListNavNameChangeEvent>();

  production = environment.production;
  _inited$ = new BehaviorSubject(false);
  async untilInited() {
    if (!this._inited$.value) {
      await firstValueFrom(this._inited$.pipe(filter((v) => v)));
    }
  }

  async ngOnInit() {
    await this.getNavNodes();
    this._inited$.next(true);
    this._inited$.complete();
  }

  private _navCollection: CadCollection = "ngcadNavs";
  private _navDataId = "";
  navNodes = signal<DataListNavNode[]>([]);
  childrenAccessor = ({children}: DataListNavNode) => children || [];
  navNodehasChild = (_: number, node: DataListNavNode) => node.hasChild();
  navNodeTrackBy = (_: number, node: DataListNavNode) => node.id;
  navQuery = signal("");
  navQueryInputInfo = computed(() => {
    const info: InputInfo = {
      type: "string",
      label: "搜索",
      clearable: true,
      value: this.navQuery(),
      onInput: debounce((val) => {
        this.navQuery.set(val);
        this.filter();
      }, 200),
      style: {width: "160px"}
    };
    return info;
  });
  navNodesTree = viewChild.required<MatTree<DataListNavNode, DataListNavNode>>("navNodesTree");
  navNodesTreeEl = viewChild("navNodesTree", {read: ElementRef});
  navNodesScrollbar = viewChild<NgScrollbar>("navNodesScrollbar");

  private _navEditModeKey = "dataListNavEditMode";
  navEditMode = model<boolean>(session.load(this._navEditModeKey) || false);
  navEditModeEff = effect(() => {
    session.save(this._navEditModeKey, this.navEditMode());
  });
  toggleNavEditMode() {
    this.navEditMode.update((v) => !v);
  }

  async getNavNodes() {
    const name = this.navDataName();
    const dataList = await this.http.queryMongodb<DataListNavData>({
      collection: this._navCollection,
      where: {名字: name}
    });
    let data = dataList.at(0) || null;
    if (!data) {
      data = await this.http.mongodbInsert<DataListNavData>(this._navCollection, {名字: name, data: []});
    }
    if (data) {
      this._navDataId = data._id;
      this.navNodes.set(getDataListNavNodeList(data.data || []));
    } else {
      this._navDataId = "";
      this.navNodes.set([]);
    }
  }
  async setNavNodes() {
    if (!this._navDataId) {
      this.message.error("未找到数据");
      return;
    }
    const data = this.navNodes();
    sortDataListNavNodeList(data);
    updateDataListNavNodeList(data, this.itemsAll());
    this.navNodes.set([]);
    await timeout(0);
    this.navNodes.set(data);
    const activeNavNode = this.activeNavNode();
    if (activeNavNode) {
      this.activeNavNode.set(null);
      this.updateActiveNavNode(activeNavNode.name);
    }
    await this.http.mongodbUpdate<DataListNavData>(this._navCollection, {_id: this._navDataId, data: data.map((node) => node.export())});
  }
  updateActiveNavNode(type = this.activeNavNode()?.name) {
    if (!type) {
      return;
    }
    const node = findActiveDataListNavNode(this.navNodes(), type);
    if (node) {
      this.activeNavNode.set(node);
    }
  }

  async getNavNodeItem(node?: DataListNavNode, to?: DataListNavNode | null) {
    const id = node ? node.id : null;
    if (node) {
      node = cloneDeep(node);
    } else {
      node = new DataListNavNode({id: v4(), name: ""});
    }
    const names: string[] = [];
    const nodes = this.navNodes();
    for (const node2 of getDataListNavNodesFlat(nodes)) {
      if (id && node2.id === id) {
        continue;
      }
      if (!node2.isVirtual) {
        names.push(node2.name);
      }
    }

    const getter = new InputInfoWithDataGetter(node, {clearable: true});
    const nodePathSelect = getNodePathSelect(nodes, node, to);
    const form: InputInfo<DataListNavNode>[] = [
      getter.string("name", {
        label: "名字",
        validators: [
          Validators.required,
          (control) => {
            const val = control.value;
            if (names.includes(val)) {
              return {名字不能重复: true};
            }
            return null;
          }
        ]
      }),
      nodePathSelect.inputInfo,
      getter.number("order", {label: "排序"})
    ];
    const result = await this.message.form(form);
    if (result) {
      const {from, to: to2} = nodePathSelect.data;
      moveDataListNavNode(nodes, node, from, to2);
      this.activeNavNode.set(node);
      return node;
    }
    return null;
  }
  async addNavNode(nodeParent?: DataListNavNode) {
    const node = await this.getNavNodeItem(undefined, nodeParent);
    if (!node) {
      return;
    }
    await this.setNavNodes();
    setTimeout(() => {
      this.navNodesTree().expand(node);
    }, 0);
  }
  async editNavNode(node: DataListNavNode) {
    const node2 = await this.getNavNodeItem(node);
    if (node2) {
      const nameOld = node.name;
      Object.assign(node, node2);
      const nameNew = node.name;
      await this.setNavNodes();
      if (nameOld !== nameNew) {
        this.navNameChange.emit({before: nameOld, after: nameNew});
      }
    }
  }
  async removeNavNode(node: DataListNavNode) {
    if (node.children && node.children.length > 0) {
      await this.message.error(`【${node.name}】下面有子节点，不能删除`);
      return;
    }
    if (node.itemCount > 0) {
      await this.message.error(`【${node.name}】下面有数据，不能删除`);
      return;
    }
    if (!(await this.message.confirm(`是否确定删除【${node.name}】?`))) {
      return;
    }
    const remove = (list: DataListNavNode[]) => {
      const i = list.indexOf(node);
      if (i >= 0) {
        list.splice(i, 1);
        return true;
      } else {
        for (const item of list) {
          if (item.children && remove(item.children)) {
            return true;
          }
        }
      }
      return false;
    };
    remove(this.navNodes());
    await this.setNavNodes();
  }
  clickNavNode(node: DataListNavNode) {
    if (node.hasChild()) {
      this.navNodesTree().toggle(node);
      setTimeout(() => {
        this.filter();
      }, 0);
    } else {
      this.activeNavNode.set(node);
    }
  }

  itemQuery = signal("");
  itemQueryTypes = ["搜索所有分类", "搜索选中分类"] as const;
  itemQueryType = signal<(typeof this.itemQueryTypes)[number]>("搜索选中分类");
  itemQueryTypeField = signal<keyof T>("name");
  itemQueryTypeFieldEff = effect(() => {
    const fields = this.queryItemFieldInfos().map((v) => v.field);
    if (!fields.includes(this.itemQueryTypeField())) {
      this.itemQueryTypeField.set(fields.at(0) || "name");
    }
  });
  itemQueryInputInfos = computed(() => {
    const infos: InputInfo[] = [
      {
        type: "select",
        label: "搜索类型",
        options: this.itemQueryTypes.slice(),
        multiple: false,
        value: this.itemQueryType(),
        onChange: (val) => {
          this.itemQueryType.set(val);
          this.filter();
        },
        style: {width: "170px"}
      },
      {
        type: "select",
        label: "搜索字段",
        options: this.queryItemFieldInfos().map<InputInfoOption<keyof T>>((v) => {
          return {value: v.field, label: v.title || String(v.field)};
        }),
        multiple: false,
        value: this.itemQueryTypeField(),
        onChange: (val) => {
          this.itemQueryTypeField.set(val);
          this.filter();
        },
        style: {width: "200px"}
      } satisfies InputInfoSelect<keyof T, keyof T>,
      {
        type: "string",
        label: "搜索",
        clearable: true,
        value: this.itemQuery(),
        onInput: debounce((val) => {
          this.itemQuery.set(val);
          this.filter();
        }, 200),
        style: {width: "160px"}
      }
    ];
    return infos;
  });

  itemsAll = signal<T[]>([]);
  sortItems = signal(true);
  toggleSortItems() {
    this.sortItems.update((v) => !v);
  }
  itemsAllEff = effect(() => {
    let itemsAll = this.itemsAllIn();
    if (this.sortItems()) {
      itemsAll = sortDataListItems(itemsAll);
    }
    this.itemsAll.set(itemsAll);
    untracked(() => this._onItemsAllChange(itemsAll));
  });
  private async _onItemsAllChange(itemsAll: T[]) {
    await this.untilInited();
    updateDataListNavNodeList(this.navNodes(), itemsAll);
    this.filter();
  }

  itemsScrollbar = viewChild<NgScrollbar>("itemsScrollbar");
  scrollToItem(selector: string) {
    const scrollbar = this.itemsScrollbar();
    if (!scrollbar) {
      return;
    }
    const el = scrollbar.nativeElement.querySelector(selector);
    if (el instanceof HTMLElement) {
      scrollbar.scrollToElement(el);
    }
  }
  getItemIndex(compareFn: (item: T) => boolean) {
    return this.itemsAll().findIndex((item) => compareFn(item));
  }

  activeNavNodeEff = effect(() => {
    const node = this.activeNavNode();
    untracked(() => this._onActiveNavNodeChange(node));
  });
  private async _onActiveNavNodeChange(activeNode: DataListNavNode | null) {
    await this.untilInited();
    this.filter();
    if (!activeNode) {
      return;
    }
    const treeEl = this.navNodesTreeEl()?.nativeElement;
    const path = getDataListNavNodePath(this.navNodes(), activeNode);
    for (const [i, node] of path.entries()) {
      this.navNodesTree().expand(node);
      if (i === path.length - 1) {
        const nodeEl = treeEl?.querySelector(`[data-id="${node.id}"]`);
        if (nodeEl instanceof HTMLElement && getElementVisiblePercentage(nodeEl) < 1) {
          this.navNodesScrollbar()?.scrollToElement(nodeEl);
        }
      }
    }
  }

  filter() {
    const navQuery = this.navQuery();
    const nodes = this.navNodes().slice();
    const activeNode = this.activeNavNode();
    const isActiveNode = (node: DataListNavNode) => activeNode && node.id === activeNode.id;
    const filterNodes = (nodes2: DataListNavNode[]) => {
      for (const node of nodes2) {
        if (node.children && node.children.length > 0) {
          filterNodes(node.children);
          node.hidden = node.children.every((v) => v.hidden);
        } else {
          node.hidden = !isActiveNode(node) && !queryStringList(navQuery, [node.name]);
        }
      }
    };
    filterNodes(nodes);

    const type = activeNode?.name;
    const counts: ObjectOf<number> = {};
    const itemsAll = this.itemsAll();
    const itemQuery = this.itemQuery();
    const itemQueryType = this.itemQueryType();
    const itemQueryField = this.itemQueryTypeField();
    const navNodesHideEmpty = !!itemQuery;
    const items: T[] = [];
    for (const item of itemsAll) {
      let isMatched = true;
      if (itemQueryType === "搜索选中分类" && activeNode && !activeNode.hidden && navNodesHideEmpty) {
        isMatched = item.type === type;
      }
      if (itemQueryField && itemQueryField in item) {
        const val = getValueString(item[itemQueryField]);
        isMatched = isMatched && queryString(itemQuery, val);
      } else {
        isMatched = false;
      }
      if (isMatched) {
        if (item.type === type) {
          items.push(item);
        }
        if (item.type in counts) {
          counts[item.type]++;
        } else {
          counts[item.type] = 1;
        }
      }
    }
    this.items.set(items);

    const setCount = (list: DataListNavNode[]) => {
      let countTotal = 0;
      for (const node of list) {
        let count = 0;
        if (node.children && node.children.length > 0) {
          count += setCount(node.children);
        } else if (node.name in counts) {
          count = counts[node.name];
        }
        node.itemCount = count;
        countTotal += count;
        if (navNodesHideEmpty && count < 1 && !isActiveNode(node)) {
          node.hidden = true;
        }
      }
      return countTotal;
    };
    setCount(nodes);
    this.navNodes.set(nodes);
  }

  async importNavNodes() {
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    let nodes: DataListNavNodeRaw[];
    try {
      nodes = JSON.parse(await file.text());
    } catch (error) {
      console.error(error);
      this.message.error("文件格式错误");
      return;
    }
    const dataList = getDataListNavNodeList(nodes);
    this.navNodes.set(dataList);
    this.setNavNodes();
  }
  async exportNavNodes() {
    const nodes = this.navNodes().map((node) => node.export());
    downloadByString(JSON.stringify(nodes), {filename: `${this.navDataTitle()}.json`});
  }
}
