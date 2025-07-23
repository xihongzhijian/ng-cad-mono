import {A11yModule} from "@angular/cdk/a11y";
import {NgTemplateOutlet} from "@angular/common";
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
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
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {validateForm} from "@modules/input/components/input.utils";
import {MessageService} from "@modules/message/services/message.service";
import {clamp, cloneDeep, isEmpty} from "lodash";
import {NgScrollbarModule} from "ngx-scrollbar";
import {createJSONEditor, JSONContent, JSONEditorPropsOptional, Mode} from "vanilla-jsoneditor";
import {
  ButtonMessageData,
  ButtonMessageDataButton,
  FormMessageData,
  MessageBeforeCloseEvent,
  MessageData,
  MessageDataButton,
  MessageOutput
} from "./message.types";

@Component({
  selector: "app-message",
  templateUrl: "./message.component.html",
  styleUrls: ["./message.component.scss"],
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
    NgTemplateOutlet
  ]
})
export class MessageComponent implements OnInit, AfterViewInit, OnDestroy {
  dialogRef = inject<MatDialogRef<MessageComponent, MessageOutput>>(MatDialogRef);
  data: MessageData = inject<MessageData>(MAT_DIALOG_DATA, {optional: true}) ?? {type: "alert"};

  private elRef = inject(ElementRef<HTMLElement>);
  private message = inject(MessageService);
  private sanitizer = inject(DomSanitizer);

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

    if (data.type === "form") {
      this.inputsBackup = cloneDeep(data.form);
    }
  }
  ngAfterViewInit() {
    const {data} = this;
    const jsonEditorContainer = this.jsonEditorContainer();
    if (jsonEditorContainer && data.type === "json") {
      const props: Partial<JSONEditorPropsOptional> = {mode: Mode.tree, ...data.options};
      this.jsonEditor = createJSONEditor({target: jsonEditorContainer.nativeElement, props});
      this.jsonEditor.set({json: data.json});
    }
    const jsonDetailsContainer = this.jsonDetailsContainer();
    const {jsonDetails} = data;
    if (jsonDetailsContainer && typeof jsonDetails === "object" && jsonDetails) {
      const props: Partial<JSONEditorPropsOptional> = {mode: Mode.tree, readOnly: true};
      this.jsonDetails = createJSONEditor({target: jsonDetailsContainer.nativeElement, props});
      this.jsonDetails.set({json: data.jsonDetails});
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

  showJsonDetails = signal(false);
  toggleJsonDetails() {
    this.showJsonDetails.update((v) => !v);
  }
  jsonDetails: ReturnType<typeof createJSONEditor> | null = null;
  jsonDetailsContainer = viewChild<ElementRef<HTMLDivElement>>("jsonDetailsContainer");

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
  pageEff = effect(() => {
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
  });

  inputsBackup: InputInfo[] = [];
  formInputs = viewChildren<InputComponent>("formInput");
  form = signal<InputInfo[]>([]);
  formEff = effect(() => {
    const data = this.data;
    if (data.type !== "form") {
      return;
    }
    this.form.set(data.form);
  });
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

  btnTexts = computed(() => (this.data as FormMessageData).btnTexts || {});
  btnTextSubmit = computed(() => this.btnTexts().submit || "确定");
  btnTextCancel = computed(() => this.btnTexts().cancel || "取消");
  btnTextReset = computed(() => this.btnTexts().reset || "重置");
  btnTextAutoFill = computed(() => this.btnTexts().autoFill || "自动填充");

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
    } else if (type === "button" && button) {
      if (typeof button === "object") {
        this.clickButton(button);
      }
      await this.close(closeType, typeof button === "object" ? button.value : button);
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
      await this.close(closeType, this.btnTextCancel());
    } else {
      await this.close(closeType);
    }
  }

  getButtonLabel<T extends string>(button: string | ButtonMessageDataButton<T>) {
    return typeof button === "string" ? button : button.label;
  }
  clickButton<T extends string>(button: MessageDataButton<T>) {
    if (typeof button === "object") {
      button.onClick?.();
    }
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
