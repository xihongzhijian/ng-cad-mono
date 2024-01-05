import {Component, OnInit, ViewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute} from "@angular/router";
import {KlkwpzItem, KlkwpzSource} from "@components/klkwpz/klkwpz";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {environment} from "@env";
import {ObjectOf} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerComponent} from "../../modules/spinner/components/spinner/spinner.component";

@Component({
  selector: "app-kailiaokongweipeizhi",
  templateUrl: "./kailiaokongweipeizhi.component.html",
  styleUrls: ["./kailiaokongweipeizhi.component.scss"],
  standalone: true,
  imports: [MatButtonModule, SpinnerComponent, KlkwpzComponent]
})
export class KailiaokongweipeizhiComponent implements OnInit {
  id = "";
  loaderId = "kailiaokongweipeizhi";
  data: KlkwpzSource = {};
  @ViewChild(KlkwpzComponent) klkwpzComponent?: KlkwpzComponent;

  constructor(
    private route: ActivatedRoute,
    private http: CadDataService,
    private message: MessageService
  ) {}

  ngOnInit() {
    this._fetch();
  }

  private async _fetch() {
    const id = this.route.snapshot.queryParams.id;
    if (id) {
      this.id = id;
      const data = await this.http.getData<ObjectOf<KlkwpzItem[]>>("peijian/kailiaokongweipeizhi/get", {id}, {testData: "klkwpz"});
      if (data && typeof data === "object" && !Array.isArray(data)) {
        this.data = data;
      }
    } else {
      if (environment.production) {
        this.message.error("参数错误");
        return;
      }
    }
  }

  async submit() {
    if (this.klkwpzComponent && this.klkwpzComponent.submit()) {
      const response = await this.http.post(
        "peijian/kailiaokongweipeizhi/set",
        {id: this.id, data: this.klkwpzComponent.klkwpz.export()},
        {spinner: this.loaderId}
      );
      if (response?.code === 0) {
        this._fetch();
      }
    }
  }
}
