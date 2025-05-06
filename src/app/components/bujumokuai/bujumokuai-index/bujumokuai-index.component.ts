import {Component, computed, effect, HostBinding, inject, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatTabsModule} from "@angular/material/tabs";
import {ActivatedRoute, Router} from "@angular/router";
import {BujuComponent} from "../buju/buju.component";
import {MokuaiCadsComponent} from "../mokuai-cads/mokuai-cads.component";
import {MokuaikuComponent} from "../mokuaiku/mokuaiku.component";
import {bjmkPageNames, BjmkPages} from "./bujumokuai-index.types";

@Component({
  selector: "app-bujumokuai-index",
  imports: [BujuComponent, MatButtonModule, MatTabsModule, MokuaiCadsComponent, MokuaikuComponent],
  templateUrl: "./bujumokuai-index.component.html",
  styleUrl: "./bujumokuai-index.component.scss"
})
export class BujumokuaiIndexComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @HostBinding("class") class = "ng-page";

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const {page: pageName = "模块库"} = params;
      const i = this.pages().findIndex((v) => v.name === pageName);
      if (i >= 0) {
        this.pageIndex.set(i + 1);
      }
    });
  }

  pages = signal<BjmkPages[]>(bjmkPageNames.map((name) => ({name})));
  pageIndex = signal<number>(0);
  page = computed(() => this.pages()[this.pageIndex() - 1]);
  pageIndexEff = effect(() => {
    const page = this.page();
    if (page) {
      const path = this.route.snapshot.url[0]?.path;
      if (path) {
        this.router.navigate([path], {queryParams: {page: page.name}, queryParamsHandling: "merge"});
      }
    }
  });
}
