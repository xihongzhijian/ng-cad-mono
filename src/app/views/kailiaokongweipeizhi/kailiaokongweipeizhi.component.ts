import {Component, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
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
  imports: [MatButtonModule, KlkwpzComponent, SpinnerComponent]
})
export class KailiaokongweipeizhiComponent implements OnInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);

  @HostBinding("class") class = "ng-page";

  loaderId = "kailiaokongweipeizhi";
  id = signal("");
  data = signal<KlkwpzSource>({});
  klkwpzComponent = viewChild(KlkwpzComponent);

  ngOnInit() {
    this._fetch();
  }

  private async _fetch() {
    const id = this.route.snapshot.queryParams.id;
    if (id) {
      this.id.set(id);
      const data = await this.http.getData<ObjectOf<KlkwpzItem[]>>("peijian/kailiaokongweipeizhi/get", {id});
      if (data && typeof data === "object" && !Array.isArray(data)) {
        this.data.set(data);
      }
    } else {
      if (environment.production) {
        this.message.error("参数错误");
        return;
      }
    }
  }

  async submit() {
    const klkwpzComponent = this.klkwpzComponent();
    if (!klkwpzComponent || !(await klkwpzComponent.submit())) {
      return;
    }
    const response = await this.http.post(
      "peijian/kailiaokongweipeizhi/set",
      {id: this.id(), data: klkwpzComponent.klkwpz.export()},
      {spinner: this.loaderId}
    );
    if (response?.code === 0) {
      this._fetch();
    }
  }
}
