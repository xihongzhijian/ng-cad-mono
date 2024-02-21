import {TextFieldModule} from "@angular/cdk/text-field";
import {AfterViewInit, Component, OnInit} from "@angular/core";
import {FormControl, FormGroupDirective, FormsModule, NgForm, ReactiveFormsModule, ValidatorFn, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {ErrorStateMatcher, MatOptionModule} from "@angular/material/core";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {ActivatedRoute, Router} from "@angular/router";
import {getFormControl, getFormGroup, setGlobal} from "@app/app.common";
import {cadCollections} from "@app/cad/collections";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {NgScrollbar} from "ngx-scrollbar";
import {BehaviorSubject} from "rxjs";

interface Replacer {
  type: "全等于" | "在开头" | "在结尾" | "在中间";
  description: [string, string];
  regex: (str: string) => RegExp;
}

interface ToBeReplaced {
  id: string;
  name: string;
  matchedTexts: string[];
  checked: boolean;
}

@Component({
  selector: "app-replace-text",
  templateUrl: "./replace-text.component.html",
  styleUrls: ["./replace-text.component.scss"],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    TextFieldModule,
    MatButtonModule,
    NgScrollbar,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule
  ]
})
export class ReplaceTextComponent extends Subscribed() implements OnInit, AfterViewInit {
  replacers: Replacer[] = [
    {type: "全等于", description: ["全等于%s", "%s"], regex: (s) => new RegExp(`^${s}$`)},
    {type: "在开头", description: ["以%s开头", "%s"], regex: (s) => new RegExp(`^${s}`)},
    {type: "在结尾", description: ["以%s结尾", "%s"], regex: (s) => new RegExp(`${s}$`)},
    {
      type: "在中间",
      description: ["%s在中间", "%s"],
      regex: (f) => new RegExp(`^(?!${f}).*${f}.*(?<!${f})$`)
    }
  ];
  form = getFormGroup(
    {
      replacer: getFormControl(this.replacers[0]),
      replaceFrom: getFormControl("", {validators: Validators.required}),
      replaceTo: getFormControl("", {validators: Validators.required})
    },
    {validators: this.replaceStrValidator()}
  );
  get replacerDesc() {
    const {replacer, replaceFrom, replaceTo} = this.form.value;
    if (!replacer || !replaceFrom || !replaceTo || replaceFrom === replaceTo) {
      return "";
    }
    const replaceFrom2 = replacer.description[0].replace("%s", JSON.stringify(replaceFrom));
    const replaceTo2 = replacer.description[1].replace("%s", JSON.stringify(replaceTo));
    return `将替换所有${replaceFrom2}的文本为${replaceTo2}`;
  }
  toBeReplacedList: ToBeReplaced[] = [];
  step = new BehaviorSubject<number>(1);
  collection = "";

  constructor(
    private message: MessageService,
    private http: CadDataService,
    private route: ActivatedRoute,
    private status: AppStatusService,
    private router: Router
  ) {
    super();
    setGlobal("replaceText", this);
  }

  ngOnInit() {
    this.subscribe(this.step, (step) => {
      if (step === 1) {
        this.form.enable();
      } else if (step === 2) {
        this.form.disable();
      } else {
        throw new Error("invalid step: " + step);
      }
    });
  }

  async ngAfterViewInit() {
    const {collection} = this.route.snapshot.queryParams;
    if (collection) {
      this.collection = collection;
    } else {
      this.collection =
        (await this.message.prompt({
          type: "select",
          options: cadCollections.slice(),
          label: "collection",
          validators: Validators.required
        })) || "";
      this.router.navigate([], {queryParams: {collection: this.collection}, queryParamsHandling: "merge"});
    }
  }

  replaceStrValidator(): ValidatorFn {
    return () => {
      if (!this.form) {
        return null;
      }
      const {replaceFrom, replaceTo} = this.form.value;
      if (replaceFrom && replaceTo && replaceFrom === replaceTo) {
        return {equal: "两个字符串不能相等"};
      }
      return null;
    };
  }

  replaceStrErrorMatcher(): ErrorStateMatcher {
    return {
      isErrorState: (control: FormControl | null, form: FormGroupDirective | NgForm | null) =>
        !!((control && control.touched && control.invalid) || form?.hasError("equal"))
    };
  }

  getReplaceStrError(control: FormControl<string>) {
    const errors = {...control.errors, ...this.form.errors};
    if (errors.equal) {
      return errors.equal;
    }
    if (errors.required) {
      return "字符串不能为空";
    }
  }

  async ready() {
    const form = this.form;
    if (form.untouched) {
      form.markAllAsTouched();
    }
    if (form.invalid) {
      return;
    }
    const {replaceFrom, replaceTo, replacer} = form.value;
    if (!replacer) {
      throw new Error("no replacer");
    }
    const postData = {
      collection: this.collection,
      replaceFrom,
      replaceTo,
      regex: replacer.regex(replaceFrom || "").toString()
    };
    const data = await this.http.getData<ToBeReplaced[]>("peijian/cad/replaceTextReady", postData);
    if (data) {
      if (data.length < 1) {
        this.message.alert("没有可替换的文本");
        return;
      }
      this.toBeReplacedList = data.map((v) => {
        v.checked = true;
        return v;
      });
      this.step.next(2);
    }
  }

  async submit() {
    const form = this.form;
    if (form.untouched) {
      form.markAllAsTouched();
    }
    if (form.invalid) {
      return;
    }
    const yes = await this.message.confirm("替换后无法恢复，是否确定替换？");
    if (!yes) {
      return;
    }
    const {replaceFrom, replaceTo, replacer} = form.value;
    if (!replacer) {
      throw new Error("no replacer");
    }
    const postData = {
      collection: this.collection,
      replaceTo,
      regex: replacer.regex(replaceFrom || "").toString(),
      ids: this.toBeReplacedList.filter((v) => v.checked).map((v) => v.id)
    };
    const response = await this.http.post<ToBeReplaced[]>("peijian/cad/replaceText", postData);
    if (response?.code === 0) {
      this.toBeReplacedList.length = 0;
      this.step.next(1);
    }
  }

  openCad(id: string) {
    this.status.openCadInNewTab(id, "CADmuban");
  }

  selectAll() {
    this.toBeReplacedList.forEach((v) => (v.checked = true));
  }

  selectNone() {
    this.toBeReplacedList.forEach((v) => (v.checked = false));
  }
}
