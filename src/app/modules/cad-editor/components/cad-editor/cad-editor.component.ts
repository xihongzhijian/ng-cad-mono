import {animate, state, style, transition, trigger} from "@angular/animations";
import {CdkDrag, CdkDragEnd, CdkDragMove, CdkDragStart} from "@angular/cdk/drag-drop";
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild,
  viewChildren
} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabChangeEvent, MatTabGroup, MatTabsModule} from "@angular/material/tabs";
import {setGlobal} from "@app/app.common";
import {openCadDimensionForm} from "@app/cad/utils";
import {SuanliaoTablesComponent} from "@components/lurushuju/suanliao-tables/suanliao-tables.component";
import {Debounce} from "@decorators/debounce";
import {CadDimensionLinear, CadEntities, CadEventCallBack, CadLineLike, CadMtext} from "@lucilor/cad-viewer";
import {queryString, timeout} from "@lucilor/utils";
import {Subscribed} from "@mixins/subscribed.mixin";
import {ContextMenuModule} from "@modules/context-menu/context-menu.module";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {OpenCadOptions} from "@services/app-status.types";
import {CadStatusAssemble, CadStatusNormal, CadStatusSplit} from "@services/cad-status";
import {debounce, throttle} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {take} from "rxjs";
import {SpinnerComponent} from "../../../spinner/components/spinner/spinner.component";
import {CadPointsComponent} from "../cad-points/cad-points.component";
import {CadAssembleComponent} from "../menu/cad-assemble/cad-assemble.component";
import {CadDimensionComponent} from "../menu/cad-dimension/cad-dimension.component";
import {CadFentiConfigComponent} from "../menu/cad-fenti-config/cad-fenti-config.component";
import {CadStatusFentiConfig} from "../menu/cad-fenti-config/cad-fenti-config.utils";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CadLineComponent} from "../menu/cad-line/cad-line.component";
import {openCadLineForm} from "../menu/cad-line/cad-line.utils";
import {CadMtextComponent} from "../menu/cad-mtext/cad-mtext.component";
import {CadSplitComponent} from "../menu/cad-split/cad-split.component";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {SuanliaogongshiComponent} from "../suanliaogongshi/suanliaogongshi.component";
import {CadEditorMenuName} from "./cad-editor.utils";

@Component({
  selector: "app-cad-editor",
  templateUrl: "./cad-editor.component.html",
  styleUrls: ["./cad-editor.component.scss"],
  animations: [
    trigger("closeTop", [
      state("open", style({transform: "translateY(0)"})),
      state("closed", style({transform: "translateY(-100%)"})),
      transition("open <=> closed", [animate("0.3s")])
    ]),
    trigger("closeRight", [
      state("open", style({transform: "translateX(0)"})),
      state("closed", style({transform: "translateX(100%)"})),
      transition("open <=> closed", [animate("0.3s")])
    ]),
    trigger("closeBottom", [
      state("open", style({transform: "translateY(0)"})),
      state("closed", style({transform: "translateY(100%)"})),
      transition("open <=> closed", [animate("0.3s")])
    ]),
    trigger("closeLeft", [
      state("open", style({transform: "translateX(0)"})),
      state("closed", style({transform: "translateX(-100%)"})),
      transition("open <=> closed", [animate("0.3s")])
    ]),
    trigger("menuWidth", [
      transition(":enter", [style({opacity: 0}), animate("0.5s", style({opacity: 1}))]),
      transition(":leave", [style({opacity: 1}), animate("0.5s", style({opacity: 0}))])
    ])
  ],
  imports: [
    CadAssembleComponent,
    CadDimensionComponent,
    CadFentiConfigComponent,
    CadInfoComponent,
    CadLineComponent,
    CadMtextComponent,
    CadPointsComponent,
    CadSplitComponent,
    CdkDrag,
    ContextMenuModule,
    forwardRef(() => InputComponent),
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTabsModule,
    NgScrollbar,
    SpinnerComponent,
    SuanliaogongshiComponent,
    SuanliaoTablesComponent,
    SubCadsComponent,
    ToolbarComponent
  ]
})
export class CadEditorComponent extends Subscribed() implements AfterViewInit, OnDestroy {
  private config = inject(AppConfigService);
  private status = inject(AppStatusService);
  private message = inject(MessageService);
  private el = inject(ElementRef<HTMLElement>);

  params = input<OpenCadOptions>();
  paramsEff = effect(() => this.refresh());

