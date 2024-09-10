import {CdkDrag} from "@angular/cdk/drag-drop";
import {ChangeDetectionStrategy, Component, computed, inject} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {ActivatedRoute, ResolveFn, Router, RouterOutlet} from "@angular/router";
import {environment} from "@env";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {MessageTestComponent} from "./modules/message/components/message-test/message-test.component";
import {SpinnerComponent} from "./modules/spinner/components/spinner/spinner.component";
import {routesInfo} from "./routing/routes-info";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [RouterOutlet, SpinnerComponent, CdkDrag, MatIconModule, MatMenuModule, MessageTestComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private dialog = inject(MatDialog);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private status = inject(AppStatusService);

  title = "ng-cad2";
  loaderText = "";
  isProd = environment.production;
  routesInfo = computed(() =>
    routesInfo.map((routeInfo) => {
      const {title, path} = routeInfo;
      let title2 = "";
      if (typeof title === "function") {
        const title3 = (title as ResolveFn<string>)(this.route.snapshot, this.router.routerState.snapshot);
        if (typeof title3 === "string") {
          title2 = title3;
        }
      } else {
        title2 = title || path;
      }
      if (!title2) {
        title2 = path;
      }
      return {...routeInfo, title2};
    })
  );

  getRouteTitle(routeInfo: (typeof routesInfo)[number]) {
    const {title, path} = routeInfo;
    if (typeof title === "function") {
      return (title as ResolveFn<string>)(this.route.snapshot, this.router.routerState.snapshot);
    }
    return title || path;
  }

  async changeProject() {
    const project = this.status.project;
    const data = {project: "", clear: false};
    const form = await this.message.form<typeof data>([
      {
        type: "string",
        label: "项目缩写",
        model: {data, key: "project"},
        validators: (control) => {
          const value = control.value;
          if (!data.clear) {
            if (!value) {
              return {required: true};
            }
            if (value === project) {
              return {与当前项目相同: true};
            }
          }
          return null;
        }
      },
      {type: "boolean", label: "清除参数", appearance: "switch", model: {data, key: "clear"}}
    ]);
    if (form) {
      this.status.changeProject(form.项目缩写, form.清除参数);
    }
  }

  navigate(routeInfo: (typeof routesInfo)[number]) {
    this.dialog.closeAll();
    this.router.navigate([routeInfo.path], {queryParamsHandling: "merge"});
  }
}
