import {ChangeDetectionStrategy, Component, HostBinding, input} from "@angular/core";
import {TextInfo} from "./text-info.types";

@Component({
  selector: "app-text-info",
  imports: [],
  templateUrl: "./text-info.component.html",
  styleUrl: "./text-info.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextInfoComponent {
  @HostBinding("class") class = "ng-page";

  infos = input.required<TextInfo[]>();
}