  private _isViewInited = false;
  ngAfterViewInit() {
    setGlobal("cadEditor", this);
    const cad = this.status.cad;
    cad.appendTo(this.cadContainer().nativeElement);
    cad.on("entitiescopy", this._onEntitiesCopy);
    cad.on("entitiespaste", this._onEntitiesPaste);
    cad.on("entitiesremove", this._onEntitiesRemove);
    cad.on("entitydblclick", this._onEntityDblClick);
    cad.on("entitiesselect", this._onEntitySelect);
    cad.on("entitiesunselect", this._onEntityUnselect);
    cad.on("zoom", this._onZoom);
    cad.on("moveentities", this._onMoveEntities);
    cad.on("moveentitiesend", this._onMoveEntitiesEnd);
    cad.on("entitiesadd", this._onEntitiesAdd);
  }
  ngOnDestroy() {
    super.ngOnDestroy();
    const cad = this.status.cad;
    cad.off("entitiescopy", this._onEntitiesCopy);
    cad.off("entitiespaste", this._onEntitiesPaste);
    cad.off("entitiesremove", this._onEntitiesRemove);
    cad.off("entitydblclick", this._onEntityDblClick);
    cad.off("entitiesselect", this._onEntitySelect);
    cad.off("entitiesunselect", this._onEntityUnselect);
    cad.off("zoom", this._onZoom);
    cad.off("moveentities", this._onMoveEntities);
    cad.off("moveentitiesend", this._onMoveEntitiesEnd);
    cad.off("entitiesadd", this._onEntitiesAdd);
  }

  cadStatusesEff = effect(() => {
    this.status.cadStatuses();
    this._highlightEntities();
  });

  shownMenuNames = signal<CadEditorMenuName[]>(["cadInfo"]);
  shownMenuNamesEff = effect(() => {
    if (this.status.hasCadStatus((v) => v instanceof CadStatusAssemble)) {
      this.shownMenuNames.set(["cadAssemble"]);
    } else if (this.status.hasCadStatus((v) => v instanceof CadStatusSplit)) {
      this.shownMenuNames.set(["cadInfo", "cadSplit"]);
    } else {
      this.shownMenuNames.set(["cadInfo"]);
    }
  });

  showTopMenu = signal(true);
  showLeftMenu = signal(true);
  showRightMenu = signal(true);
  showBottomMenu = signal(true);
  showSuanliaoTables = signal(false);
  showSuanliaogongshi = signal(false);
  showAllMenu = signal(true);
  toggleTopMenu(show?: boolean) {
    this.showTopMenu.set(show ?? !this.showTopMenu());
  }
  toggleLeftMenu(show?: boolean) {
    this.showLeftMenu.set(show ?? !this.showLeftMenu());
  }
  toggleRightMenu(show?: boolean) {
    this.showRightMenu.set(show ?? !this.showRightMenu());
  }
  toggleBottomMenu(show?: boolean) {
    this.showBottomMenu.set(show ?? !this.showBottomMenu());
  }
  toggleSuanliaoTables(show?: boolean) {
    this.showSuanliaoTables.set(show ?? !this.showSuanliaoTables());
  }
  toggleSuanliaogongshi(show?: boolean) {
    this.showSuanliaogongshi.set(show ?? !this.showSuanliaogongshi());
  }
  toggleAllMenu(show?: boolean) {
    this.showAllMenu.set(show ?? !this.showAllMenu());
    show = this.showAllMenu();
    this.toggleTopMenu(show);
    this.toggleLeftMenu(show);
    this.toggleRightMenu(show);
    this.toggleBottomMenu(show);
    this.toggleSuanliaoTables(show);
    this.toggleSuanliaogongshi(show);
  }

  suanliaogongshiLeft = computed(() => {
    if (!this._isViewInited) {
      return 0;
    }
    if (this.showLeftMenu()) {
      return this.leftMenuWidth0();
    }
    return 30;
  });
  suanliaoTablesLeft = computed(() => {
    if (!this._isViewInited) {
      return 0;
    }
    let left = 0;
    const suanliaogongshiEl = this.suanliaogongshi()?.nativeElement;
    if (suanliaogongshiEl) {
      left += suanliaogongshiEl.clientWidth;
    }
    if (this.showLeftMenu()) {
      left += this.leftMenuWidth0();
    } else {
      left += 30;
    }
    return left;
  });

