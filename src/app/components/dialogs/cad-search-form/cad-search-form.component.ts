import {AsyncPipe} from "@angular/common";
import {Component, EventEmitter, OnInit} from "@angular/core";
import {FormsModule, Validators} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatOptionModule} from "@angular/material/core";
import {MatDialogActions, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {CadSearchData} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {NgScrollbar} from "ngx-scrollbar";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-search-form",
  templateUrl: "./cad-search-form.component.html",
  styleUrls: ["./cad-search-form.component.scss"],
  imports: [
    NgScrollbar,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    FormsModule,
    MatOptionModule,
    MatIconModule,
    MatDialogActions,
    MatButtonModule,
    AsyncPipe
  ]
})
export class CadSearchFormComponent implements OnInit {
  data: CadSearchData = [];
  form: ObjectOf<string> = {};
  additional: CadSearchData[0] = {title: "自由选择", items: []};
  options$: ObjectOf<{change$: EventEmitter<string>; options$: Observable<string[]>}> = {};

  constructor(
    public dialogRef: MatDialogRef<CadSearchFormComponent, CadData["options"]>,
    private http: CadDataService,
    private message: MessageService
  ) {}

  async ngOnInit() {
    await timeout(0);
    this.data = await this.http.getCadSearchForm();
    this.data.push(this.additional);
    this.data.forEach((group) => {
      group.items.forEach(({label, options}) => {
        const optionValues = options.map((v) => v.label);
        const change$ = new EventEmitter<string>();
        const options$ = change$.pipe(
          map((value) => {
            if (!value) {
              return optionValues.slice();
            }
            value = value.toLowerCase();
            return optionValues.filter((v) => v.toLowerCase().includes(value));
          })
        );
        this.options$[label] = {change$, options$};
      });
    });
    await timeout(0);
    this.reset();
  }

  async addOption() {
    const name = await this.message.prompt({type: "string", label: "选项名字", validators: Validators.required});
    if (!name) {
      return;
    }
    const isExist = this.data.find((v) => v.items.some((vv) => vv.label === name));
    if (isExist) {
      this.message.alert("选项已存在");
    } else {
      const item = await this.http.getCadSearchOptions(name);
      if (item) {
        this.additional.items.push(item);
        this.form[item.label] = "";
      }
    }
  }

  submit() {
    const result: CadData["options"] = {};
    for (const name in this.form) {
      if (this.form[name].length) {
        result[name] = this.form[name];
      }
    }
    this.dialogRef.close(result);
  }

  cancel() {
    this.dialogRef.close();
  }

  reset() {
    this.form = {};
    this.data.forEach((v) => {
      v.items.forEach(({label}) => {
        this.form[label] = "";
        this.options$[label].change$.emit("");
      });
    });
  }
}

export const openCadSearchFormDialog = getOpenDialogFunc<CadSearchFormComponent, CadSearchData, CadData["options"]>(
  CadSearchFormComponent,
  {width: "80%", height: "80%"}
);
