import {KeyValuePipe} from "@angular/common";
import {ChangeDetectionStrategy, Component, computed, forwardRef, HostBinding, inject, Inject} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CadData} from "@lucilor/cad-viewer";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {BatchUploadChecker} from "@views/import/import.utils";
import {InputComponent} from "../../../modules/input/components/input.component";
import {getOpenDialogFunc} from "../dialog.common";

export interface BbzhmkgzComponentData {
  value: string;
  vars: CadData["info"]["vars"];
}

@Component({
  selector: "app-bbzhmkgz",
  templateUrl: "./bbzhmkgz.component.html",
  styleUrls: ["./bbzhmkgz.component.scss"],
  imports: [FormsModule, forwardRef(() => InputComponent), KeyValuePipe, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BbzhmkgzComponent {
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  constructor(
    public dialogRef: MatDialogRef<BbzhmkgzComponent, BbzhmkgzComponentData>,
    @Inject(MAT_DIALOG_DATA) public data: BbzhmkgzComponentData
  ) {
    if (!data.value) {
      data.value = "";
    }
    if (!data.vars) {
      data.vars = {};
    }
  }

  inputInfo = computed(() => {
    const data = this.data;
    const info: InputInfo<typeof data> = {
      type: "string",
      label: "",
      textarea: {},
      model: {data, key: "value"}
    };
    return info;
  });

  batchUploadChecker = new BatchUploadChecker();
  submit() {
    const {errors} = this.batchUploadChecker.parseBaobianzhengmianRules("修改包边正面宽规则:\n" + this.data.value, this.data.vars);
    if (errors.length > 0) {
      this.message.alert({content: errors.join("<br>"), title: "包边正面宽规则有误"});
      return;
    }
    this.dialogRef.close(this.data);
  }

  cancel() {
    this.dialogRef.close();
  }
}

export const openBbzhmkgzDialog = getOpenDialogFunc<BbzhmkgzComponent, BbzhmkgzComponentData, BbzhmkgzComponentData>(BbzhmkgzComponent);
