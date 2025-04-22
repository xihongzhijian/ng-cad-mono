import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostBinding,
  inject,
  input,
  OnInit,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {setGlobal} from "@app/app.common";
import {CadData, CadLine} from "@lucilor/cad-viewer";
import {exportObject, importObject, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/input.types";
import {getInputInfoGroup, InputInfoWithDataGetter} from "@modules/input/components/input.utils";
import {MessageData} from "@modules/message/components/message/message.types";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep, isObject, uniq} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {createJSONEditor, JSONContent, TextContent} from "vanilla-jsoneditor";
import {InputComponent} from "../../modules/input/components/input.component";

@Component({
  selector: "app-klcs",
  templateUrl: "./klcs.component.html",
  styleUrls: ["./klcs.component.scss"],
  imports: [InputComponent, MatButtonModule, MatCardModule, NgScrollbar],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlcsComponent implements OnInit, AfterViewInit {
  private http = inject(CadDataService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  data = input.required<KailiaocanshuData>();
  cadId = input<string>();

  async ngOnInit() {
    setGlobal("kailiaocanshu", this);
  }

  async ngAfterViewInit() {
    const id = this.cadId();
    if (id) {
      await timeout(0);
      const result = await this.http.getCad({collection: "cad", id});
      if (result.cads.length > 0) {
        this.cadData = result.cads[0];
        const mubanId = this.cadData.zhankai[0].kailiaomuban;
        if (mubanId) {
          const result2 = await this.http.getCad({collection: "kailiaocadmuban", id: mubanId});
          if (result2.cads.length > 0) {
            this.cadMubanData = result2.cads[0];
          }
        }
      }
    }
  }

  inputInfos = signal<InputInfo[]>([]);
  inputInfos2 = signal<InputInfo[][]>([]);
  useJsonEditor = signal(false);
  jsonEditor: ReturnType<typeof createJSONEditor> | null = null;
  jsonEditorContainer = viewChild<ElementRef<HTMLDivElement>>("jsonEditorContainer");
  cadData?: CadData;
  cadMubanData?: CadData;
  messageData: MessageData = {type: "json", json: null};
  dataEff = effect(() => {
    this.data();
    untracked(() => this.updateData());
  });
  updateData() {
    const data = this.data();
    const getter = new InputInfoWithDataGetter(data, {validators: Validators.required});
    this.inputInfos.set([getter.string("名字")]);
    if (data.分类 === "切中空") {
      this.useJsonEditor.set(false);
      if (!Array.isArray(data.参数)) {
        data.参数 = [];
      }
      data.参数 = data.参数.map((v: Partial<QiezhongkongItem>) => {
        if (!isObject(v)) {
          v = {};
        }
        const v2 = importObject(v, defaultQiezhongkongItem);
        if (v2.type.includes("双线框")) {
          v2.外框.框线 = "虚线";
          v2.内框.框线 = "实线";
        }
        return v2;
      });
      const 参数: QiezhongkongItem[] = data.参数;
      const allDirections = ["上", "下", "左", "右"] as const;
      let lineNamesH: string[];
      let lineNamesV: string[];
      if (this.cadMubanData) {
        const linesH: CadLine[] = [];
        const linesV: CadLine[] = [];
        for (const e of this.cadMubanData.entities.line) {
          if (e.isHorizontal()) {
            linesH.push(e);
          } else if (e.isVertical()) {
            linesV.push(e);
          }
        }
        lineNamesH = uniq(linesH.map((e) => e.mingzi).filter(Boolean));
        lineNamesV = uniq(linesV.map((e) => e.mingzi).filter(Boolean));
      } else {
        lineNamesH = [];
        lineNamesV = [];
      }
      this.inputInfos2.set(
        参数.map((v: QiezhongkongItem) => {
          importObject(v, defaultQiezhongkongItem);
          const 双线框 = v.type.includes("双线框");
          if (!v.外框) {
            v.外框 = cloneDeep(defaultQiezhongkongItem.外框);
          }
          const getter2 = new InputInfoWithDataGetter(v, {validators: Validators.required});
          const getter3 = new InputInfoWithDataGetter(v.外框, {validators: Validators.required});
          const infos: InputInfo[] = [
            getter2.selectSingle(
              "type",
              qiezhongkongTypes.map((vv) => {
                if (vv === "双线框") {
                  return {value: vv, label: "45度双线框"};
                } else if (vv === "90度拼接双线框") {
                  return {value: vv, label: "90度双线框"};
                } else {
                  return vv;
                }
              }),
              {
                label: "切内空类型",
                onChange: () => {
                  this.updateData();
                }
              }
            ),
            getInputInfoGroup(
              [
                getter2.string("topY", {label: "上", options: lineNamesH}),
                getter2.string("bottomY", {label: "下", options: lineNamesH}),
                getter2.string("leftX", {label: "左", options: lineNamesV}),
                getter2.string("rightX", {label: "右", options: lineNamesV})
              ],
              {label: "外框基准线"}
            ),
            getInputInfoGroup(
              v.offset.map<InputInfo>((_, i) => ({
                type: "string",
                label: allDirections[i],
                model: {key: String(i), data: v.offset},
                validators: Validators.required
              })),
              {label: "外框从基准线缩小值", inputStyle: {flex: "0 0 50%"}}
            ),
            getInputInfoGroup(
              [
                getter3.selectSingle("框线", 双线框 ? ["虚线"] : ["实线", "虚线"], {label: "外框"}),
                {
                  type: "select",
                  label: "切哪里",
                  options: allDirections.slice(),
                  multiple: true,
                  optionText: (val) => val.join(""),
                  value: allDirections.filter((vv) => v.外框?.显示.includes(vv)),
                  onChange: (value: string[]) => {
                    if (!v.外框) {
                      v.外框 = cloneDeep(defaultQiezhongkongItem.外框);
                    }
                    v.外框.显示 = value.join("");
                  }
                }
              ],
              {label: "外框"}
            )
          ];
          if (双线框) {
            infos.splice(1, 0, getter2.string("双线框厚度", {placeholder: "留空时默认取门扇厚度", validators: []}));
            if (!v.内框) {
              v.内框 = cloneDeep(defaultQiezhongkongItem.内框);
            }
            const getter4 = new InputInfoWithDataGetter(v.内框, {validators: Validators.required});
            infos.push(
              getInputInfoGroup(
                [
                  getter4.selectSingle("框线", ["实线"]),
                  {
                    type: "select",
                    label: "切哪里",
                    options: allDirections.slice(),
                    multiple: true,
                    optionText: (val) => val.join(""),
                    value: allDirections.filter((vv) => v.内框?.显示.includes(vv)),
                    onChange: (val: string[]) => {
                      if (!v.内框) {
                        v.内框 = cloneDeep(defaultQiezhongkongItem.内框);
                      }
                      v.内框.显示 = val.join("");
                    }
                  }
                ],
                {label: "内框"}
              )
            );
          }
          return infos;
        })
      );
    } else {
      this.useJsonEditor.set(true);
      this.inputInfos2.set([
        [
          {
            type: "string",
            label: "",
            selectOnly: true,
            value: JSON.stringify(data.参数),
            suffixIcons: [
              {
                name: "edit",
                onClick: async () => {
                  const result = await this.message.json(data.参数);
                  if (result) {
                    data.参数 = result;
                    this.updateData();
                  }
                }
              }
            ]
          }
        ]
      ]);
    }
    if (this.useJsonEditor()) {
      if (!this.jsonEditor) {
        const target = this.jsonEditorContainer()?.nativeElement;
        if (target) {
          this.jsonEditor = createJSONEditor({target, props: {}});
        }
      }
      if (this.jsonEditor) {
        this.jsonEditor.set({text: JSON.stringify(data.参数)});
      }
    } else if (this.jsonEditor) {
      this.jsonEditor.destroy();
      this.jsonEditor = null;
    }
  }

  addQiezhongkongItem(i: number) {
    const 参数: QiezhongkongItem[] = this.data().参数;
    参数.splice(i + 1, 0, importObject({}, defaultQiezhongkongItem));
    this.updateData();
  }

  removeQiezhongkongItem(i: number) {
    const 参数: QiezhongkongItem[] = this.data().参数;
    参数.splice(i, 1);
    this.updateData();
  }

  copyQiezhongkongItem(i: number) {
    const 参数: QiezhongkongItem[] = this.data().参数;
    参数.splice(i + 1, 0, cloneDeep(参数[i]));
    this.updateData();
  }

  async submit(): Promise<KailiaocanshuData | null> {
    const {jsonEditor} = this;
    let data = this.data();
    if (jsonEditor) {
      const errors = jsonEditor.validate();
      if (errors) {
        this.message.error("JSON格式错误");
        return null;
      }
      const result: JSONContent & TextContent = jsonEditor.get() as any;
      if (result.json) {
        data.参数 = result.json;
      } else {
        data.参数 = JSON.parse(result.text);
      }
    } else {
      let valid = true;
      for (const v of data.参数 as QiezhongkongItem[]) {
        if (!v.topY || !v.bottomY || !v.leftX || !v.rightX) {
          valid = false;
        }
        if (!v.offset.every(Boolean)) {
          valid = false;
        }
        if (!valid) {
          this.message.error("数据没有填写完整");
          return null;
        }
        if (v.双线框厚度) {
          const 双线框厚度 = Number(v.双线框厚度);
          if (isNaN(双线框厚度) || 双线框厚度 <= 0) {
            this.message.error("双线框厚度必须对应门扇厚度");
            return null;
          }
        }
      }
      data = cloneDeep(data);
      for (const v of data.参数) {
        const {type, offset} = v;
        exportObject(v, defaultQiezhongkongItem);
        v.type = type;
        v.offset = offset;
      }
    }
    return data;
  }
}

export interface KailiaocanshuData {
  _id: string;
  名字: string;
  分类: string;
  参数: any;
}

export const qiezhongkongTypes = ["单线框", "双线框", "90度拼接双线框"] as const;
export type QiezhongkongType = (typeof qiezhongkongTypes)[number];

export interface QiezhongkongItem {
  type: QiezhongkongType;
  offset: [string, string, string, string];
  外框?: QiezhongkongKuangxian;
  内框?: QiezhongkongKuangxian;
  topY?: string;
  rightX?: string;
  bottomY?: string;
  leftX?: string;
  双线框厚度?: string;
}

export interface QiezhongkongKuangxian {
  框线: "实线" | "虚线";
  显示: string;
}

export const defaultQiezhongkongItem: Required<QiezhongkongItem> = {
  type: "单线框",
  offset: ["0", "0", "0", "0"],
  topY: "",
  bottomY: "",
  leftX: "",
  rightX: "",
  外框: {框线: "实线", 显示: "上下左右"},
  内框: {框线: "实线", 显示: "上下左右"},
  双线框厚度: ""
};
