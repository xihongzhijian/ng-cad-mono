import {Component, computed, forwardRef, HostBinding, inject, OnInit, signal} from "@angular/core";
import {remoteHost} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {TableRenderInfo} from "@modules/table/components/table/table.types";

@Component({
  selector: "app-list-projects",
  imports: [forwardRef(() => TableComponent)],
  templateUrl: "./list-projects.component.html",
  styleUrl: "./list-projects.component.scss"
})
export class ListProjectsComponent implements OnInit {
  private http = inject(CadDataService);

  @HostBinding("class") class = "ng-page";

  ngOnInit() {
    this.getProjects();
  }

  projects = signal<ProjectInfo[]>([]);
  async getProjects(updateCreateTime = false, projectId?: number) {
    const projects = await this.http.getData<ProjectInfo[]>("ngcad/getProjectList", {
      updateCreateTime,
      updateCreateTimeWhere: typeof projectId === "number" ? {vid: projectId} : {}
    });
    this.projects.set(projects ?? []);
  }

  advancedMode = signal(false);
  tableInfo = computed(() => {
    const advancedMode = this.advancedMode();
    const info: TableRenderInfo<ProjectInfo> = {
      columns: [
        {field: "nameCN", name: "项目名称", type: "string"},
        {field: "nameEN", name: "项目缩写", type: "string"},
        {field: "createTime", name: "创建时间", type: "time"},
        {
          field: "operation",
          name: "操作",
          type: "button",
          buttons: [
            {event: "打开", onClick: (params) => this.openProject(params.item.nameEN)},
            {event: "更新创建时间", onClick: ({item}) => this.getProjects(true, item.id), hidden: !advancedMode}
          ]
        }
      ],
      filterable: {
        fields: ["nameCN", "nameEN"]
      },
      toolbarButtons: {
        extra: [
          {event: "刷新", onClick: () => this.getProjects()},
          {event: "更多功能", onClick: () => this.advancedMode.update((v) => !v), class: advancedMode ? "accent" : ""},
          {event: "全部更新创建时间", onClick: () => this.getProjects(true), hidden: !advancedMode}
        ]
      },
      data: this.projects()
    };
    return info;
  });

  openProject(nameEN: string) {
    const url = `${remoteHost}/n/${nameEN}/index`;
    window.open(url, "_blank");
  }

  searchKeyword = signal("");
}

export interface ProjectInfo {
  id: number;
  nameEN: string;
  nameCN: string;
  createTime: string;
  operation?: string;
}
