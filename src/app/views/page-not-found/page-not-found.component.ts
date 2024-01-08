import {Component} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute, Router} from "@angular/router";
import {PathResolveData} from "@app/routing/path-resolver";

@Component({
  selector: "app-page-not-found",
  templateUrl: "./page-not-found.component.html",
  styleUrls: ["./page-not-found.component.scss"],
  standalone: true,
  imports: [MatButtonModule]
})
export class PageNotFoundComponent {
  data: PathResolveData;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.data = this.route.snapshot.data.redirect || {path: "", queryParams: {}};
  }

  redirect() {
    this.router.navigate([this.data.path], {queryParams: this.data.queryParams});
  }
}
