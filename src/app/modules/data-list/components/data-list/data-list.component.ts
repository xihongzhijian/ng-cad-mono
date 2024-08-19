import {NestedTreeControl} from "@angular/cdk/tree";
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
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule, MatTreeNestedDataSource} from "@angular/material/tree";
import {CadCollection} from "@app/cad/collections";
import {TypedTemplateDirective} from "@app/modules/directives/typed-template.directive";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {ImageComponent} from "@app/modules/image/components/image/image.component";
import {InputComponent} from "@app/modules/input/components/input.component";
import {InputInfo} from "@app/modules/input/components/input.types";
import {MessageService} from "@app/modules/message/services/message.service";
import {environment} from "@env";
import {getElementVisiblePercentage, ObjectOf, queryStringList} from "@lucilor/utils";
import {cloneDeep, debounce} from "lodash";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {BehaviorSubject, filter, firstValueFrom} from "rxjs";
import {v4} from "uuid";
import {DataListItem, DataListNavData} from "./data-list.types";
import {
  DataListNavNode,
  findActiveDataListNavNode,
  getDataListNavNodeList,
  getDataListNavNodePath,
  sortDataListNavNodeList,
  updateDataListNavNodeList
} from "./data-list.utils";

@Component({
  selector: "app-data-list",
  standalone: true,
  imports: [
    ImageComponent,
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
  itemsAll = input<T[]>([]);
  items = model<T[]>([]);
  activeNavNode = model<DataListNavNode | null>(null);
  navEditMode = model(false);

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
  navDataSource = new MatTreeNestedDataSource<DataListNavNode>();
  navTreeControl = new NestedTreeControl<DataListNavNode>(({children}) => children);
  navNodehasChild = (_: number, node: DataListNavNode) => node.hasChild();
  navNodeTrackBy = (_: number, node: DataListNavNode) => node.id;
  navNodesHideEmpty = signal(false);
  navShowCount = signal(true);
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
  navNodesTreeEl = viewChild<string, ElementRef<HTMLElement>>("navNodesTree", {read: ElementRef});
  navNodesScrollbar = viewChild<NgScrollbar>("navNodesScrollbar");

  toggleNavEditMode() {
    this.navEditMode.update((v) => !v);
    this.navShowCount.set(!this.navEditMode());
  }

  async getNavNodes() {
    const name = this.navDataName();
    let dataList = await this.http.queryMongodb<DataListNavData>({
      collection: this._navCollection,
      where: {名字: name}
    });
    let data = dataList[0];
    if (!data) {
      const id = await this.http.mongodbInsert(this._navCollection, {名字: name, data: []});
      if (id) {
        dataList = await this.http.queryMongodb<DataListNavData>({
          collection: this._navCollection,
          where: {_id: id}
        });
        data = dataList[0];
      }
    }
    if (data) {
      this._navDataId = data._id;
      this.navDataSource.data = getDataListNavNodeList(data.data || []);
    } else {
      this._navDataId = "";
      this.navDataSource.data = [];
    }
  }
  async setNavNodes() {
    if (!this._navDataId) {
      this.message.error("未找到数据");
      return;
    }
    const data = this.navDataSource.data;
    this.navDataSource.data = [];
    sortDataListNavNodeList(data);
    updateDataListNavNodeList(data, this.itemsAll());
    this.navDataSource.data = data;
    this.updateActiveNavNode();
    await this.http.mongodbUpdate(this._navCollection, {_id: this._navDataId, data: data.map((node) => node.export())});
  }
  filterNavNodes() {
    const needle = this.navQuery();
    const nodes = this.navDataSource.data.slice();
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
    this.navDataSource.data = [];
    this.navDataSource.data = nodes;
  }
  updateActiveNavNode(type = this.activeNavNode()?.name) {
    if (!type) {
      return;
    }
    const node = findActiveDataListNavNode(this.navDataSource.data, type);
    if (node) {
      this.activeNavNode.set(node);
    }
  }

  async getNavNodeItem(data?: DataListNavNode) {
    if (data) {
      data = cloneDeep(data);
    } else {
      data = new DataListNavNode({id: v4(), name: "", children: []});
    }
    const form: InputInfo<DataListNavNode>[] = [
      {type: "string", label: "名字", model: {data, key: "name"}, validators: Validators.required},
      {type: "number", label: "排序", model: {data, key: "order"}}
    ];
    const result = await this.message.form(form);
    if (result) {
      return data;
    }
    return null;
  }
  async addNavNode(nodeParent?: DataListNavNode) {
    const node = await this.getNavNodeItem();
    if (!node) {
      return;
    }
    if (nodeParent) {
      if (!Array.isArray(nodeParent.children)) {
        nodeParent.children = [];
      }
      node.level = nodeParent.level + 1;
      nodeParent.children.push(node);
    } else {
      this.navDataSource.data.push(node);
    }
    await this.setNavNodes();
    setTimeout(() => {
      this.navTreeControl.expand(node);
    }, 0);
  }
  async editNavNode(node: DataListNavNode) {
    const node2 = await this.getNavNodeItem(node);
    if (node2) {
      Object.assign(node, node2);
      await this.setNavNodes();
    }
  }
  async removeNavNode(node: DataListNavNode) {
    if (node.children && node.children.length > 0) {
      await this.message.error(`【${node.name}】下面有子节点，不能删除`);
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
    remove(this.navDataSource.data);
    await this.setNavNodes();
  }
  clickNavNode(node: DataListNavNode) {
    if (node.hasChild()) {
      this.navTreeControl.toggle(node);
    } else {
      this.activeNavNode.set(node);
    }
  }

  itemQuery = signal("");
  itemQueryInputInfo = computed<InputInfo>(() => ({
    type: "string",
    label: "搜索",
    clearable: true,
    value: this.itemQuery(),
    onInput: debounce((val) => {
      this.itemQuery.set(val);
      this.filterItems();
    }, 200)
  }));

  itemsAllEff = effect(() => {
    const itemsAll = this.itemsAll();
    untracked(() => this._onItemsAllChange(itemsAll));
  });
  private async _onItemsAllChange(itemsAll: T[]) {
    await this.untilInited();
    updateDataListNavNodeList(this.navDataSource.data, itemsAll);
    this.filterItems();
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
    const type = activeNode.name;
    const path = getDataListNavNodePath(this.navDataSource.data, type);
    for (const [i, node] of path.entries()) {
      this.navTreeControl.expand(node);
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
    let firstNonEmptyNode: DataListNavNode | undefined;
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
        if (!firstNonEmptyNode && count > 0) {
          firstNonEmptyNode = node;
        }
      }
    };
    const nodes = this.navDataSource.data.slice();
    for (const node of nodes) {
      setCount(node);
    }
    this.navDataSource.data = nodes;
    if (currNode && !currNode.hidden) {
      this.activeNavNode.set(currNode);
    } else if (firstNonEmptyNode) {
      this.activeNavNode.set(firstNonEmptyNode);
    }
  }
}
