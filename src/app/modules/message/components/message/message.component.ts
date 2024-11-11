import {A11yModule} from "@angular/cdk/a11y";
import {NgTemplateOutlet} from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
  viewChildren
} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {DomSanitizer, SafeHtml, SafeResourceUrl} from "@angular/platform-browser";
import {Debounce} from "@decorators/debounce";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {clamp, cloneDeep, isEmpty} from "lodash";
import {QuillEditorComponent, QuillViewComponent} from "ngx-quill";
import {NgScrollbarModule} from "ngx-scrollbar";
import {createJSONEditor, JSONContent, Mode} from "vanilla-jsoneditor";
import {ButtonMessageData, MessageBeforeCloseEvent, MessageData, MessageDataMap, MessageOutput} from "./message.types";
import {validateForm} from "./message.utils";

@Component({
  selector: "app-message",
  templateUrl: "./message.component.html",
  styleUrls: ["./message.component.scss"],
  standalone: true,
  imports: [
    A11yModule,
    FormsModule,
    forwardRef(() => InputComponent),
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatIconModule,
    NgScrollbarModule,
    NgTemplateOutlet,
    QuillEditorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageComponent implements OnInit, AfterViewInit, OnDestroy {
  private elRef = inject(ElementRef<HTMLElement>);
  private message = inject(MessageService);
  private sanitizer = inject(DomSanitizer);

  constructor(
    public dialogRef: MatDialogRef<MessageComponent, MessageOutput>,
    @Inject(MAT_DIALOG_DATA) public data: MessageData
  ) {}

  ngOnInit() {
    const data = this.data;
    if (data.title) {
      this.titleHTML.set(this.sanitizer.bypassSecurityTrustHtml(data.title));
    } else {
      this.titleHTML.set("");
    }
    if (data.content === null || data.content === undefined) {
      data.content = "";
    } else if (data.content instanceof HTMLElement) {
      data.content = data.content.outerHTML;
    } else if (typeof data.content !== "string") {
      try {
        data.content = JSON.stringify(data.content);
      } catch (error) {
        console.warn(error);
      }
    }
    this.contentHTML.set(this.sanitizer.bypassSecurityTrustHtml(data.content));

    if (data.type === "form") {
      if (data.form.length > 0 && !data.form.some((v) => v.autoFocus)) {
        data.form[0].autoFocus = true;
      }
    } else if (data.type === "book") {
      this.setPage(0);
    } else if (data.type === "iframe") {
      this.iframeSrc.set(this.sanitizer.bypassSecurityTrustResourceUrl(data.content));
    }

    const id = window.setInterval(() => {
      if (this.resizeEditor()) {
        window.clearInterval(id);
      }
    }, 600);

    if (data.type === "form") {
      this.inputsBackup = cloneDeep(data.form);
    }
  }
  ngAfterViewInit() {
    const {data} = this;
    const jsonEditorContainer = this.jsonEditorContainer();
    if (jsonEditorContainer && data.type === "json") {
      this.jsonEditor = createJSONEditor({
        target: jsonEditorContainer.nativeElement,
        props: {mode: Mode.tree, ...data.options}
      });
      this.jsonEditor.set({json: data.json});
    }
  }
  ngOnDestroy() {
    if (this.jsonEditor) {
      this.jsonEditor.destroy();
      this.jsonEditor = null;
    }
  }

  titleHTML = signal<SafeHtml>("");
  subTitleHTML = signal<SafeHtml>("");
  contentHTML = signal<SafeHtml>("");
  titleClass = computed(() => this.data.titleClass || "");

  iframeSrc = signal<SafeResourceUrl>("");
  iframe = viewChild<ElementRef<HTMLIFrameElement>>("iframe");

  jsonEditor: ReturnType<typeof createJSONEditor> | null = null;
  jsonEditorContainer = viewChild<ElementRef<HTMLDivElement>>("jsonEditorContainer");

  editor = viewChild(QuillViewComponent);
  private _getEditorToolbarHeight() {
    const el = this.editor()?.elementRef.nativeElement;
    if (el instanceof HTMLElement) {
      const toolbar = el.querySelector(".ql-toolbar");
      if (toolbar) {
        return toolbar.getBoundingClientRect().height;
      }
    }
    return 0;
  }
  @HostListener("window:resize")
  @Debounce(500)
  resizeEditor() {
    const el = this.editor()?.editorElem;
    if (el) {
      const height = this._getEditorToolbarHeight();
      if (height) {
        el.style.height = `calc(100% - ${height}px)`;
        return true;
      }
    }
    return false;
  }

  buttons = computed(() => {
    if (this.data.type === "button") {
      return this.data.buttons;
    }
    return [];
  });

  page = signal(0);
  pageMin = computed(() => 0);
  pageMax = computed(() => {
    if (this.data.type === "book") {
      return this.data.bookData.length - 1;
    }
    return 0;
  });
  setPage(page: number) {
    if (this.data.type !== "book") {
      return;
    }
    this.page.set(clamp(page, this.pageMin(), this.pageMax()));
  }
  pageEff = effect(
    () => {
      if (this.data.type !== "book") {
        return;
      }
      const data = this.data.bookData[this.page()];
      this.contentHTML.set(this.sanitizer.bypassSecurityTrustHtml(data.content));
      if (data.title) {
        this.subTitleHTML.set(this.sanitizer.bypassSecurityTrustHtml(data.title));
      } else {
        this.subTitleHTML.set("");
      }
    },
    {allowSignalWrites: true}
  );

  inputsBackup: InputInfo[] = [];
  formInputs = viewChildren<InputComponent>("formInput");
  form = signal<InputInfo[]>([]);
  formEff = effect(
    () => {
      const data = this.data;
      if (data.type !== "form") {
        return;
      }
      this.form.set(data.form);
    },
    {allowSignalWrites: true}
  );
  refreshForm() {
    this.form.update((v) => [...v]);
  }
  reset() {
    switch (this.data.type) {
      case "form":
        this.data.form = cloneDeep(this.inputsBackup);
        break;
      case "json":
        this.jsonEditor?.set(this.data.defaultJson || null);
        break;
      default:
        break;
    }
  }
  autoFill() {
    switch (this.data.type) {
      case "form":
        this.data.autoFill?.(this.data.form);
        validateForm(this.formInputs());
        break;
      default:
        break;
    }
  }

  async close(type: MessageBeforeCloseEvent["type"], data?: any) {
    const beforeClose = this.data.beforeClose;
    if (typeof beforeClose === "function") {
      let result = beforeClose({type});
      if (result instanceof Promise) {
        result = await result;
      }
      if (!result) {
        return;
      }
    }
    this.dialogRef.close(data);
  }
  async submit(button?: ButtonMessageData["buttons"][number]) {
    const type = this.data.type;
    const closeType: MessageBeforeCloseEvent["type"] = "submit";
    if (type === "confirm") {
      await this.close(closeType, true);
    } else if (type === "form") {
      const {errors, values, errorMsg} = await validateForm(this.formInputs());
      if (isEmpty(errors)) {
        await this.close(closeType, values);
      } else {
        this.message.error(errorMsg);
      }
    } else if (type === "editor") {
      await this.close(closeType, this.data.content);
    } else if (type === "button" && button) {
      await this.close(closeType, typeof button === "string" ? button : button.value);
    } else if (type === "json" && this.jsonEditor) {
      const editor = this.jsonEditor;
      const errors = editor.validate();
      if (errors) {
        this.message.error("数据格式错误，请改正后再确定");
      } else {
        const result = editor.get();
        const isJSONContent = (v: any): v is JSONContent => v.json;
        if (isJSONContent(result)) {
          await this.close(closeType, result.json as any);
        } else {
          await this.close(closeType, JSON.parse(result.text));
        }
      }
    } else {
      await this.close(closeType, null);
    }
  }
  async cancel() {
    const type = this.data.type;
    const closeType: MessageBeforeCloseEvent["type"] = "cancel";
    if (type === "confirm") {
      await this.close(closeType, false);
    } else if (type === "button") {
      await this.close(closeType, this.data.btnTexts?.cancel);
    } else {
      await this.close(closeType);
    }
  }

  cast<T extends MessageData["type"]>(type: T, data: MessageData) {
    return data as MessageDataMap[T];
  }

  getButtonLabel(button: ButtonMessageData["buttons"][0]) {
    return typeof button === "string" ? button : button.label;
  }

  @HostListener("window:keyup", ["$event"])
  onKeyUp(event: KeyboardEvent) {
    const data = this.data;
    const isEnter = event.key === "Enter";
    const isEsc = event.key === "Escape";
    if (data.type === "form" && (isEnter || isEsc)) {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const el = target.querySelector("app-message");
        if (el === this.elRef.nativeElement) {
          if (isEnter) {
            this.submit();
          } else if (isEsc) {
            this.cancel();
          }
        }
      }
    }
  }
}
