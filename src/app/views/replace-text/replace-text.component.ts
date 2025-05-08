import {AfterViewInit, Component, computed, HostBinding, inject, signal, viewChildren} from "@angular/core";
import {ValidatorFn, Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatIconModule} from "@angular/material/icon";
import {ActivatedRoute, Router} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {cadCollections} from "@app/cad/collections";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo, InputInfoOption} from "@modules/input/components/input.types";
import {InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {validateForm} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {difference, isEmpty, union} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";

interface Replacer {
  type: "全等于" | "在开头" | "在结尾" | "在中间";
  description: [string, string];
  regex: (str: string) => RegExp;
}

interface ToBeReplaced {
  id: string;
  name: string;
  matchedTexts: string[];
}

@Component({
  selector: "app-replace-text",
  templateUrl: "./replace-text.component.html",
  styleUrls: ["./replace-text.component.scss"],
  imports: [InputComponent, MatButtonModule, MatCardModule, MatCheckboxModule, MatIconModule, NgScrollbar]
})
export class ReplaceTextComponent implements AfterViewInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private status = inject(AppStatusService);

  @HostBinding("class") class = "ng-page";

  constructor() {
    setGlobal("replaceText", this);
  }

  collection = signal<string>("");
  async ngAfterViewInit() {
    const {collection} = this.route.snapshot.queryParams;
    console.log("collection", collection);
    if (collection) {
      this.collection.set(collection);
    } else {
      const collection2 =
        (await this.message.prompt({
          type: "select",
          options: cadCollections,
          label: "collection",
          validators: Validators.required
        })) || "";
      this.collection.set(collection2);
      this.router.navigate([], {queryParams: {collection}, queryParamsHandling: "merge"});
    }
  }

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

  step = signal(1);

  replaceInfo = signal({replacer: this.replacers[0], replaceFrom: "", replaceTo: ""});
  inputComponents = viewChildren(InputComponent);
  isInputsValid = signal(false);
  inputInfos = computed(() => {
    const data = this.replaceInfo();
    const infos: InputInfo[] = [];
    const disabled = this.step() > 1;
    const hint = this.replacerDesc();
    const replaceStrValidator: ValidatorFn = () => {
      return () => {
        const {replaceFrom, replaceTo} = data;
        if (replaceFrom && replaceTo && replaceFrom === replaceTo) {
          return {equal: "两个字符串不能相等"};
        }
        return null;
      };
    };
    const getter = new InputInfoWithDataGetter(data, {
      disabled,
      onChange: async () => {
        const {errors} = await validateForm(this.inputComponents());
        this.isInputsValid.set(isEmpty(errors));
        this.replaceInfo.update((v) => ({...v}));
      }
    });
    infos.push(
      getter.selectSingle(
        "replacer",
        this.replacers.map<InputInfoOption<Replacer>>((v) => ({label: v.type, value: v})),
        {label: "替换类型", hint}
      ),
      getter.string("replaceFrom", {label: "被替换的字符串", validators: [Validators.required, replaceStrValidator]}),
      getter.string("replaceTo", {label: "用来替换的字符串", validators: [Validators.required, replaceStrValidator]})
    );
    return infos;
  });

  replacerDesc = computed(() => {
    const {replacer, replaceFrom, replaceTo} = this.replaceInfo();
    if (!replacer || !replaceFrom || !replaceTo || replaceFrom === replaceTo) {
      return "";
    }
    const replaceFrom2 = replacer.description[0].replace("%s", JSON.stringify(replaceFrom));
    const replaceTo2 = replacer.description[1].replace("%s", JSON.stringify(replaceTo));
    return `将替换所有${replaceFrom2}的文本为${replaceTo2}`;
  });

  toBeReplacedList = signal<ToBeReplaced[]>([]);
  async ready() {
    if (!this.isInputsValid()) {
      return;
    }
    const {replaceFrom, replaceTo, replacer} = this.replaceInfo();
    const postData = {
      collection: this.collection(),
      replaceFrom,
      replaceTo,
      regex: replacer.regex(replaceFrom || "").toString()
    };
    const data = await this.http.getData<ToBeReplaced[]>("peijian/cad/replaceTextReady", postData);
    if (data) {
      if (data.length < 1) {
        this.message.alert("没有可替换的文本");
      } else {
        this.step.set(2);
        this.toBeReplacedList.set(data);
        this.selectAll();
      }
    }
  }

  async submit() {
    if (!this.isInputsValid()) {
      return;
    }
    const yes = await this.message.confirm("替换后无法恢复，是否确定替换？");
    if (!yes) {
      return;
    }
    const {replaceFrom, replaceTo, replacer} = this.replaceInfo();
    const list = this.toBeReplacedListSelected();
    const postData = {
      collection: this.collection(),
      replaceTo,
      regex: replacer.regex(replaceFrom || "").toString(),
      ids: list.map((v) => v.id)
    };
    const response = await this.http.post<ToBeReplaced[]>("peijian/cad/replaceText", postData);
    if (response?.code === 0) {
      this.toBeReplacedList.set([]);
      this.step.set(1);
    }
  }

  openCad(id: string) {
    this.status.openCadInNewTab(id, "CADmuban");
  }

  toBeReplacedListSelected = signal<ToBeReplaced[]>([]);
  toggleToBeReplacedItem(item: ToBeReplaced) {
    const list = this.toBeReplacedListSelected();
    if (list.includes(item)) {
      this.toBeReplacedListSelected.set(difference(list, [item]));
    } else {
      this.toBeReplacedListSelected.set(union(list, [item]));
    }
  }
  selectAll() {
    this.toBeReplacedListSelected.set(this.toBeReplacedList().slice());
  }
  selectNone() {
    this.toBeReplacedListSelected.set([]);
  }
}