  tabIndex = signal(0);
  tabIndexPrev = -1;

  cadFentiOn = computed(() => this.status.hasCadStatus((v) => v instanceof CadStatusFentiConfig));
  tabFentiIndexPrev = -1;
  cadFentiOnEff = effect(() => {
    const fentiTabIndex = 4;
    const tabIndexCurr = untracked(() => this.tabIndex());
    if (this.cadFentiOn()) {
      setTimeout(() => {
        this._disableNextInfoTabIndexSync = true;
        this.tabFentiIndexPrev = tabIndexCurr;
        this.tabIndex.set(fentiTabIndex);
      }, 0);
    } else {
      if (this.tabFentiIndexPrev >= 0 && tabIndexCurr === fentiTabIndex) {
        this._disableNextInfoTabIndexSync = true;
        this.tabIndex.set(this.tabFentiIndexPrev);
        this.tabFentiIndexPrev = -1;
      }
    }
  });

  cadLength = computed(() => this.status.cadTotalLength().toFixed(2));

  menuPaddingBase = [20, 20, 20, 20];
  leftMenuWidth0 = signal(0);
  leftMenuWidth = computed(() => this.draggingLeft()?.width ?? this.leftMenuWidth0());
  rightMenuWidth0 = signal(0);
  rightMenuWidth = computed(() => this.draggingRight()?.width ?? this.rightMenuWidth0());
  topMenuHeight = signal<number>(80);
  bottomMenuHeight = signal<number>(20);
  leftMenuWidthEff = effect(() => {
    this.leftMenuWidth0.set(this.config.getConfig("leftMenuWidth"));
  });
  rightMenuWidthEff = effect(() => {
    this.rightMenuWidth0.set(this.config.getConfig("rightMenuWidth"));
  });

  draggingLeft = signal<{width: number} | null>(null);
  draggingRight = signal<{width: number} | null>(null);
  onResizeMenuStart(_event: CdkDragStart, key: Dragkey) {
    if (key === "leftMenuWidth") {
      this.draggingLeft.set({width: this.leftMenuWidth0()});
    } else if (key === "rightMenuWidth") {
      this.draggingRight.set({width: this.rightMenuWidth0()});
    }
  }
  onResizeMenu(event: CdkDragMove, key: Dragkey) {
    const dx = event.distance.x;
    if (key === "leftMenuWidth") {
      this.draggingLeft.update((v) => ({...v, width: this.leftMenuWidth0() + dx}));
    } else if (key === "rightMenuWidth") {
      this.draggingRight.update((v) => ({...v, width: this.rightMenuWidth0() - dx}));
    }
    event.source.element.nativeElement.style.transform = "";
  }
  onResizeMenuEnd(_event: CdkDragEnd, key: Dragkey) {
    const draggingLeft = this.draggingLeft();
    const draggingRight = this.draggingRight();
    if (key === "leftMenuWidth" && draggingLeft) {
      this.config.setConfig(key, draggingLeft.width);
      this.draggingLeft.set(null);
    } else if (key === "rightMenuWidth" && draggingRight) {
      this.config.setConfig(key, draggingRight.width);
      this.draggingRight.set(null);
    }
  }

  cadPaddingEff = effect(() => {
    const padding = this.menuPaddingBase.slice();
    if (this.showTopMenu()) {
      padding[0] += this.topMenuHeight();
    }
    if (this.showRightMenu()) {
      padding[1] += this.rightMenuWidth0();
    }
    if (this.showBottomMenu()) {
      padding[2] += this.bottomMenuHeight();
    }
    if (this.showLeftMenu()) {
      padding[3] += this.leftMenuWidth0();
    }
    const suanliaogongshiEl = this.suanliaogongshi()?.nativeElement;
    if (suanliaogongshiEl && this.showSuanliaogongshi()) {
      padding[3] += suanliaogongshiEl.clientWidth;
    }
    const suanliaoTablesEl = this.suanliaoTables()?.nativeElement;
    if (suanliaoTablesEl && this.showSuanliaoTables()) {
      padding[3] += suanliaoTablesEl.clientWidth;
    }
    this.config.setConfig({padding}, {sync: false});
  });

  spinnerId = "cadEditor";
  openCadOptions = this.status.openCadOptions;

