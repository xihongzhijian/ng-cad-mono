import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute} from "@angular/router";
import {CadPreviewParams} from "@app/cad/cad-preview";
import {CadImageComponent} from "@components/cad-image/cad-image.component";
import {timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {NgScrollbar} from "ngx-scrollbar";
import {ImageComponent} from "../../modules/image/components/image/image.component";
import {SpinnerComponent} from "../../modules/spinner/components/spinner/spinner.component";

export type PreviewData = {
  CAD?: any;
  code: string;
  codeText?: string;
  text: string[];
  type: "说明" | "CAD";
  zhankai: string;
  title?: string;
  id: string;
}[][];

@Component({
  selector: "app-print-a4-a015-preview",
  templateUrl: "./print-a4-a015-preview.component.html",
  styleUrls: ["./print-a4-a015-preview.component.scss"],
  standalone: true,
  imports: [CadImageComponent, ImageComponent, MatButtonModule, NgScrollbar, SpinnerComponent]
})
export class PrintA4A015PreviewComponent implements AfterViewInit, OnDestroy {
  data: PreviewData = [];
  loaderId = "printPreview";
  cadWidth = 92;
  cadHeight = 92;
  cadBackgroundColor = "white";
  params: CadPreviewParams = {
    config: {
      padding: [15]
    }
  };

  constructor(
    private http: CadDataService,
    private route: ActivatedRoute
  ) {}

  async ngAfterViewInit() {
    const data = await this.http.getData<PreviewData>("order/printCode/printA4A015Preview", this.route.snapshot.queryParams);
    if (!data) {
      return;
    }
    this.data = data;
    for (const page of this.data) {
      for (const card of page) {
        if (card.type === "CAD") {
          card.id = card.CAD?.id || "";
        }
      }
      await timeout(0);
    }
  }

  ngOnDestroy() {
    document.body.style.overflowX = "";
    document.body.style.overflowY = "";
  }

  printPages() {
    print();
  }

  getTop(i: number) {
    switch (Math.floor(i / 4)) {
      case 0:
        return "10px";
      case 1:
        return "9px";
      case 2:
        return "10px";
      case 3:
        return "11px";
      case 4:
        return "11px";
      case 5:
        return "11px";
      case 6:
        return "11px";
      default:
        return "0px";
    }
  }

  getLeft(i: number) {
    return (i % 4 ? 10 : 0) + "px";
  }
}
