import {Component, HostBinding, Input, OnInit} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppConfigService} from "@services/app-config.service";
import {changelogTypes} from "@views/changelog-admin/changelog-admin.component";
import {uniqueId} from "lodash";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {NgScrollbar} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-changelog",
  templateUrl: "./changelog.component.html",
  styleUrls: ["./changelog.component.scss"],
  standalone: true,
  imports: [ImageComponent, InfiniteScrollModule, MatButtonModule, MatDividerModule, MatIconModule, NgScrollbar, SpinnerModule]
})
export class ChangelogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";

  @Input() pageSize = 10;
  separator = "\n\n";
  changelog: {author: string; avatar: string; message: string; details: string; time: string; url: string; showDetails: boolean}[] = [];
  loaderId = uniqueId("changelog-loader-");

  constructor(
    public dialogRef: MatDialogRef<ChangelogComponent, void>,
    private http: CadDataService,
    private config: AppConfigService
  ) {}

  ngOnInit() {
    this.getData();
  }

  private async getData() {
    const {pageSize} = this;
    const changelog = await this.http.getChangelog(1, pageSize, {spinner: this.loaderId});
    this.changelog = changelog.map((item) => {
      const [message, ...details] = item.commit.message.split(this.separator);
      return {
        author: item.author.login,
        avatar: item.author.avatar_url,
        message,
        details: details.join(this.separator),
        time: this.getTitle(new Date(item.commit.author.date).getTime(), true),
        url: item.html_url,
        showDetails: false
      };
    });
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
    this.getData();
  }

  close() {
    this.dialogRef.close();
  }

  openCommits() {
    window.open("https://github.com/Lucilor/ng-cad-mono/commits/master", "_blank");
  }

  openCommit(item: (typeof this.changelog)[number]) {
    window.open(item.url, "_blank");
  }
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent, {
  width: "80vw",
  height: "80vh"
});
