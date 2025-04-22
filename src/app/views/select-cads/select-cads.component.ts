import {Component, inject, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {session} from "@app/app.common";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {CadListInput} from "@components/dialogs/cad-list/cad-list.types";
import {MessageService} from "@modules/message/services/message.service";
import {environment} from "src/environments/environment";

@Component({
  selector: "app-select-cads",
  templateUrl: "./select-cads.component.html",
  styleUrls: ["./select-cads.component.scss"]
})
export class SelectCadsComponent implements OnInit {
  private dialog = inject(MatDialog);
  private message = inject(MessageService);

  private _paramsKey = "selectCadParams";

  async ngOnInit() {
    let data = session.load<CadListInput & {fnName?: string}>(this._paramsKey);
    if (!data) {
      if (environment.production) {
        this.message.alert("参数错误");
        return;
      } else {
        data = {selectMode: "single", collection: "cad", checkedItemsLimit: [1, NaN], fixedSearch: {分类: "特定企料"}};
      }
    }
    do {
      const result = await openCadListDialog(this.dialog, {data, width: "100vw", height: "100vh"});
      const fn = (parent as any)[data.fnName || ""];
      if (typeof fn === "function") {
        fn(result ? result.map((v) => v.id) : null);
      } else {
        console.log(result);
      }
    } while (!environment.production && !environment.unitTest);
  }
}
