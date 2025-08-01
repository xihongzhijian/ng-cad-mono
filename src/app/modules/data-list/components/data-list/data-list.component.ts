import {NgTemplateOutlet} from "@angular/common";
import {
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
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTree, MatTreeModule} from "@angular/material/tree";
import {session} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {getNamesStr} from "@app/utils/error-message";
import {getValueString} from "@app/utils/get-value";
import {CustomValidators} from "@app/utils/input-validators";
import {environment} from "@env";
import {downloadByString, getElementVisiblePercentage, queryStringList, selectFiles, timeout, waitFor} from "@lucilor/utils";
import {ClickStopPropagationDirective} from "@modules/directives/click-stop-propagation.directive";
import {TypedTemplateDirective} from "@modules/directives/typed-template.directive";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep, debounce, difference, union} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {BehaviorSubject, filter, firstValueFrom, lastValueFrom, Subject, take} from "rxjs";
import {v4} from "uuid";
import {
  DataListItem,
  DataListItemQuery,
  DataListNavData,
  DataListNavNameChangeEvent,
  DataListNavNodeRaw,
  DataListQueryItemField,
  dataListQueryItemFieldsDefault,
  NodeSelectorMode
} from "./data-list.types";
import {
  DataListNavNode,
  findActiveDataListNavNode,
  findDataListNavNode,
  findDataListNavNodes,
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
    ClickStopPropagationDirective,
    FloatingDialogModule,
    InputComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatIconModule,
    MatTreeModule,
    NgScrollbarModule,
    NgTemplateOutlet,
    TypedTemplateDirective
  ],
  templateUrl: "./data-list.component.html",
  styleUrl: "./data-list.component.scss"
})
export class DataListComponent<T extends DataListItem = DataListItem> implements OnInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  navDataName = input.required<string>();
  navDataTitle = input.required<string>();
  itemsAllIn = input<T[]>([], {alias: "itemsAll"});
  queryItemFieldInfos = input<DataListQueryItemField<T>[]>(dataListQueryItemFieldsDefault);
  selectedNavNodes = model<DataListNavNode[]>([]);
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
        this.filterNavNodes();
      }, 200),
      style: {width: "160px"}
    };
    return info;
  });
  navNodesTree = viewChild.required<MatTree<DataListNavNode, DataListNavNode>>("navNodesTree");
  navNodesTreeEl = viewChild.required<unknown, ElementRef<HTMLElement>>("navNodesTree", {read: ElementRef});
  navNodesScrollbar = viewChild.required<NgScrollbar>("navNodesScrollbar");

  private _navEditModeKey = "dataListNavEditMode";
  navEditMode = model<boolean>(session.load(this._navEditModeKey) || false);
  navEditModeEff = effect(() => {
    session.save(this._navEditModeKey, this.navEditMode());
  });
  toggleNavEditMode() {
    this.navEditMode.update((v) => !v);
  }

  selectNavNode(node: DataListNavNode) {
    const nodes = this.selectedNavNodes();
    if (nodes.includes(node)) {
      this.selectedNavNodes.set(nodes.filter((v) => v !== node));
    } else {
      this.selectedNavNodes.set([...nodes, node]);
    }
  }
  selectNavNodeChildren(node: DataListNavNode) {
    const nodes = this.selectedNavNodes();
    const children = getDataListNavNodesFlat(node.children || []).toArray();
    if (children.every((v) => nodes.includes(v))) {
      this.selectedNavNodes.set(nodes.filter((v) => !children.includes(v)));
    } else {
      this.selectedNavNodes.set([...nodes, ...children]);
    }
  }
  selectNavNodes(nodes: DataListNavNode[], recursive?: boolean) {
    const selectedNavNodes = this.selectedNavNodes();
    let allNodes: DataListNavNode[];
    if (recursive) {
      allNodes = getDataListNavNodesFlat(nodes).toArray();
    } else {
      allNodes = nodes;
    }
    if (allNodes.every((v) => selectedNavNodes.includes(v))) {
      this.selectedNavNodes.set(difference(selectedNavNodes, allNodes));
    } else {
      this.selectedNavNodes.set(union(selectedNavNodes, allNodes));
    }
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
    await this.http.mongodbUpdate<DataListNavData>(
      this._navCollection,
      {_id: this._navDataId, data: data.map((node) => node.export())},
      {},
      {spinner: false}
    );
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

  nodeSelector = signal<{
    mode: NodeSelectorMode;
    nodes: DataListNavNode[];
    title: string;
    currentNode: DataListNavNode | null;
    selectedNode: DataListNavNode | null;
    excludeIds?: string[];
  } | null>(null);
  nodeSelectorClose$ = new Subject<{node: DataListNavNode | null; submit: boolean}>();
  nodeSelectorQuery = signal("");
  nodeSelectorQueryInputInfo = computed(() => {
    const info: InputInfo = {
      type: "string",
      label: "搜索",
      clearable: true,
      value: this.nodeSelectorQuery(),
      onInput: debounce((val) => {
        this.nodeSelectorQuery.set(val);
        this.filterNodeSelectorNodes();
      }, 200)
    };
    return info;
  });
  nodeSelectorTree = viewChild<MatTree<DataListNavNode, DataListNavNode>>("nodeSelectorTree");
  nodeSelectorTreeEl = viewChild("nodeSelectorTree", {read: ElementRef});
  nodeSelectorScrollbar = viewChild<NgScrollbar>("nodeSelectorScrollbar");
  filterNodeSelectorNodes() {
    const selector = this.nodeSelector();
    if (!selector) {
      return;
    }
    const {nodes, excludeIds} = selector;
    const query = this.nodeSelectorQuery();
    selector.nodes = this.filterNodes(nodes, query, null, false, (node) => {
      if (excludeIds?.includes(node.id)) {
        return false;
      }
      if (node.isVirtual) {
        return false;
      }
      return true;
    });
  }
  updateNodeSelectorEff = effect(() => {
    this.navNodes();
    untracked(() => this.updateNodeSelector());
  });
  async updateNodeSelector() {
    const selector = this.nodeSelector();
    if (!selector) {
      return;
    }
    const nodes = cloneDeep(this.navNodes());
    selector.nodes = nodes;
    selector.currentNode = findDataListNavNode(nodes, (v) => v.id === selector.currentNode?.id) || null;
    selector.selectedNode = findDataListNavNode(nodes, (v) => v.id === selector.selectedNode?.id) || null;
    this.filterNodeSelectorNodes();
  }
  async openNodeSelector(mode: NodeSelectorMode, title: string, selectedNode: DataListNavNode | null, excludeIds?: string[]) {
    this.nodeSelector.set({mode, nodes: [], title, currentNode: selectedNode, selectedNode, excludeIds});
    this.updateNodeSelector();
  }
  async closeNodeSelector(submit: boolean, moveToRoot = false) {
    const selector = this.nodeSelector();
    if (!selector) {
      return;
    }
    const {selectedNode, currentNode} = selector;
    if (submit) {
      if (moveToRoot) {
        if (!selectedNode) {
          this.message.alert("已经在顶层");
          return;
        } else {
          if (!(await this.message.confirm("是否确定移动到顶层？"))) {
            return;
          }
          selector.selectedNode = null;
        }
      } else {
        if (selectedNode) {
          if (selectedNode === currentNode) {
            this.message.alert("已经在选中分类");
            return;
          } else if (!(await this.message.confirm(`是否确定移动到【${selectedNode.name}】？`))) {
            return;
          }
        } else {
          await this.message.alert("没有选中");
          return;
        }
      }
    }
    this.nodeSelector.set(null);
    this.nodeSelectorClose$.next({node: selector.selectedNode, submit});
  }
  async selectNode(mode: NodeSelectorMode, title: string, selectedNode: DataListNavNode | null, excludeIds?: string[]) {
    this.openNodeSelector(mode, title, selectedNode, excludeIds);
    return await lastValueFrom(this.nodeSelectorClose$.pipe(take(1)));
  }
  clickNodeSelectorNode(node: DataListNavNode) {
    const selector = this.nodeSelector();
    if (!selector) {
      return;
    }
    selector.selectedNode = node;
  }
  scrollToNodeSelectorNode(node: DataListNavNode) {
    const selector = this.nodeSelector();
    const tree = this.nodeSelectorTree();
    const treeEl = this.nodeSelectorTreeEl()?.nativeElement;
    if (!selector || !tree || !treeEl) {
      return;
    }
    const path = getDataListNavNodePath(selector.nodes, node);
    for (const node2 of path) {
      tree.expand(node2);
    }
    const nodeEl = treeEl.querySelector(`[data-id="${node.id}"]`);
    if (nodeEl instanceof HTMLElement && getElementVisiblePercentage(nodeEl) < 1) {
      this.nodeSelectorScrollbar()?.scrollToElement(nodeEl);
    }
  }

  async getNavNodeItem(node?: DataListNavNode, to: DataListNavNode | "root" | null = null) {
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
    const form: InputInfo<DataListNavNode>[] = [
      getter.string("name", {
        label: "名字",
        validators: [Validators.required, CustomValidators.duplicate(names)]
      }),
      getter.number("order", {label: "排序"})
    ];
    const result = await this.message.form(form);
    if (result) {
      moveDataListNavNode(nodes, node, to);
      this.activeNavNode.set(node);
      return node;
    }
    return null;
  }
  async addNavNode(nodeParent: DataListNavNode | "root" | null, fromNodeSelector = false) {
    if (nodeParent instanceof DataListNavNode && fromNodeSelector) {
      const id = nodeParent.id;
      nodeParent = findDataListNavNode(this.navNodes(), (v) => v.id === id);
    }
    const node = await this.getNavNodeItem(undefined, nodeParent);
    if (!node) {
      return;
    }
    await this.setNavNodes();
    this.navNodesTree().expand(node);
    this.scrollToNavNode(node);
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
      this.scrollToNavNode(node);
    }
  }
  async moveNavNode(node: DataListNavNode) {
    return await this.moveNavNodes([node]);
  }
  async moveNavNodes(nodesToMove: DataListNavNode[]) {
    if (nodesToMove.length < 1) {
      await this.message.error("没有选中");
      return;
    }
    const nodes = this.navNodes();
    const names: string[] = [];
    const ids: string[] = [];
    const parentNodes: DataListNavNode[] = [];
    for (const node of nodesToMove) {
      names.push(node.name);
      ids.push(node.id);
      const path = getDataListNavNodePath(nodes, node);
      const parentNode = path.at(-2) || null;
      if (parentNode && !parentNodes.includes(parentNode)) {
        parentNodes.push(parentNode);
      }
    }
    const parentNode = parentNodes.length === 1 ? parentNodes[0] : null;
    const {node: parentNode2, submit} = await this.selectNode("parent", `分类：${getNamesStr(names)}`, parentNode, ids);
    if (submit) {
      const to = findDataListNavNode(nodes, (v) => v.id === parentNode2?.id) || "root";
      for (const node of nodesToMove) {
        moveDataListNavNode(nodes, node, to);
      }
      await this.setNavNodes();
      this.filterNavNodes();
    }
  }
  async removeNavNode(node: DataListNavNode) {
    return await this.removeNavNodes([node]);
  }
  async removeNavNodes(nodes: DataListNavNode[]) {
    const nodesWithChildren: DataListNavNode[] = [];
    const nodesWithData: DataListNavNode[] = [];
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        nodesWithChildren.push(node);
      }
      const counts = node.itemCounts;
      if (counts.self > 0 || counts.children > 0) {
        nodesWithData.push(node);
      }
    }
    const errMsgs: string[] = [];
    if (nodesWithChildren.length > 0) {
      errMsgs.push(`${getNamesStr(nodesWithChildren.map((v) => v.name))}下面有子节点，不能删除。`);
      nodes = difference(nodes, nodesWithChildren);
    }
    if (nodesWithData.length > 0) {
      errMsgs.push(`${getNamesStr(nodesWithData.map((v) => v.name))}下面有数据，不能删除。`);
      nodes = difference(nodes, nodesWithData);
    }
    const nodeNamesStr = getNamesStr(nodes.map((v) => v.name));
    if (errMsgs.length > 0) {
      if (nodes.length > 0) {
        const yes = await this.message.confirm([...errMsgs, `<br>是否确定删除${nodeNamesStr}？`].join("<br>"));
        if (!yes) {
          return;
        }
      } else {
        await this.message.error(errMsgs.join("<br>"));
        return;
      }
    } else if (!(await this.message.confirm(`是否确定删除${nodeNamesStr}？`))) {
      return;
    }
    const removedIds = new Set<string>();
    const remove = (list: DataListNavNode[]) => {
      for (const node of nodes) {
        if (removedIds.has(node.id)) {
          continue;
        }
        const idxs: number[] = [];
        for (const [i, node2] of list.entries()) {
          if (node2.id === node.id) {
            idxs.push(i);
          }
        }
        if (idxs.length > 0) {
          for (const i of idxs.reverse()) {
            list.splice(i, 1);
            removedIds.add(node.id);
          }
        } else {
          for (const node2 of list) {
            if (node2.children) {
              remove(node2.children);
            }
          }
        }
      }
    };
    remove(this.navNodes());
    this.selectedNavNodes.set(difference(this.selectedNavNodes(), nodes));
    await this.setNavNodes();
  }
  clickNavNode(node: DataListNavNode) {
    this.activeNavNode.set(node);
  }
  async scrollToNavNode(node: DataListNavNode) {
    const path = getDataListNavNodePath(this.navNodes(), node);
    for (const node2 of path.slice(0, -1)) {
      this.navNodesTree().expand(node2);
    }
    const treeEl = this.navNodesTreeEl().nativeElement;
    const nodeEl = await waitFor(() => treeEl?.querySelector(`[data-id="${node.id}"]`));
    if (nodeEl instanceof HTMLElement && getElementVisiblePercentage(nodeEl) < 1) {
      this.navNodesScrollbar().scrollToElement(nodeEl);
    }
  }

  itemQuery = signal<DataListItemQuery<T>>({value: "", type: "搜索所有分类", field: "name", exact: false});
  itemQueryTypes = ["搜索所有分类", "搜索选中分类"] as const;
  itemQueryEff = effect(() => {
    const fields = this.queryItemFieldInfos().map((v) => v.field);
    const query = this.itemQuery();
    if (!fields.includes(query.field)) {
      query.field = fields.at(0) || "name";
    }
  });
  itemQueryEff2 = effect(() => {
    this.itemQuery();
    untracked(() => this.filterNavNodes());
  });
  itemQueryInputInfos = computed(() => {
    const query = {...this.itemQuery()};
    const onChange = () => this.itemQuery.set(query);
    const getter = new InputInfoWithDataGetter(query, {onChange});
    const infos: InputInfo[] = [
      getter.selectSingle<(typeof this.itemQueryTypes)[number]>("type", this.itemQueryTypes, {label: "搜索类型", autoWidth: true}),
      getter.selectSingle(
        "field",
        this.queryItemFieldInfos().map<InputInfoOption<keyof T>>((v) => {
          return {value: v.field, label: v.title || String(v.field)};
        }),
        {label: "搜索字段", autoWidth: true}
      ),
      getter.boolean("exact", {label: "精确搜索", appearance: "checkbox", style: {width: "60px"}}),
      getter.string("value", {
        label: "搜索",
        clearable: true,
        onInput: debounce(onChange, 200),
        onChange: undefined,
        style: {width: "160px"}
      })
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
    this.filterNavNodes();
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
  scrollToItemWithId(id: string) {
    this.scrollToItem(`[data-id="${id}"]`);
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
    this.filterNavNodes();
    if (!activeNode) {
      return;
    }
    this.scrollToNavNode(activeNode);
  }

  filterNavNodes() {
    const nodes = this.navNodes();
    const query = this.navQuery();
    const activeNode = this.activeNavNode();
    const nodes2 = this.filterNodes(nodes, query, activeNode, true);
    this.navNodes.set(nodes2);
  }
  filterNodes(
    nodes: DataListNavNode[],
    query: string,
    activeNode: DataListNavNode | null,
    withItems: boolean,
    filterFn?: (node: DataListNavNode) => boolean
  ) {
    const activeNodePath = activeNode ? getDataListNavNodePath(nodes, activeNode) : [];
    const isActiveNode = (node: DataListNavNode) => activeNodePath.some((v) => v.id === node.id);
    const filterNodes = (nodes2: DataListNavNode[]) => {
      for (const node of nodes2) {
        if (typeof filterFn === "function" && !filterFn(node)) {
          node.hidden = true;
          continue;
        }
        if (node.children && node.children.length > 0) {
          filterNodes(node.children);
          if (queryStringList(query, [node.name])) {
            node.hidden = false;
          } else {
            node.hidden = node.children.every((v) => v.hidden);
          }
        } else {
          node.hidden = !isActiveNode(node) && !queryStringList(query, [node.name]);
        }
      }
    };
    filterNodes(nodes);

    const type = activeNode?.name;
    const counts = new Map<string, number>();
    const countsQuery = new Map<string, number>();
    const addCount = (map: Map<string, number>, key: string) => {
      map.set(key, (map.get(key) || 0) + 1);
    };
    const itemsAll = this.itemsAll();
    let navNodesHideEmpty = false;
    let itemsQueried = false;
    if (withItems) {
      const itemQuery = this.itemQuery();
      navNodesHideEmpty = !!itemQuery.value;
      itemsQueried = !!itemQuery.value;
      const items: T[] = [];
      for (const item of itemsAll) {
        addCount(counts, item.type);
        let isMatched = true;
        if (itemQuery.type === "搜索选中分类" && activeNode && !activeNode.hidden && navNodesHideEmpty) {
          isMatched = item.type === type;
        }
        if (itemQuery.field && itemQuery.field in item) {
          const val = getValueString(item[itemQuery.field]);
          if (isMatched) {
            if (itemQuery.exact) {
              isMatched = val === itemQuery.value;
            } else {
              isMatched = val.includes(itemQuery.value);
            }
          }
        } else {
          isMatched = false;
        }
        if (isMatched) {
          if (item.type === type) {
            items.push(item);
          }
          addCount(countsQuery, item.type);
        }
      }
      this.items.set(items);
    } else {
      for (const item of itemsAll) {
        addCount(counts, item.type);
        addCount(countsQuery, item.type);
      }
    }

    const setCount = (list: DataListNavNode[]) => {
      let countChildren = 0;
      let countChildrenQuery = 0;
      for (const node of list) {
        let countChildren2 = 0;
        let countChildrenQuery2 = 0;
        if (node.children && node.children.length > 0) {
          const res = setCount(node.children);
          countChildren2 = res.countChildren;
          countChildrenQuery2 = res.countChildrenQuery;
        }
        node.itemCounts.self = counts.get(node.name) || 0;
        node.itemCounts.selfQuery = countsQuery.get(node.name) || 0;
        node.itemCounts.children = countChildren2;
        node.itemCounts.childrenQuery = countChildrenQuery2;
        countChildren += node.itemCounts.self + countChildren2;
        countChildrenQuery += node.itemCounts.selfQuery + countChildrenQuery2;
        if (navNodesHideEmpty && !isActiveNode(node)) {
          node.hidden = node.itemCounts.selfQuery + node.itemCounts.childrenQuery === 0;
        }
      }
      return {countChildren, countChildrenQuery};
    };
    setCount(nodes);
    if (itemsQueried) {
      this.navNodesTree().expandAll();
      const foundNodes = findDataListNavNodes(nodes, (v) => !v.hidden && v.itemCounts.selfQuery > 0);
      if (foundNodes.length > 0 && !foundNodes.some((v) => v.id === activeNode?.id)) {
        this.activeNavNode.set(foundNodes[0]);
      }
    }
    return [...nodes];
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
