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
  signal
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {Formulas} from "@app/utils/calc";
import {BjmkStatusService} from "@components/bujumokuai/services/bjmk-status.service";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {ShuruTableDataSorted} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.types";
import {getShuruItem, getShuruTable} from "@components/lurushuju/lrsj-pieces/lrsj-zuofa/lrsj-zuofa.utils";
import {输入} from "@components/lurushuju/xinghao-data";
import {模块大小配置} from "@components/msbj-rects/msbj-rects.types";
import {VarNamesComponent} from "@components/var-names/var-names.component";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, ToolbarButtonEvent} from "@modules/table/components/table/table.types";
import {MkdxpzEditorCloseEvent} from "./mkdxpz-editor.types";

@Component({
  selector: "app-mkdxpz-editor",
  standalone: true,
  imports: [FormulasEditorComponent, MatButtonModule, MatDividerModule, TableComponent, VarNamesComponent],
  templateUrl: "./mkdxpz-editor.component.html",
  styleUrl: "./mkdxpz-editor.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MkdxpzEditorComponent {
  private bjmkStatus = inject(BjmkStatusService);
  private message = inject(MessageService);

  @HostBinding("class") class = "ng-page";

  data = model.required<模块大小配置>();
  menshanweizhi = input<string>("门扇布局");
  closable = input(false, {transform: booleanAttribute});
  closeOut = output<MkdxpzEditorCloseEvent>({alias: "close"});

  varNames = computed(() => {
    const varNames = this.bjmkStatus.varNames();
    const varNameItem = this.bjmkStatus.varNames().find((v) => v.门扇位置 === this.menshanweizhi());
    const data = this.data();
    if (varNameItem) {
      const group = varNameItem.nameGroups?.[0];
      if (group) {
        for (const name in data.算料公式) {
          if (!group.varNames.includes(name)) {
            group.varNames.push(name);
          }
        }
      }
    }
    return varNames;
  });

  formulas = signal<Formulas>({});
  formulasInEff = effect(() => this.formulas.set(this.data().算料公式), {allowSignalWrites: true});
  formulasOutEff = effect(() => this.data.update((v) => ({...v, 算料公式: this.formulas()})), {allowSignalWrites: true});

  shuruTable = computed(() => getShuruTable(this.data().输入显示));
  async getShuruItem(data0?: 输入) {
    const data = this.data();
    return await getShuruItem(this.message, data.输入显示, data0);
  }
  async updateShuru() {
    const data = this.data();
    this.data.set({...data});
  }
  async onShuruToolbar(event: ToolbarButtonEvent) {
    const data = this.data();
    switch (event.button.event) {
      case "添加":
        {
          const item = await this.getShuruItem();
          if (item) {
            data.输入显示.push(item);
            await this.updateShuru();
          }
        }
        break;
    }
  }
  async onShuruRow(event: RowButtonEvent<ShuruTableDataSorted>) {
    const data = this.data();
    const {button, item} = event;
    switch (button.event) {
      case "编辑":
        {
          const item2 = data.输入显示[item.originalIndex];
          const item3 = await this.getShuruItem(item2);
          if (item3) {
            data.输入显示[item.originalIndex] = item3;
            await this.updateShuru();
          }
        }
        break;
      case "删除":
        if (await this.message.confirm(`确定删除【${item.名字}】吗？`)) {
          data.输入显示.splice(item.originalIndex, 1);
          await this.updateShuru();
        }
        break;
    }
  }

  close(submit = false) {
    const data = submit ? this.data() : null;
    this.closeOut.emit({data});
  }
}
