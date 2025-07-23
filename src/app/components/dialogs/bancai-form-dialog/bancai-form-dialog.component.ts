import {Component, inject, viewChild} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {BancaiFormData} from "@components/bancai-form/bancai-form.component";
import {environment} from "@env";
import {MaybePromise} from "@lucilor/utils";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {random} from "lodash";
import {BancaiFormComponent} from "../../bancai-form/bancai-form.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-bancai-form-dialog",
  templateUrl: "./bancai-form-dialog.component.html",
  styleUrls: ["./bancai-form-dialog.component.scss"],
  imports: [BancaiFormComponent, MatButtonModule, MatDialogActions, MatDialogTitle]
})
export class BancaiFormDialogComponent {
  dialogRef = inject<MatDialogRef<BancaiFormDialogComponent, BancaiFormOutput>>(MatDialogRef);
  data: BancaiFormInput = inject<BancaiFormInput>(MAT_DIALOG_DATA, {optional: true}) ?? {
    data: {
      bancai: "",
      cailiao: "",
      houdu: ""
    },
    bancaiList: [],
    bancaiListRefrersh: () => [],
    key: "",
    extraInputInfos: [],
    noTitle: false
  };

  private message = inject(MessageService);

  prod = environment.production;

  bancaiForm = viewChild(BancaiFormComponent);

  async submit() {
    const data = {...this.data.data};
    const result = await this.bancaiForm()?.validate();
    if (result?.errorMsg) {
      this.message.error(result.errorMsg);
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
  bancaiListRefrersh: () => MaybePromise<BancaiList[]>;
  key: string;
  extraInputInfos?: InputInfo[][];
  noTitle?: boolean;
}

export type BancaiFormOutput = BancaiFormData;

export const openBancaiFormDialog = getOpenDialogFunc<BancaiFormDialogComponent, BancaiFormInput, BancaiFormOutput>(
  BancaiFormDialogComponent,
  {width: "100%", maxWidth: "800px"}
);
