import {Component, Input, viewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {joinOptions} from "@app/app.common";
import {validateForm} from "@app/modules/message/components/message/message.utils";
import {openBancaiListDialog} from "@components/dialogs/bancai-list/bancai-list.component";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {InputComponent} from "../../modules/input/components/input.component";

@Component({
  selector: "app-bancai-form",
  templateUrl: "./bancai-form.component.html",
  styleUrls: ["./bancai-form.component.scss"],
  standalone: true,
  imports: [InputComponent]
})
export class BancaiFormComponent {
  @Input() extraInputInfos?: InputInfo[][];
  private _data: BancaiFormData = {bancai: "", cailiao: "", houdu: ""};
  @Input()
  get data() {
    return this._data;
  }
  set data(value) {
    this._data = value;
    setTimeout(() => {
      this.update();
    }, 0);
  }
  private _bancaiList: BancaiList[] = [];
  @Input()
  get bancaiList() {
    return this._bancaiList;
  }
  set bancaiList(value) {
    this._bancaiList = value;
    setTimeout(() => {
      this.update();
    }, 0);
  }
  inputInfos: InputInfo<BancaiFormData>[][] = [];

  inputComponents = viewChildren(InputComponent);

  constructor(private dialog: MatDialog) {}

  update() {
    const bancaiList = this.bancaiList.filter((v) => !["同框色", "同扇色", "同背封板"].includes(v.mingzi));
    const checkedItem = bancaiList.find((v) => v.mingzi === this.data.bancai);
    if (checkedItem) {
      this.data.bancai = checkedItem.mingzi;
      if (checkedItem.cailiaoList.length === 1) {
        this.data.cailiao = checkedItem.cailiaoList[0];
      } else if (!checkedItem.cailiaoList.includes(this.data.cailiao)) {
        this.data.cailiao = "";
      }
      if (checkedItem.houduList.length === 1) {
        this.data.houdu = checkedItem.houduList[0];
      } else if (!checkedItem.houduList.includes(this.data.houdu)) {
        this.data.houdu = "";
      }
    }
    this.inputInfos = [
      ...(this.extraInputInfos || []),
      [
        {
          type: "string",
          label: "板材",
          value: this.data.bancai,
          readonly: true,
          suffixIcons: [
            {
              name: "list",
              isDefault: true,
              onClick: async () => {
                const result = await openBancaiListDialog(this.dialog, {
                  data: {list: bancaiList, checkedItems: checkedItem ? [checkedItem] : undefined}
                });
                if (result) {
                  this.data.bancai = result[0]?.mingzi;
                  this.update();
                }
              }
            }
          ],
          validators: Validators.required
        },
        {
          type: "select",
          label: "材料",
          model: {key: "cailiao", data: this.data},
          options: checkedItem?.cailiaoList || [],
          validators: Validators.required
        },
        {
          type: "select",
          label: "厚度",
          model: {key: "houdu", data: this.data},
          options: checkedItem?.houduList || [],
          validators: Validators.required
        }
      ],
      [
        {
          type: "string",
          label: "可选板材",
          value: joinOptions(this.data.bancaiList),
          readonly: true,
          suffixIcons: [
            {
              name: "list",
              isDefault: true,
              onClick: async () => {
                const bancaiListNames = this.data.bancaiList || [];
                const checkedItems = bancaiList.filter((v) => bancaiListNames.includes(v.mingzi));
                if (bancaiListNames.includes("全部")) {
                  checkedItems.push({mingzi: "全部", cailiaoList: [], guigeList: [], houduList: []});
                }
                const result = await openBancaiListDialog(this.dialog, {data: {list: bancaiList, checkedItems, multi: true}});
                if (result) {
                  this.data.bancaiList = result.map((v) => v.mingzi);
                  this.update();
                }
              }
            }
          ]
        },
        {
          type: "select",
          label: "可选材料",
          model: {key: "cailiaoList", data: this.data},
          options: checkedItem?.cailiaoList || [],
          multiple: true
        },
        {
          type: "select",
          label: "可选厚度",
          model: {key: "houduList", data: this.data},
          options: checkedItem?.houduList || [],
          multiple: true
        }
      ]
    ];
  }

  async validate() {
    return await validateForm(this.inputComponents());
  }
}

export interface BancaiFormData {
  bancai: string;
  cailiao: string;
  houdu: string;
  bancaiList?: string[];
  cailiaoList?: string[];
  houduList?: string[];
}
