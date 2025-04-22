import {AfterViewInit, Component, HostBinding, inject, Inject, signal} from "@angular/core";
import {FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {getFormControl, getFormGroup} from "@app/app.common";
import {ObjectOf, timeout} from "@lucilor/utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import axios from "axios";
import md5 from "md5";
import {getOpenDialogFunc} from "../dialog.common";

export interface LoginFormData {
  project: {id: string; name: string};
  baseUrl: string;
}

export interface LoginResponse {
  status: number;
  msg: string;
  type: string;
}

@Component({
  selector: "app-login-form",
  templateUrl: "./login-form.component.html",
  styleUrls: ["./login-form.component.scss"],
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatButtonModule]
})
export class LoginFormComponent implements AfterViewInit {
  private message = inject(MessageService);
  private spinner = inject(SpinnerService);

  @HostBinding("class") class = "ng-page";

  form = getFormGroup({
    user: getFormControl(""),
    password: getFormControl("")
  });
  passwordVisible = signal(false);
  shownSpinners: SpinnerService["shownSpinners"] = {};

  constructor(
    public dialogRef: MatDialogRef<LoginFormComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: LoginFormData
  ) {
    if (!this.data) {
      this.data = {project: {id: "?", name: "???"}, baseUrl: ""};
    }
  }

  async ngAfterViewInit() {
    await timeout();
    this.shownSpinners = {...this.spinner.shownSpinners};
    for (const id in this.shownSpinners) {
      this.spinner.hide(id);
    }
  }

  async submit() {
    const form = this.form;
    if (form.untouched) {
      form.markAllAsTouched();
    }
    if (!form.valid) {
      return;
    }
    const baseUrl = this.data.baseUrl;
    const data = new FormData();
    data.append("username", form.value.user || "");
    data.append("password", md5(form.value.password || ""));
    data.append("phonecode", "");
    this.spinner.show(this.spinner.defaultLoaderId);
    let response: ObjectOf<any> = (await axios.post(`${baseUrl}/login/in`, data)).data;
    this.spinner.hide(this.spinner.defaultLoaderId);
    if (response.status === -1) {
      const phonecode = await this.message.prompt(
        {type: "string", label: "验证码", validators: Validators.required},
        {title: "请输入验证码", disableCancel: true}
      );
      data.set("phonecode", phonecode || "");
      this.spinner.show(this.spinner.defaultLoaderId);
      response = (await axios.post(`${baseUrl}/login/in`, data)).data;
      this.spinner.hide(this.spinner.defaultLoaderId);
    }
    if (response.status === 0) {
      this.message.alert(response.msg);
      this.dialogRef.close(false);
    } else if (response.code === 0) {
      this.message.snack(response.msg);
      this.dialogRef.close(true);
    } else {
      this.message.alert(response.msg);
      this.dialogRef.close(false);
    }
    for (const id in this.shownSpinners) {
      this.spinner.show(id, this.shownSpinners[id].at(-1)?.config);
    }
    this.shownSpinners = {};
  }

  goToLoginPage() {
    open(`${this.data.baseUrl}signUp/index`);
  }

  togglePasswordVisible() {
    this.passwordVisible.update((v) => !v);
  }
}

export const openLoginFormDialog = getOpenDialogFunc<LoginFormComponent, LoginFormData, boolean>(LoginFormComponent, {width: "50%"});
