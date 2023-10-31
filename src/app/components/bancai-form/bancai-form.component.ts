import {Component, Input} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {openBancaiListDialog} from "@components/dialogs/bancai-list/bancai-list.component";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";

@Component({
  selector: "app-bancai-form",
  templateUrl: "./bancai-form.component.html",
  styleUrls: ["./bancai-form.component.scss"]
})
export class BancaiFormComponent {
  private _data: BancaiFormData = {bancai: "", cailiao: "", houdu: ""};
  @Input()
  get data() {
    return this._data;
  }
  set data(value) {
    this._data = value;
    this.update();
  }
  private _bancaiList: BancaiList[] = [];
  @Input()
  get bancaiList() {
    return this._bancaiList;
  }
  set bancaiList(value) {
    this._bancaiList = value;
    this.update();
  }
  inputInfos: InputInfo<BancaiFormData>[][] = [];

  constructor(private dialog: MatDialog) {}

  update() {
    const checkedItem = this.bancaiList.find((v) => v.mingzi === this.data.bancai);
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
      [
        {
          type: "string",
          label: "板材",
          value: this.data.bancai,
          readonly: true,
          suffixIcons: [
            {
              name: "list",
              onClick: async () => {
                const result = await openBancaiListDialog(this.dialog, {
                  data: {list: this.bancaiList, checkedItems: checkedItem ? [checkedItem] : undefined}
                });
                if (result?.[0]) {
                  this.data.bancai = result[0].mingzi;
                  this.update();
                }
              }
            }
          ]
        },
        {
          type: "string",
          label: "材料",
          model: {key: "cailiao", data: this.data},
          readonly: true,
          options: checkedItem?.cailiaoList || [],
          isSingleOption: true,
          optionDialog: true,
          optionValueType: "array"
        },
        {
          type: "string",
          label: "厚度",
          model: {key: "houdu", data: this.data},
          readonly: true,
          options: checkedItem?.houduList || [],
          isSingleOption: true,
          optionDialog: true,
          optionValueType: "array"
        }
      ],
      [
        {
          type: "string",
          label: "可选板材",
          value: (this.data.bancaiList || []).join("*"),
          readonly: true,
          suffixIcons: [
            {
              name: "list",
              onClick: async () => {
                const bancaiList = this.data.bancaiList || [];
                const checkedItems = this.bancaiList.filter((v) => bancaiList.includes(v.mingzi));
                if (bancaiList.includes("全部")) {
                  checkedItems.push({mingzi: "全部", cailiaoList: [], guigeList: [], houduList: []});
                }
                const result = await openBancaiListDialog(this.dialog, {data: {list: this.bancaiList, checkedItems, multi: true}});
                if (result?.[0]) {
                  this.data.bancaiList = result.map((v) => v.mingzi);
                  this.update();
                }
              }
            }
          ]
        },
        {
          type: "string",
          label: "可选材料",
          model: {key: "cailiaoList", data: this.data},
          readonly: true,
          options: checkedItem?.cailiaoList || [],
          optionDialog: true,
          optionValueType: "array"
        },
        {
          type: "string",
          label: "可选厚度",
          model: {key: "houduList", data: this.data},
          readonly: true,
          options: checkedItem?.houduList || [],
          optionDialog: true,
          optionValueType: "array"
        }
      ]
    ];
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