  get multiSelect() {
    return this.status.cad.getConfig("selectMode") === "multiple";
  }
  get entityDraggable() {
    return this.status.cad.getConfig("entityDraggable");
  }
  hasCadStatusNotNormal = computed(() => this.status.hasOtherCadStatus((v) => v instanceof CadStatusNormal));
  cadStatusesName = computed(() =>
    this.status
      .cadStatuses()
      .map((v) => v.name)
      .join(", ")
  );

  infoTabGroup = viewChild(MatTabGroup);
  infoTabGroupEff = effect(() => {
    const infoTabGroup = this.infoTabGroup();
    untracked(() => {
      const setInfoTabs = () => {
        const {infoTabIndex, scroll} = this.config.getConfig();
        if (infoTabGroup && typeof infoTabIndex === "number" && infoTabIndex >= 0) {
          infoTabGroup.selectedIndex = infoTabIndex;
        }
        if (scroll) {
          this._setTabScroll();
        }
      };
      setInfoTabs();
      infoTabGroup?.animationDone.pipe(take(1)).subscribe(() => {
        setTimeout(() => {
          setInfoTabs();
        }, 0);
      });
      const sub = this.config.configChange$.subscribe(({isUserConfig}) => {
        if (isUserConfig) {
          setInfoTabs();
          sub.unsubscribe();
        }
      });
    });
  });

  cadContainer = viewChild.required<ElementRef<HTMLElement>>("cadContainer");
  suanliaogongshi = viewChild<ElementRef<HTMLElement>>("suanliaogongshi");
  suanliaoTables = viewChild<ElementRef<HTMLElement>>("suanliaoTables");

  private _scrollbars = viewChildren(NgScrollbar);
  private get _scrollbar() {
    return this._scrollbars().at(this.tabIndex());
  }
  scrollbarEff = effect(() => {
    setTimeout(() => {
      for (const scrollbar of this._scrollbars()) {
        scrollbar.viewport.nativeElement.addEventListener("scroll", this.onScrollChange);
      }
    }, 0);
  });
  private _scrollChangeLock = false;

  onScrollChange = debounce(() => {
    const scrollbar = this._scrollbar;
    if (this._scrollChangeLock || !scrollbar) {
      return;
    }
    const scroll = this.config.getConfig("scroll");
    scroll["tab" + this.tabIndex()] = this._scrollbar.viewport.nativeElement.scrollTop;
    this.config.setConfig("scroll", scroll);
  }, 1000);

  private _onEntitiesCopy: CadEventCallBack<"entitiescopy"> = async (entities) => {
    const cad = this.status.cad;
    entities.forEach((e) => (e.opacity = 0.3));
    cad.data.entities.merge(entities);
    cad.unselectAll();
    await cad.render(entities);
  };
  private _onEntitiesPaste: CadEventCallBack<"entitiespaste"> = async (entities) => {
    const cad = this.status.cad;
    entities.forEach((e) => (e.opacity = 1));
    await cad.render(entities);
    await this.status.refreshCadFenti();
  };
  private _onEntitiesRemove: CadEventCallBack<"entitiesremove"> = async () => {
    this._highlightEntities();
    await this.status.updateCadTotalLength();
  };
  private _onEntityDblClick: CadEventCallBack<"entitydblclick"> = async (_, entity) => {
    const collection = this.status.collection();
    const cad = this.status.cad;
    const gongshis = this.status.openCadOptions().gongshis;
    if (entity instanceof CadMtext && entity.parent instanceof CadLineLike) {
      openCadLineForm(collection, this.status, this.message, cad, entity.parent, gongshis);
    } else if (entity instanceof CadLineLike) {
      openCadLineForm(collection, this.status, this.message, cad, entity, gongshis);
    } else if (entity instanceof CadDimensionLinear) {
      openCadDimensionForm(collection, this.message, cad, entity);
    }
  };
  private _onEntitySelect: CadEventCallBack<"entitiesselect"> = () => {
    this._highlightEntities();
  };
  private _onEntityUnselect: CadEventCallBack<"entitiesunselect"> = () => {
    this._highlightEntities();
  };
  private _onZoom: CadEventCallBack<"zoom"> = () => {
    this._highlightEntities();
  };
  private _onMoveEntities: CadEventCallBack<"moveentities"> = () => {
    this._highlightEntities();
  };
  private _onMoveEntitiesEnd: CadEventCallBack<"moveentitiesend"> = async () => {
    await this.status.refreshCadFenti();
  };
  private _onEntitiesAdd: CadEventCallBack<"entitiesadd"> = async () => {
    await this.status.refreshCadFenti();
  };
  private async _highlightEntities() {
    const highlightedEntities = new CadEntities();
    if (!this.status.hasOtherCadStatus((v) => v instanceof CadStatusNormal || v instanceof CadStatusFentiConfig)) {
      await timeout(0);
      const highlightedEntities1 = this.status.highlightDimensions();
      const highlightedEntities2 = this.status.highlightLineTexts(undefined, highlightedEntities1);
      highlightedEntities.merge(highlightedEntities1);
      highlightedEntities.merge(highlightedEntities2);
    }
    return highlightedEntities;
  }

