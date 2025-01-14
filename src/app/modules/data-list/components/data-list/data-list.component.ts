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
import {environment} from "@env";
import {downloadByString, getElementVisiblePercentage, ObjectOf, queryStringList, selectFiles, timeout} from "@lucilor/utils";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep, debounce} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {BehaviorSubject, filter, firstValueFrom} from "rxjs";
import {v4} from "uuid";
import {DataListItem, DataListNavData, DataListNavNameChangeEvent, DataListNavNodeRaw} from "./data-list.types";
import {
  DataListNavNode,
  findActiveDataListNavNode,
  getDataListNavNodeList,
  getDataListNavNodePath,
  getDataListNavNodesFlat,
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
  navDataSource = signal<DataListNavNode[]>([]);
  childrenAccessor = ({children}: DataListNavNode) => children || [];
  navNodehasChild = (_: number, node: DataListNavNode) => node.hasChild();
  navNodeTrackBy = (_: number, node: DataListNavNode) => node.id;
  navNodesHideEmpty = computed(() => !!this.itemQuery());
  navQuery = signal("");
  navQueryInputInfo = computed<InputInfo>(() => ({
    type: "string",
    label: "搜索",
    clearable: true,
    value: this.navQuery(),
    onInput: debounce((val) => {
      this.navQuery.set(val);
      this.filterNavNodes();
    }, 200),
    style: {width: "100px"}
  }));
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
      this.navDataSource.set(getDataListNavNodeList(data.data || []));
    } else {
      this._navDataId = "";
      this.navDataSource.set([]);
    }
  }
  async setNavNodes() {
    if (!this._navDataId) {
      this.message.error("未找到数据");
      return;
    }
    const data = this.navDataSource();
    sortDataListNavNodeList(data);
    updateDataListNavNodeList(data, this.itemsAll());
    this.navDataSource.set([]);
    await timeout(0);
    this.navDataSource.set(data);
    const activeNavNode = this.activeNavNode();
    if (activeNavNode) {
      this.activeNavNode.set(null);
      this.updateActiveNavNode(activeNavNode.name);
    }
    await this.http.mongodbUpdate<DataListNavData>(this._navCollection, {_id: this._navDataId, data: data.map((node) => node.export())});
  }
  filterNavNodes() {
    const needle = this.navQuery();
    const nodes = this.navDataSource().slice();
    const filter = (list: DataListNavNode[]) => {
      for (const node of list) {
        if (node.children && node.children.length > 0) {
          filter(node.children);
          node.hidden = node.children.every((v) => v.hidden);
        } else {
          node.hidden = !queryStringList(needle, [node.name]);
        }
      }
    };
    filter(nodes);
    this.navDataSource.set(nodes);
  }
  updateActiveNavNode(type = this.activeNavNode()?.name) {
    if (!type) {
      return;
    }
    const node = findActiveDataListNavNode(this.navDataSource(), type);
    if (node) {
      this.activeNavNode.set(node);
    }
  }

  async getNavNodeItem(data?: DataListNavNode, to?: DataListNavNode | null) {
    const id = data ? data.id : null;
    if (data) {
      data = cloneDeep(data);
    } else {
      data = new DataListNavNode({id: v4(), name: "", children: []});
    }
    const names: string[] = [];
    const nodes = this.navDataSource();
    for (const node of getDataListNavNodesFlat(nodes)) {
      if (id && node.id === id) {
        continue;
      }
      if (!node.isVirtual) {
        names.push(node.name);
      }
    }

    const pathOptions: string[] = [];
    const pathMap = new Map<string, DataListNavNode | null>();
    const stringifyPath = (path: DataListNavNode[]) => path.map((v) => v.name).join("/");
    const getNodePathInfos = function* (node: DataListNavNode, parentPath: DataListNavNode[] = []): Generator<{path: DataListNavNode[]}> {
      if (data && node.id === data.id) {
        return;
      }
      const path = [...parentPath, node];
      yield {path};
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          yield* getNodePathInfos(child, path);
        }
      }
    };
    for (const node of nodes) {
      if (node.isVirtual) {
        continue;
      }
      for (const info of getNodePathInfos(node)) {
        const node2 = info.path.at(-1);
        if (node2) {
          const name = stringifyPath(info.path);
          pathOptions.push(name);
          pathMap.set(name, node2);
        }
      }
    }
    let path2: ReturnType<typeof getDataListNavNodePath>;
    if (to) {
      path2 = getDataListNavNodePath(nodes, to);
    } else {
      path2 = getDataListNavNodePath(nodes, data).slice(0, -1);
    }
    const path = stringifyPath(path2);
    const from = path2.at(-1) || null;
    if (!to) {
      to = from;
    }

    const getter = new InputInfoWithDataGetter(data);
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
      {
        type: "select",
        label: "上一级分类",
        clearable: true,
        options: pathOptions,
        multiple: false,
        optionsDialog: {useLocalOptions: true},
        value: path,
        onChange: (val) => {
          to = pathMap.get(val);
        }
      },
      getter.number("order", {label: "排序"})
    ];
    const result = await this.message.form(form);
    if (result) {
      moveDataListNavNode(nodes, data, from, to);
      this.activeNavNode.set(data);
      return data;
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
    remove(this.navDataSource());
    await this.setNavNodes();
  }
  clickNavNode(node: DataListNavNode) {
    if (node.hasChild()) {
      this.navNodesTree().toggle(node);
    } else {
      this.activeNavNode.set(node);
    }
  }

  itemQuery = signal("");
  itemQueryInputInfo = computed(() => {
    const info: InputInfo = {
      type: "string",
      label: "搜索",
      clearable: true,
      value: this.itemQuery(),
      onInput: debounce((val) => {
        this.itemQuery.set(val);
        this.filterItems();
      }, 200)
    };
    return info;
  });

  itemsAll = signal<T[]>([]);
  itemsAllEff = effect(() => {
    const itemsAll = sortDataListItems(this.itemsAllIn());
    this.itemsAll.set(itemsAll);
    untracked(() => this._onItemsAllChange(itemsAll));
  });
  private async _onItemsAllChange(itemsAll: T[]) {
    await this.untilInited();
    updateDataListNavNodeList(this.navDataSource(), itemsAll);
    this.filterNavNodes();
    this.filterItems();
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
    this.filterItems();
    if (!activeNode) {
      return;
    }
    const treeEl = this.navNodesTreeEl()?.nativeElement;
    const path = getDataListNavNodePath(this.navDataSource(), activeNode);
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

  filterItems() {
    const type = this.activeNavNode()?.name;
    const counts: ObjectOf<number> = {};
    const itemsAll = this.itemsAll();
    const needle = this.itemQuery();
    const items: T[] = [];
    for (const item of itemsAll) {
      if (queryStringList(needle, [item.name, item.type])) {
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

    let currNode: DataListNavNode | undefined;
    const setCount = (node: DataListNavNode) => {
      let count = 0;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          setCount(child);
          count += child.itemCount || 0;
        }
      } else if (node.name in counts) {
        count = counts[node.name];
      }
      node.itemCount = count;
      if (this.navNodesHideEmpty()) {
        node.hidden = count < 1;
      } else {
        node.hidden = false;
      }
      if (!node.hasChild()) {
        if (node.name === type) {
          currNode = node;
        }
      }
    };
    const nodes = this.navDataSource().slice();
    for (const node of nodes) {
      setCount(node);
    }
    this.navDataSource.set(nodes);
    if (currNode && !currNode.hidden) {
      this.activeNavNode.set(currNode);
    }
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
    this.navDataSource.set(dataList);
    this.setNavNodes();
  }
  async exportNavNodes() {
    const nodes = this.navDataSource().map((node) => node.export());
    downloadByString(JSON.stringify(nodes), {filename: `${this.navDataTitle()}.json`});
  }
}
