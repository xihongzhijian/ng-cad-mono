import {ChangeDetectionStrategy, Component, effect, inject, signal} from "@angular/core";
import {MatBadgeModule} from "@angular/material/badge";
import {MatButtonModule} from "@angular/material/button";
import {MatDialog} from "@angular/material/dialog";
import {local} from "@app/app.common";
import {openChangelogDialog} from "@components/dialogs/changelog/changelog.component";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppStatusService} from "@services/app-status.service";

@Component({
  selector: "app-about",
  imports: [MatBadgeModule, MatButtonModule, SpinnerModule],
  templateUrl: "./about.component.html",
  styleUrl: "./about.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
  private status = inject(AppStatusService);
  private dialog = inject(MatDialog);

  isNew = signal(false);
  isNewEff = effect(() => {
    const time1 = this.status.updateTimeStamp();
    const time2 = Number(local.load("changelogTimeStamp") || 0);
    this.isNew.set(time1 > time2);
  });

  showChangelog() {
    openChangelogDialog(this.dialog, {hasBackdrop: true});
    local.save("changelogTimeStamp", new Date().getTime());
    this.isNew.set(false);
  }
}
