import {ChangeDetectionStrategy, Component, computed, effect, inject, input, model, untracked, viewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {joinOptions} from "@app/app.common";
import {openBancaiListDialog} from "@components/dialogs/bancai-list/bancai-list.component";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {validateForm} from "@modules/message/components/message/message.utils";
import {InputComponent} from "../../modules/input/components/input.component";

@Component({
  selector: "app-bancai-form",
  templateUrl: "./bancai-form.component.html",
  styleUrls: ["./bancai-form.component.scss"],
  imports: [InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BancaiFormComponent {
  private dialog = inject(MatDialog);

  bancaiListIn = input.required<BancaiList[]>({alias: "bancaiList"});
  extraInputInfos = input<InputInfo[][]>();
  data = model<BancaiFormData>({bancai: "", cailiao: "", houdu: ""});

  bancaiList = computed(() => this.bancaiListIn().filter((v) => !["同框色", "同扇色", "同背封板"].includes(v.mingzi)));
  checkedItem = computed(() => this.bancaiList().find((v) => v.mingzi === this.data().bancai));
  dataEff = effect(() => {
    const data = {...untracked(() => this.data())};
    const checkedItem = this.checkedItem();
    if (checkedItem) {
      data.bancai = checkedItem.mingzi;
      if (checkedItem.cailiaoList.length === 1) {
        data.cailiao = checkedItem.cailiaoList[0];
      } else if (!checkedItem.cailiaoList.includes(data.cailiao)) {
        data.cailiao = "";
      }
      if (checkedItem.houduList.length === 1) {
        data.houdu = checkedItem.houduList[0];
      } else if (!checkedItem.houduList.includes(data.houdu)) {
        data.houdu = "";
      }
    }
    this.data.set(data);
  });

  inputInfos = computed(() => {
    const data = {...this.data()};
    const bancaiList = this.bancaiList();
    const checkedItem = this.checkedItem();
    const onChange = () => {
      this.data.set(data);
    };
    const infos: InputInfo<BancaiFormData>[][] = [
      ...(this.extraInputInfos() || []),
      [
        {
          type: "string",
          label: "板材",
          value: data.bancai,
          selectOnly: true,
          suffixIcons: [
            {
              name: "list",
              isDefault: true,
              onClick: async () => {
                const result = await openBancaiListDialog(this.dialog, {
                  data: {list: bancaiList, checkedItems: checkedItem ? [checkedItem] : undefined}
                });
                if (result) {
                  data.bancai = result[0]?.mingzi;
                  this.data.set(data);
                }
              }
            }
          ],
          validators: Validators.required
        },
        {
          type: "select",
          label: "材料",
          model: {key: "cailiao", data},
          onChange,
          options: checkedItem?.cailiaoList || [],
          validators: Validators.required
        },
        {
          type: "select",
          label: "厚度",
          model: {key: "houdu", data},
          onChange,
          options: checkedItem?.houduList || [],
          validators: Validators.required
        }
      ],
      [
        {
          type: "string",
          label: "可选板材",
          value: joinOptions(data.bancaiList),
          selectOnly: true,
          suffixIcons: [
            {
              name: "list",
              isDefault: true,
              onClick: async () => {
                const bancaiListNames = data.bancaiList || [];
                const checkedItems = bancaiList.filter((v) => bancaiListNames.includes(v.mingzi));
                if (bancaiListNames.includes("全部")) {
                  checkedItems.push({mingzi: "全部", cailiaoList: [], guigeList: [], houduList: []});
                }
                const result = await openBancaiListDialog(this.dialog, {data: {list: bancaiList, checkedItems, multi: true}});
                if (result) {
                  data.bancaiList = result.map((v) => v.mingzi);
                  this.data.set(data);
                }
              }
            }
          ]
        },
        {
          type: "select",
          label: "可选材料",
          model: {key: "cailiaoList", data},
          onChange,
          options: checkedItem?.cailiaoList || [],
          multiple: true
        },
        {
          type: "select",
          label: "可选厚度",
          model: {key: "houduList", data},
          onChange,
          options: checkedItem?.houduList || [],
          multiple: true
        }
      ]
    ];
    return infos;
  });

  inputComponents = viewChildren(InputComponent);
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
