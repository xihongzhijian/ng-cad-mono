import {Directive, HostListener, input} from "@angular/core";
import {replaceChars} from "@app/app.common";
import {ObjectOf, timeout} from "@lucilor/utils";

// TODO: remove this directive
@Directive({
  selector: "[appReplaceFullChars]",
  standalone: true
})
export class ReplaceFullCharsDirective {
  obj = input<ObjectOf<string>>();
  key = input<string>();
  arr = input<string[]>();
  index = input<number>();

  @HostListener("input", ["$event"]) onInPut(event: Event) {
    timeout(0).then(() => {
      const str = (event.target as HTMLInputElement).value;
      const obj = this.obj();
      const arr = this.arr();
      if (obj) {
        obj[this.key() || ""] = this.replaceChars(str);
      }
      if (arr) {
        arr[this.index() || 0] = this.replaceChars(str);
      }
    });
  }

  private replaceChars(str: string) {
    return replaceChars(str);
  }
}