  private async _setTabScroll() {
    const scrollbar = this._scrollbar;
    if (!scrollbar) {
      return;
    }
    const scroll = this.config.getConfig("scroll");
    const key = "tab" + this.tabIndex();
    if (scroll[key] !== undefined) {
      this._scrollChangeLock = true;
      scrollbar.scrollTo({top: scroll[key]});
      this._scrollChangeLock = false;
    }
  }

  @HostListener("window:resize")
  @Debounce(500)
  resize() {
    const parentEl = this.cadContainer().nativeElement.parentElement;
    if (parentEl) {
      this.config.setConfig({width: parentEl.clientWidth, height: parentEl.clientHeight});
    }
  }

  async validate() {
    const {validator} = this.params() || {};
    const data = this.status.cad.data;
    if (validator) {
      const errors = Object.keys(validator(data) || {}).join("\n");
      if (errors) {
        await this.message.error(errors);
        return false;
      }
    }
    const matErrors = this.el.nativeElement.querySelectorAll("mat-error");
    if (matErrors.length > 0) {
      await this.message.error("输入有误");
      return false;
    }
    return true;
  }

  async save() {
    const {extraData, query} = this.params() || {};
    const data = this.status.cad.data;
    if (extraData) {
      Object.assign(data, extraData);
    }
    if (!(await this.validate())) {
      return;
    }
    return await this.status.saveCad(this.spinnerId, query);
  }

  async refresh() {
    const params = this.params();
    await untracked(() => this.status.openCad(params));
  }

  zoomAll() {
    this.status.cad.center();
  }

  private _disableNextInfoTabIndexSync = false;
  onInfoTabChange({index}: MatTabChangeEvent) {
    const sync = !this._disableNextInfoTabIndexSync;
    this.config.setConfig("infoTabIndex", index, {sync});
    if (this._disableNextInfoTabIndexSync) {
      this._disableNextInfoTabIndexSync = false;
    }
    this._setTabScroll();
  }

  toggleMultiSelect() {
    let selectMode = this.config.getConfig("selectMode");
    selectMode = selectMode === "multiple" ? "single" : "multiple";
    this.config.setConfig("selectMode", selectMode);
  }

  menuSearchStr = signal("");
  menuSearchInputInfo = computed(() => {
    const info: InputInfo = {
      type: "string",
      label: "搜索",
      value: this.menuSearchStr(),
      autoFocus: true,
      clearable: true,
      onInput: throttle((val) => {
        this.menuSearchStr.set(val);
      }, 500)
    };
    return info;
  });
  menuSearchShown = signal(false);
  searchMenuEff = effect(() => {
    const val = this.menuSearchStr();
    if (!val) {
      return;
    }
    this._scrollbars().forEach((scrollbar) => {
      const inputs = scrollbar.viewport.nativeElement.querySelectorAll("app-input");
      const input2 = Array.from(inputs).find((el) => {
        if (el instanceof HTMLElement && queryString(val, el.dataset.label || "")) {
          return true;
        }
        return false;
      });
      if (input2) {
        scrollbar.scrollToElement(input2);
      }
    });
  });
  showMenuSearch() {
    this.menuSearchShown.set(true);
    this.menuSearchStr.set("");
  }
  hideMenuSearch() {
    this.menuSearchShown.set(false);
  }
  onMenuSearchPointerMove(event: PointerEvent) {
    const {target: el, clientX, clientY} = event;
    if (!(el instanceof HTMLElement)) {
      return;
    }
    const rect = el.querySelector("app-input")?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      this.hideMenuSearch();
    }
  }

  async focusZhuangpeixinxi() {
    this.tabIndex.set(0);
    await timeout(0);
    this._scrollbar?.scrollToElement(".装配信息");
  }
}

type Dragkey = keyof Pick<AppConfig, "leftMenuWidth" | "rightMenuWidth">;
