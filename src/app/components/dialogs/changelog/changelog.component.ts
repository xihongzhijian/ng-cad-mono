import {NgTemplateOutlet} from "@angular/common";
import {Component, HostBinding, Input, OnInit} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppStatusService} from "@services/app-status.service";
import {uniqueId} from "lodash";
import {InfiniteScrollModule} from "ngx-infinite-scroll";
import {NgScrollbar} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-changelog",
  templateUrl: "./changelog.component.html",
  styleUrls: ["./changelog.component.scss"],
  standalone: true,
  imports: [
    ImageComponent,
    InfiniteScrollModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    NgScrollbar,
    NgTemplateOutlet,
    SpinnerModule
  ]
})
export class ChangelogComponent implements OnInit {
  @HostBinding("class") class = "ng-page";

  @Input() pageSize = 10;
  separator = "\n\n";
  changelog: {
    author: string;
    avatar: string;
    message: string;
    details: string;
    time: string;
    url: string;
    showDetails: boolean;
    isUpdated: boolean;
  }[] = [];
  loaderId = uniqueId("changelog-loader-");
  updateTime = 0;
  updateDivideIndex = -1;

  constructor(
    public dialogRef: MatDialogRef<ChangelogComponent, void>,
    private http: CadDataService,
    private status: AppStatusService
  ) {}

  ngOnInit() {
    this.getData();
  }

  private async getData() {
    const {pageSize} = this;
    this.updateTime = await this.status.getUpdateTimeStamp();
    const changelog = await this.http.getChangelog(1, pageSize, {spinner: this.loaderId});
    this.updateDivideIndex = -1;
    this.changelog = changelog.map((item, i) => {
      const [message, ...details] = item.commit.message.split(this.separator);
      const time = new Date(item.commit.author.date).getTime();
      const isUpdated = time <= this.updateTime;
      if (isUpdated && this.updateDivideIndex === -1) {
        this.updateDivideIndex = i;
      }
      return {
        author: item.author.login,
        avatar: item.author.avatar_url,
        message,
        details: details.join(this.separator),
        time: this.getTitle(time, true),
        url: item.html_url,
        showDetails: false,
        isUpdated: time <= this.updateTime
      };
    });
  }

  getTitle(timeStamp: number, getTime = false) {
    let str = new Date(timeStamp).toLocaleDateString();
    if (getTime) {
      str += " " + new Date(timeStamp).toLocaleTimeString();
    }
    return str;
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
