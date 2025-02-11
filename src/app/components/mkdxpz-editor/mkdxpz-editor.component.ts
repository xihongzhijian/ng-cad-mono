import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  model,
  output,
  signal,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {FormulasValidatorFn} from "@components/formulas-editor/formulas-editor.types";
import {ShuruTableDataSorted} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.types";
import {getShuruItem, getShuruTable} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.utils";
import {输入} from "@components/lurushuju/xinghao-data";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {VarNamesComponent} from "@components/var-names/var-names.component";
import {VarNameItem} from "@components/var-names/var-names.types";
import {SuanliaogongshiComponent} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.component";
import {SuanliaogongshiInfo} from "@modules/cad-editor/components/suanliaogongshi/suanliaogongshi.types";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {justifyMkdxpzSlgs} from "@views/msbj/msbj.utils";
import {cloneDeep} from "lodash";
import {MkdxpzEditorCloseEvent, MkdxpzEditorData} from "./mkdxpz-editor.types";
import {getNodesTable} from "./mkdxpz-editor.utils";

@Component({
  selector: "app-mkdxpz-editor",
  imports: [MatButtonModule, MatDividerModule, MsbjRectsComponent, SuanliaogongshiComponent, TableComponent, VarNamesComponent],
  templateUrl: "./mkdxpz-editor.component.html",
  styleUrl: "./mkdxpz-editor.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MkdxpzEditorComponent {
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  dataIn = model.required<MkdxpzEditorData>({alias: "data"});
  varNameItem = model.required<VarNameItem>();
  title = input("");
  validator = input<FormulasValidatorFn>();
  closable = input(false, {transform: booleanAttribute});
  closeOut = output<MkdxpzEditorCloseEvent>({alias: "close"});

  data = signal<MkdxpzEditorData>({});
  dataEff = effect(() => {
    this.data.set(cloneDeep(this.dataIn()));
  });
  nodeNames = computed(() => this.data().nodes?.map((v) => v.层名字) || []);

  slgsInfo = signal<SuanliaogongshiInfo>({
    data: {},
    slgs: {
      title: "模块大小公式（只用于模块大小计算）",
      justify: (item) => justifyMkdxpzSlgs(item, this.nodeNames()),
      validator: (formulasList) => {
        if (formulasList.some((v) => !v[1])) {
          return {模块大小公式不完整: true};
        }
        return null;
      }
    }
  });
  slgsInfoInEff = effect(() => {
    const 算料公式 = this.data().dxpz?.算料公式2;
    if (Array.isArray(算料公式)) {
      this.slgsInfo.update((v) => ({...v, data: {算料公式}}));
    }
  });
  slgsInfoOutEff = effect(() => {
    const slgsInfo = this.slgsInfo();
    if (slgsInfo) {
      this.data.update((data) => {
        const dxpz = data.dxpz;
        if (dxpz) {
          dxpz.算料公式2 = slgsInfo.data.算料公式;
        }
        return data;
      });
    }
  });

  nodesTable = computed(() => {
    const nodes = this.data().nodes;
    if (nodes) {
      return getNodesTable(nodes);
    } else {
      return null;
    }
  });

  shuruTable = computed(() => getShuruTable(this.data().dxpz?.输入显示 || []));
  async getShuruItem(data0?: 输入) {
    const data = this.data();
    return await getShuruItem(this.message, data.dxpz?.输入显示 || [], data0);
  }
  async updateShuru() {
    const data = this.data();
    this.data.set({...data});
  }
  async onShuruToolbar(event: ToolbarButtonEvent) {
    const data = this.data();
    const arr = data.dxpz?.输入显示;
    if (!arr) {
      return;
    }
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getShuruItem();
          if (item) {
            arr.push(item);
            await this.updateShuru();
          }
        }
        break;
    }
  }
  async onShuruRow(event: RowButtonEvent<ShuruTableDataSorted>) {
    const data = this.data();
    const {button, item} = event;
    const arr = data.dxpz?.输入显示;
    if (!arr) {
      return;
    }
    switch (button.event) {
      case "编辑":
        {
          const item2 = arr[item.originalIndex];
          const item3 = await this.getShuruItem(item2);
          if (item3) {
            arr[item.originalIndex] = item3;
            await this.updateShuru();
          }
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          arr.splice(item.originalIndex, 1);
          await this.updateShuru();
        }
        break;
    }
  }

  slgsComponent = viewChild.required(SuanliaogongshiComponent);
  async submit() {
    return await this.slgsComponent().submit();
  }

  async close(submit = false) {
    if (submit && !(await this.submit()).fulfilled) {
      return;
    }
    const data = submit ? this.data() : null;
    this.closeOut.emit({data});
  }
}
