import {NestedTreeControl} from "@angular/cdk/tree";
import {Component, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxChange, MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule, MatTreeNestedDataSource} from "@angular/material/tree";
import {session, setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {InputComponent} from "../../../modules/input/components/input.component";
import {getOpenDialogFunc} from "../dialog.common";
import {NavsData, NavsDataNode, NavsDialogInput, NavsDialogOutput, NavsResultItem} from "./navs-dialog.types";

@Component({
  selector: "app-navs-dialog",
  templateUrl: "./navs-dialog.component.html",
  styleUrls: ["./navs-dialog.component.scss"],
  standalone: true,
  imports: [InputComponent, NgScrollbar, MatTreeModule, MatCheckboxModule, MatButtonModule, MatIconModule, MatDialogActions]
})
export class NavsDialogComponent {
  private _navsKey = "navs";
  navs = session.load<NavsData>(this._navsKey);
  treeControl = new NestedTreeControl<NavsDataNode>((node) => node.dadaohang || node.xiaodaohang || null);
  dataSource = new MatTreeNestedDataSource<NavsDataNode>();

  private _searchInputValueKey = "navsSearchInputValue";
  searchInputValue = session.load<string>(this._searchInputValueKey) || "";
  searchInputInfo: InputInfo = {
    type: "string",
    label: "搜索",
    clearable: true,
    model: {key: "searchInputValue", data: this},
    onInput: debounce((val) => {
      session.save(this._searchInputValueKey, val);
    }, 500)
  };

  constructor(
    public dialogRef: MatDialogRef<NavsDialogComponent, NavsDialogOutput>,
    @Inject(MAT_DIALOG_DATA) public data: NavsDialogInput,
    private http: CadDataService,
    private message: MessageService
  ) {
    setGlobal("navsDialog", this);
    this.refresh();
  }

  async refresh() {
    if (this.data?.navs) {
      this.navs = this.data.navs;
    } else {
      this.navs = await this.http.getData<NavsData>("ngcad/getNavs");
      session.save(this._navsKey, this.navs);
    }
    this.dataSource.data = this.navs || [];
    this.treeControl.dataNodes = this.dataSource.data;
    this.treeControl.expandAll();
  }

  hasChild(_: number, node: NavsDataNode) {
    const children = node.dadaohang || node.xiaodaohang;
    return !!children && children.length > 0;
  }

  filterNode(node: NavsDataNode): boolean {
    const {dadaohang, xiaodaohang, table, mingzi} = node;
    let children: NavsDataNode[] | undefined = dadaohang || xiaodaohang;
    if (children) {
      children = children.filter((v) => this.filterNode(v));
      return children.length > 0;
    }
    const search = this.searchInputValue;
    if (search) {
      return table?.includes(search) || mingzi?.includes(search);
    }
    return true;
  }

  onNodeChange(node: NavsDataNode, event: MatCheckboxChange) {
    if (!this.data.multiSelect) {
      const unselect = (nodes?: NavsDataNode[] | null) => {
        for (const node2 of nodes || []) {
          node2.selected = false;
          unselect(node2.dadaohang);
          unselect(node2.xiaodaohang);
        }
      };
      unselect(this.navs);
    }
    node.selected = event.checked;
  }

  submit() {
    const result: NavsDialogOutput = [];
    const getSelectedNodes = (nodes: NavsDataNode[], tou?: NavsResultItem["tou"], da?: NavsResultItem["da"]) => {
      for (const node of nodes) {
        if (!this.filterNode(node)) {
          continue;
        }
        if (node.selected && tou && da) {
          result.push({
            tou,
            da,
            xiao: {id: node.vid, name: node.mingzi, table: node.table || ""}
          });
        }
        if (node.dadaohang) {
          getSelectedNodes(node.dadaohang, {id: node.vid, name: node.mingzi});
        }
        if (node.xiaodaohang) {
          getSelectedNodes(node.xiaodaohang, tou, {id: node.vid, name: node.mingzi});
        }
      }
    };
    getSelectedNodes(this.navs || []);
    if (result.length < 1) {
      this.message.alert(`请选择${this.data.multiSelect ? "至少" : ""}一个项目`);
    } else {
      this.dialogRef.close(result);
    }
    console.log(result);
  }

  cancel() {
    this.dialogRef.close();
  }
}

export const openNavsDialog = getOpenDialogFunc<NavsDialogComponent, NavsDialogInput, NavsDialogOutput>(NavsDialogComponent, {
  width: "80%",
  height: "80%"
});
