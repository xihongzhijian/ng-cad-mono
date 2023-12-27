import {Component, OnInit, ViewChild} from "@angular/core";
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
  standalone: true,
  imports: [MatButtonModule, SpinnerComponent, KlcsComponent]
})
export class KailiaocanshuComponent implements OnInit {
  loaderId = "kailiaocanshu";
  data: KailiaocanshuData = {_id: "", 名字: "", 分类: "", 参数: []};
  @ViewChild(KlcsComponent) klcsComponent?: KlcsComponent;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService
  ) {}

  async ngOnInit() {
    const {id} = this.route.snapshot.queryParams;
    if (!id) {
      return;
    }
    const response = await this.dataService.post<KailiaocanshuData>("peijian/kailiaocanshu/get", {id}, {spinner: this.loaderId});
    const data = this.dataService.getData(response);
    if (data) {
      this.data = data;
    }
    setGlobal("kailiaocanshu", this);
  }

  async submit() {
    if (this.klcsComponent) {
      const data = await this.klcsComponent.submit();
      if (data) {
        await this.dataService.post<KailiaocanshuData>("peijian/kailiaocanshu/set", {data}, {spinner: this.loaderId});
      }
    }
  }
}
