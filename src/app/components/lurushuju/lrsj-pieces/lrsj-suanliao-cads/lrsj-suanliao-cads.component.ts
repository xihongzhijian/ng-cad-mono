import {ChangeDetectionStrategy, Component, inject, output} from "@angular/core";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {LrsjPiece} from "../lrsj-piece";

@Component({
  selector: "app-lrsj-suanliao-cads",
  standalone: true,
  imports: [],
  templateUrl: "./lrsj-suanliao-cads.component.html",
  styleUrl: "./lrsj-suanliao-cads.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LrsjSuanliaoCadsComponent extends LrsjPiece {
  private lrsjStatus = inject(LrsjStatusService);

  saveInfo = output();

  constructor() {
    super();
  }

  getInfo() {
    return {};
  }
  async setInfo() {}
}
