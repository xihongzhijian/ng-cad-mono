import {ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, signal, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {KailiaocanshuData, KlcsComponent} from "@components/klcs/klcs.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {SpinnerComponent} from "../../modules/spinner/components/spinner/spinner.component";

@Component({
  selector: "app-kailiaocanshu",
  templateUrl: "./kailiaocanshu.component.html",
  styleUrls: ["./kailiaocanshu.component.scss"],
  imports: [MatButtonModule, SpinnerComponent, KlcsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KailiaocanshuComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(CadDataService);

  @HostBinding("class") class = "ng-page";

  loaderId = "kailiaocanshu";
  data = signal({_id: "", 名字: "", 分类: "", 参数: []});
  klcsComponent = viewChild(KlcsComponent);

  async ngOnInit() {
    const {id} = this.route.snapshot.queryParams;
    if (!id) {
      return;
    }
    const data = await this.http.getData<KailiaocanshuData>("peijian/kailiaocanshu/get", {id}, {spinner: this.loaderId});
    if (data) {
      this.data.set(data);
    }
    setGlobal("kailiaocanshu", this);
  }

  async submit() {
    const klcsComponent = this.klcsComponent();
    if (!klcsComponent) {
      return;
    }
    const data = await klcsComponent.submit();
    if (data) {
      await this.http.post<KailiaocanshuData>("peijian/kailiaocanshu/set", {data}, {spinner: this.loaderId});
    }
  }
}
