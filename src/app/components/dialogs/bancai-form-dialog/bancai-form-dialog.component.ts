import {Component, Inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {BancaiFormData} from "@components/bancai-form/bancai-form.component";
import {environment} from "@env";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {random} from "lodash";
import {BancaiFormComponent} from "../../bancai-form/bancai-form.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-bancai-form-dialog",
  templateUrl: "./bancai-form-dialog.component.html",
  styleUrls: ["./bancai-form-dialog.component.scss"],
  standalone: true,
  imports: [BancaiFormComponent, MatDialogActions, MatButtonModule]
})
export class BancaiFormDialogComponent {
  prod = environment.production;

  constructor(
    public dialogRef: MatDialogRef<BancaiFormDialogComponent, BancaiFormOutput>,
    @Inject(MAT_DIALOG_DATA) public data: BancaiFormInput,
    private message: MessageService
  ) {
    if (!this.data) {
      this.data = {data: {bancai: "", cailiao: "", houdu: ""}, bancaiList: []};
    }
  }

  submit() {
    const data = {...this.data.data};
    const emptyKeys: string[] = [];
    if (!data.bancai) {
      emptyKeys.push("板材");
    }
    if (!data.cailiao) {
      emptyKeys.push("材料");
    }
    if (!data.houdu) {
      emptyKeys.push("厚度");
    }
    if (emptyKeys.length > 0) {
      this.message.error(`${emptyKeys.join("/")}不能为空`);
      return;
    }
    this.dialogRef.close(data);
  }

  cancel() {
    this.dialogRef.close();
  }

  selectRandom() {
    const item = this.data.bancaiList[random(this.data.bancaiList.length - 1)];
    if (!item) {
      return;
    }
    const data = {...this.data.data};
    data.bancai = item.mingzi;
    data.cailiao = item.cailiaoList[random(item.cailiaoList.length - 1)];
    data.houdu = item.houduList[random(item.houduList.length - 1)];
    this.data.data = data;
  }

  selectFirst() {
    const item = this.data.bancaiList[0];
    if (!item) {
      return;
    }
    const data = {...this.data.data};
    data.bancai = item.mingzi;
    data.cailiao = item.cailiaoList[0];
    data.houdu = item.houduList[0];
    this.data.data = data;
  }
}

export interface BancaiFormInput {
  data: BancaiFormData;
  bancaiList: BancaiList[];
}

export type BancaiFormOutput = BancaiFormData;

export const openBancaiFormDialog = getOpenDialogFunc<BancaiFormDialogComponent, BancaiFormInput, BancaiFormOutput>(
  BancaiFormDialogComponent,
  {width: "85%"}
);
