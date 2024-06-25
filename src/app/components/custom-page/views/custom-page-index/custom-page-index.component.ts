import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  viewChild
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {ActivatedRoute} from "@angular/router";
import {KeyEventItem, onKeyEvent, session, setGlobal} from "@app/app.common";
import {Subscribed} from "@app/mixins/subscribed.mixin";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {MessageService} from "@app/modules/message/services/message.service";
import {SpinnerService} from "@app/modules/spinner/services/spinner.service";
import {getPdfInfo, htmlToPng} from "@app/utils/print";
import {downloadByString, selectFiles} from "@lucilor/utils";
import {Properties} from "csstype";
import {NgScrollbarModule} from "ngx-scrollbar";
import {createPdf} from "pdfmake/build/pdfmake";
import {TDocumentDefinitions} from "pdfmake/interfaces";
import printJS from "print-js";
import {PageComponentConfig2Component} from "../../menus/page-component-config2/page-component-config2.component";
import {PageComponentConfigComponent} from "../../menus/page-component-config/page-component-config.component";
import {PageComponentsSeletComponent} from "../../menus/page-components-select/page-components-select.component";
import {PageConfigComponent} from "../../menus/page-config/page-config.component";
import {Page, PageConfig} from "../../models/page";
import {PageComponentTypeAny} from "../../models/page-component-infos";
import {findPageComponent} from "../../models/page-component-utils";
import {PageSnapshotManager} from "../../models/page-snapshot-manager";
import {PageComponentsDiaplayComponent} from "../page-components-diaplay/page-components-diaplay.component";
import {PagesDataRaw, Zidingyibaobiao} from "./custom-page-index.types";

