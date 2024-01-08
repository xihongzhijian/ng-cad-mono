import {AsyncPipe} from "@angular/common";
import {ChangeDetectorRef, Component, Input} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {RouterLink} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {Changelog} from "@modules/http/services/cad-data.service.types";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {changelogTypes} from "@views/changelog-admin/changelog-admin.component";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {NgScrollbar, ScrollViewport} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-changelog",
  templateUrl: "./changelog.component.html",
  styleUrls: ["./changelog.component.scss"],
  standalone: true,
  imports: [MatButtonModule, RouterLink, NgScrollbar, InfiniteScrollModule, ScrollViewport, MatDividerModule, AsyncPipe]
})
export class ChangelogComponent {
  @Input() pageSize = 10;
  changelog: Changelog = [];
  currentPage = 0;
  maxPage = 1;
  loading = false;
  get isAdmin$() {
    return this.status.isAdmin$;
  }
  private _nextPageLock = false;

  constructor(
    private cd: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ChangelogComponent, void>,
    private http: CadDataService,
    private status: AppStatusService,
    private config: AppConfigService
  ) {
    this.nextPage();
  }

  private async nextPage() {
    const {pageSize, maxPage} = this;
    if (this.currentPage >= maxPage || this._nextPageLock) {
      return;
    }
    this._nextPageLock = true;
    const page = this.currentPage + 1;
    this.loading = true;
    const {changelog, count} = await this.http.getChangelog(page, pageSize);
    this.loading = false;
    this.changelog = this.changelog.concat(changelog);
    this.maxPage = Math.ceil((count || 0) / pageSize);
    this.currentPage++;
    this.cd.detectChanges();
    this._nextPageLock = false;
  }

  get testMode() {
    return this.config.getConfig("testMode");
  }

  getTitle(timeStamp: number, getTime = false) {
    let str = new Date(timeStamp).toLocaleDateString();
    if (getTime) {
      str += " " + new Date(timeStamp).toLocaleTimeString();
    }
    return str;
  }

  getType(key: string) {
    return changelogTypes[key];
  }

  onYReachEnd() {
    this.nextPage();
  }

  close() {
    this.dialogRef.close();
  }
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent, {
  width: "80vw",
  height: "80vh"
});
