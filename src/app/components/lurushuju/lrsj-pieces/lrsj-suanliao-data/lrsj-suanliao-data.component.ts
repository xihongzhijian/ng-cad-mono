import {ChangeDetectionStrategy, Component, computed, effect, inject, output} from "@angular/core";
import {MatDividerModule} from "@angular/material/divider";
import {CadDataService} from "@app/modules/http/services/cad-data.service";
import {MessageService} from "@app/modules/message/services/message.service";
import {LrsjStatusService} from "../../services/lrsj-status.service";
import {LrsjPiece, LrsjPieceInfo} from "../lrsj-piece";

@Component({
  selector: "app-lrsj-suanliao-data",
  standalone: true,
  imports: [MatDividerModule],
  templateUrl: "./lrsj-suanliao-data.component.html",
  styleUrl: "./lrsj-suanliao-data.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LrsjSuanliaoDataComponent extends LrsjPiece {
  private http = inject(CadDataService);
  private lrsjStatus = inject(LrsjStatusService);
  private message = inject(MessageService);

  xinghao = this.lrsjStatus.xinghao;
  suanliaoDataInfo = this.lrsjStatus.suanliaoDataInfo;
  saveInfo = output();

  menchuangName = computed(() => this.lrsjStatus.xinghaoMenchuangs.item()?.mingzi);
  gongyiName = computed(() => this.lrsjStatus.xinghaoMenchuangs.item()?.gongyis?.item()?.mingzi);

  constructor() {
    super();
    this.isReadyForInfo.next(true);
    effect(() => {
      const pieceInfo = this.lrsjStatus.pieceInfos.suanliaoData();
      if (!pieceInfo.show) {
        this.emitSaveInfo();
      }
    });
  }

  getInfo(): LrsjPieceInfo {
    return {};
  }
  async setInfo(info: LrsjPieceInfo) {
    console.log(info);
  }
}