@Component({
  selector: "app-custom-page-index",
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    NgScrollbarModule,
    PageComponentConfigComponent,
    PageComponentConfig2Component,
    PageComponentsDiaplayComponent,
    PageComponentsSeletComponent,
    PageConfigComponent
  ],
  templateUrl: "./custom-page-index.component.html",
  styleUrl: "./custom-page-index.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomPageIndexComponent extends Subscribed() implements OnInit, OnDestroy {
  private message = inject(MessageService);
  private spinner = inject(SpinnerService);
  private route = inject(ActivatedRoute);
  private http = inject(CadDataService);

  @HostBinding("class") class = "ng-page";

  table = "t_zidingyibaobiaomuban";
  page = new Page();
  psm = new PageSnapshotManager(session, 20, this.page.id);
  snapshotIndex = signal(-1);
  savedSnapshotIndex = signal(-1);
  isSaved = computed(() => this.snapshotIndex() === this.savedSnapshotIndex());
  pageConfig = signal<PageConfig>(this.page.getPageConfig());
  pageStyle = signal<ReturnType<Page["getStyle"]>>({});
  pagePlaceholderStyle = signal<Properties>({});
  workSpaceStyle = signal<Properties>({});
  components = signal<PageComponentTypeAny[]>([]);
  activeComponent = signal<PageComponentTypeAny | null>(null);
  activeComponent2 = signal<PageComponentTypeAny | null>(null);
  canUndo = signal(false);
  canRedo = signal(false);
  showComponentMenu = signal(false);

  private _menuTabIndexKey = "customPageMenuTabIndex";
  menuTabIndex = signal(session.load(this._menuTabIndexKey) || 0);
  keyEventItems: KeyEventItem[] = [
    {key: "z", ctrl: true, action: () => this.undo()},
    {key: "y", ctrl: true, action: () => this.redo()}
  ];

  workSpaceEl = viewChild.required<ElementRef<HTMLDivElement>>("workSpaceEl");
  pageEl = viewChild.required<ElementRef<HTMLDivElement>>("pageEl");

  constructor() {
    super();
    setGlobal("customPage", this);
    effect(() => session.save(this._menuTabIndexKey, this.menuTabIndex()));
    effect(() => this.onComponentsChanged(), {allowSignalWrites: true});
    effect(() => this.onActiveComponentChanged(), {allowSignalWrites: true});
    this.subscribe(this.route.queryParams, () => this.load());
    this.loadPageSnapshot();
  }

  ngOnInit() {
    window.addEventListener("beforeunload", this.beforeUnload.bind(this));
  }
  ngOnDestroy() {
    super.ngOnDestroy();
    window.removeEventListener("beforeunload", this.beforeUnload.bind(this));
  }

  updatePageStyle() {
    this.pageStyle.set(this.page.getStyle());
    this.workSpaceStyle.set({...this.page.workSpaceStyle});
  }
  updatePageComponents() {
    this._noSaveOnComponentsChanged = true;
    this.components.set([...this.page.components]);
  }
  updatePage() {
    this.updatePageStyle();
    this.updatePageComponents();
    this.pageConfig.set(this.page.getPageConfig());
  }

  loadPageSnapshot() {
    const {snapshot, canUndo, canRedo, index} = this.psm.loadSnapshot();
    if (snapshot) {
      this.page.import(snapshot);
      this.updatePage();
    } else {
      this.initPage();
      this.updatePage();
    }
    this.canUndo.set(canUndo);
    this.canRedo.set(canRedo);
    this.snapshotIndex.set(index);
  }
  savePageSnapshot() {
    const {canUndo, canRedo, index} = this.psm.saveSnapshot(this.page.export());
    this.canUndo.set(canUndo);
    this.canRedo.set(canRedo);
    if (this.snapshotIndex() !== index) {
      this.snapshotIndex.set(index);
    } else {
      this.savedSnapshotIndex.update((v) => v - 1);
    }
  }
  undo() {
    const {snapshot, canUndo, index} = this.psm.undo();
    if (snapshot) {
      this.page.import(snapshot);
      this.updatePage();
    }
    this.canUndo.set(canUndo);
    this.canRedo.set(true);
    this.snapshotIndex.set(index);
  }
  redo() {
    const {snapshot, canRedo, index} = this.psm.redo();
    if (snapshot) {
      this.page.import(snapshot);
      this.updatePage();
    }
    this.canUndo.set(true);
    this.canRedo.set(canRedo);
    this.snapshotIndex.set(index);
  }
  resetPageSnapshot() {
    this.psm.reset();
    this.savePageSnapshot();
  }

  @HostListener("window:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    onKeyEvent(event, this.keyEventItems);
  }

  async initPage() {
    this.page = new Page();
    this.page.padding = [12, 12, 12, 12];
    this.page.workSpaceStyle.backgroundColor = "lightgray";
    this.page.backgroundOuter = "pink";
  }
  async resetPage() {
    this.initPage();
    this.updatePage();
    this.savePageSnapshot();
  }
  async import() {
    const files = await selectFiles({accept: ".json"});
    const file = files?.[0];
    if (!file) {
      return;
    }
    try {
      const data = JSON.parse(await file.text());
      this.page.import(data);
      this.psm.id = this.page.id;
      this.updatePage();
      this.savePageSnapshot();
      await this.message.snack("导入成功");
    } catch (e) {
      console.error(e);
      await this.message.snack("导入失败");
    }
  }
  export() {
    const data = this.page.export();
    downloadByString(JSON.stringify(data), {filename: "page.json"});
  }
  async getPagePng() {
    this.spinner.show(this.spinner.defaultLoaderId, {text: "正在生成图片"});
    const el = this.pageEl().nativeElement;
    const {x: mmWidth, y: mmHeight} = this.page.size;
    const result = await htmlToPng(el, mmWidth, mmHeight);
    this.spinner.hide(this.spinner.defaultLoaderId);
    return result;
  }
  async getPagePdf() {
    const {png, info} = await this.getPagePng();
    const params: TDocumentDefinitions = {
      info: getPdfInfo({title: "自定义报表"}),
      content: [{image: png, width: info.width, height: info.height}],
      pageMargins: 0
    };
    const page = this.page;
    if (page.sizeName === "自定义") {
      params.pageSize = {width: page.size.x, height: page.size.y};
    } else {
      params.pageSize = page.sizeName;
      params.pageOrientation = page.orientation;
    }
    const pdf = createPdf(params);
    return pdf;
  }
  async preview() {
    const pdf = await this.getPagePdf();
    this.spinner.show(this.spinner.defaultLoaderId, {text: "正在打印"});
    const blob = await new Promise<Blob>((resolve) => {
      pdf.getBlob((b) => resolve(b));
    });
    this.spinner.hide(this.spinner.defaultLoaderId);
    const url = URL.createObjectURL(blob);
    printJS({printable: url, type: "pdf"});
    URL.revokeObjectURL(url);
  }
  async save() {
    const {id} = this.route.snapshot.queryParams;
    if (!id) {
      return;
    }
    const data: PagesDataRaw = {pages: [this.page.export()]};
    const mubanshuju = JSON.stringify(data);
    await this.http.tableUpdate<Zidingyibaobiao>({table: this.table, data: {vid: id, mubanshuju}});
    const index = this.snapshotIndex();
    this.savedSnapshotIndex.set(index);
    this.psm.setSavedSnapshotIndex(index);
  }
  async load() {
    const {id} = this.route.snapshot.queryParams;
    if (!id) {
      return;
    }
    const records = await this.http.queryMySql<Zidingyibaobiao>({table: this.table, filter: {where: {vid: id}}});
    const record = records[0];
    if (!record) {
      return;
    }
    let data: PagesDataRaw | undefined;
    const mubanshuju = record.mubanshuju;
    if (typeof mubanshuju === "string" && mubanshuju.length > 0) {
      try {
        data = JSON.parse(mubanshuju);
      } catch (error) {
        console.error(error);
      }
    }
    if (!data) {
      return;
    }
    const pageData = data.pages?.[0];
    if (!pageData) {
      return;
    }
    this.page.import(pageData);
    this.psm.id = this.page.id;
    this.psm.reset();
    this.savePageSnapshot();
    this.updatePage();
    this.psm.setSavedSnapshotIndex(0);
    this.savedSnapshotIndex.set(0);
    this.canUndo.set(false);
    this.canRedo.set(false);
  }

  onPageConfigChanged(config: PageConfig) {
    this.page.setPageConfig(config);
    this.pageConfig.set(this.page.getPageConfig());
    this.updatePageStyle();
    this.savePageSnapshot();
  }

  private _pagePointer: [number, number] | null = null;
  onPagePointerDown(event: PointerEvent) {
    this._pagePointer = [event.clientX, event.clientY];
  }
  onPagePointerUp(event: PointerEvent) {
    const target = event.target as HTMLElement;
    const isClickPage =
      target === this.pageEl().nativeElement || target.classList.contains("page-inner") || target.tagName === "APP-PAGE-COMPONENTS-DIAPLAY";
    if (!this._pagePointer || !isClickPage) {
      return;
    }
    const [x, y] = this._pagePointer;
    this._pagePointer = null;
    if (Math.abs(event.clientX - x) < 5 && Math.abs(event.clientY - y) < 5) {
      this.activeComponent.set(null);
    }
  }

  private _noSaveOnComponentsChanged = true;
  onComponentsChanged() {
    const components = this.components();
    const activeComponent = untracked(() => this.activeComponent());
    if (activeComponent) {
      this.activeComponent.set(findPageComponent(activeComponent.id, components));
    }
    this.page.components = components;
    if (this._noSaveOnComponentsChanged) {
      this._noSaveOnComponentsChanged = false;
    } else {
      this.savePageSnapshot();
    }
  }
  onActiveComponentChanged() {
    const activeComponent = this.activeComponent();
    if (activeComponent) {
      this.showComponentMenu.set(true);
    }
  }

  beforeUnload(event: BeforeUnloadEvent) {
    if (this.isSaved()) {
      return;
    }
    event.preventDefault();
    // eslint-disable-next-line deprecation/deprecation
    event.returnValue = "";
  }
}
