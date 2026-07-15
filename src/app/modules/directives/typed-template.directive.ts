import {Directive, input} from "@angular/core";

@Directive({
  selector: "[appTypedTemplate]",
  standalone: true
})
export class TypedTemplateDirective<T> {
  appTypedTemplate = input.required<T>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static ngTemplateContextGuard<T>(dir: TypedTemplateDirective<T>, ctx: any): ctx is T {
    return true;
  }
}
