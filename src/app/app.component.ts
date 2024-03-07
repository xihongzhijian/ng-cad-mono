import {CdkDrag} from "@angular/cdk/drag-drop";
import {Component} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {ActivatedRoute, ResolveFn, Router, RouterLink, RouterOutlet} from "@angular/router";
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
  imports: [RouterOutlet, SpinnerComponent, CdkDrag, MatIconModule, MatMenuModule, RouterLink, MessageTestComponent]
})
export class AppComponent {
  title = "ng-cad2";
  loaderText = "";
  isProd = environment.production;
  routesInfo = routesInfo;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private status: AppStatusService,
    private message: MessageService
  ) {}

  getRouteTitle(routeInfo: (typeof routesInfo)[number]) {
    const {title, path} = routeInfo;
    if (typeof title === "function") {
      return (title as ResolveFn<string>)(this.route.snapshot, this.router.routerState.snapshot);
    }
    return title || path;
  }

  async changeProject() {
    const project = await this.message.prompt({type: "string", label: "项目缩写", validators: Validators.required});
    if (project) {
      this.status.changeProject(project);
    }
  }
}
