import {ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, signal} from "@angular/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {filePathUrl, setGlobal} from "@app/app.common";
import {FloatingDialogModule} from "@modules/floating-dialog/floating-dialog.module";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {MsbjComponent} from "@views/msbj/msbj.component";
import {MsbjCloseEvent} from "@views/msbj/msbj.types";
import {MsbjInfo} from "@views/msbj/msbj.utils";
import {XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {NgScrollbarModule} from "ngx-scrollbar";
import {BjmkStatusService} from "../services/bjmk-status.service";

@Component({
  selector: "app-buju",
  standalone: true,
  imports: [FloatingDialogModule, ImageComponent, MatTooltipModule, MsbjComponent, NgScrollbarModule],
  templateUrl: "./buju.component.html",
  styleUrl: "./buju.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BujuComponent implements OnInit {
  private bjmkStatus = inject(BjmkStatusService);

  @HostBinding("class") class = ["ng-page"];

  async ngOnInit() {
    setGlobal("buju", this);
    await this.bjmkStatus.msbjsManager.fetch();
  }

  bujuData = signal<XhmrmsbjData | null>(null);
  msbjs = this.bjmkStatus.msbjsManager.items;
  imgPrefix = filePathUrl;

  openedMsbj = signal<MsbjInfo | null>(null);
  openMsbj(msbj: MsbjInfo) {
    this.openedMsbj.set(msbj);
  }
  closeMsbj({isSubmited}: MsbjCloseEvent) {
    const openedMsbj = this.openedMsbj();
    if (isSubmited && openedMsbj) {
      this.bjmkStatus.msbjsManager.refresh({update: [openedMsbj]});
    }
    this.openedMsbj.set(null);
  }
}
