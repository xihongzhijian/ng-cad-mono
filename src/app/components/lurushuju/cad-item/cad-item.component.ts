import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {exportCadData} from "@app/cad/utils";
import {CadData, CadLineLike, CadMtext, CadViewer, CadZhankai, generateLineTexts} from "@lucilor/cad-viewer";
import {getHoutaiCad, HoutaiCad} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";

@Component({
  selector: "app-cad-item",
  standalone: true,
  imports: [InputComponent, MatButtonModule, MatIconModule],
  templateUrl: "./cad-item.component.html",
  styleUrl: "./cad-item.component.scss"
})
export class CadItemComponent implements OnChanges, OnDestroy {
  @Input() itemWidth = 360;
  @Input() cad: HoutaiCad = getHoutaiCad(new CadData());
  @Output() editCad = new EventEmitter<void>();
  @Output() copyCad = new EventEmitter<void>();
  @Output() removeCad = new EventEmitter<void>();
  @Output() cadFormSubmitted = new EventEmitter<void>();
  @HostBinding("style") style = {"--item-width": `${this.itemWidth}px`};

  @ViewChild("cadContainer") cadContainer?: ElementRef<HTMLDivElement>;
  cadViewer?: CadViewer;

  zhankaiInputs: {width: InputInfo; height: InputInfo; num: InputInfo}[] = [];

  constructor(private message: MessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.cad) {
      setTimeout(() => {
        this.updateCad();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.cadViewer?.destroy();
  }

  edit() {
    this.editCad.emit();
  }

  copy() {
    this.copyCad.emit();
  }

  remove() {
    this.removeCad.emit();
  }

  updateCad() {
    const {cad, cadContainer} = this;
    if (cadContainer) {
      const containerEl = cadContainer.nativeElement;
      containerEl.innerHTML = "";
      const width = this.itemWidth;
      const height = (width / 300) * 150;
      const data = new CadData(cad?.json);
      generateLineTexts(data);
      const cadViewer = new CadViewer(data, {
        width,
        height,
        backgroundColor: "black",
        enableZoom: true,
        dragAxis: "xy",
        selectMode: "single",
        entityDraggable: false,
        lineGongshi: 24
      });
      cadViewer.on("entitydblclick", async (_, entity) => {
        if (entity instanceof CadMtext && entity.parent) {
          entity = entity.parent;
        }
        if (!(entity instanceof CadLineLike)) {
          return;
        }
        const form: InputInfo<typeof entity>[] = [
          {type: "string", label: "名字", model: {data: entity, key: "mingzi"}},
          {type: "string", label: "公式", model: {data: entity, key: "gongshi"}}
        ];
        const result = await this.message.form(form);
        if (result) {
          cad.json = exportCadData(data, true);
          this.cadFormSubmitted.emit();
          this.updateCad();
        }
      });
      cadViewer.appendTo(containerEl);
      setTimeout(() => {
        cadViewer.center();
      }, 0);
      this.cadViewer?.destroy();
      this.cadViewer = cadViewer;
      this.updateZhankaiInputs();
    }
  }

  updateZhankaiInputs() {
    const zhankais = this.cad?.json?.zhankai;
    this.zhankaiInputs = [];
    if (!Array.isArray(zhankais)) {
      return;
    }
    if (zhankais.length < 1) {
      zhankais.push(new CadZhankai().export());
    }
    const onChange = debounce(() => {
      this.cadFormSubmitted.emit();
    }, 500);
    for (const zhankai of zhankais) {
      this.zhankaiInputs.push({
        width: {type: "string", label: "宽", model: {data: zhankai, key: "zhankaikuan"}, onChange},
        height: {type: "string", label: "高", model: {data: zhankai, key: "zhankaigao"}, onChange},
        num: {type: "string", label: "数量", model: {data: zhankai, key: "shuliang"}, onChange}
      });
    }
  }

  addZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i + 1, 0, new CadZhankai().export());
    this.updateCad();
    this.cadFormSubmitted.emit();
  }

  removeZhankai(i: number) {
    const zhankai = this.cad?.json?.zhankai;
    if (!Array.isArray(zhankai)) {
      return;
    }
    zhankai.splice(i, 1);
    this.updateCad();
    this.cadFormSubmitted.emit();
  }

  center() {
    this.cadViewer?.center();
  }
}
