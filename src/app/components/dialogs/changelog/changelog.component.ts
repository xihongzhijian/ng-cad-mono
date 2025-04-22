import {NgTemplateOutlet} from "@angular/common";
import {Component, computed, HostBinding, inject, input, OnInit, signal} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatIconModule} from "@angular/material/icon";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ImageComponent} from "@modules/image/components/image/image.component";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {uniqueId} from "lodash";
import {NgScrollbar} from "ngx-scrollbar";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-changelog",
  templateUrl: "./changelog.component.html",
  styleUrls: ["./changelog.component.scss"],
  imports: [ImageComponent, MatButtonModule, MatDividerModule, MatIconModule, NgScrollbar, NgTemplateOutlet, SpinnerModule]
})
export class ChangelogComponent implements OnInit {
  private http = inject(CadDataService);
  private status = inject(AppStatusService);
  private config = inject(AppConfigService);

  @HostBinding("class") class = "ng-page";

  pageSize = input(10);

  separator = "\n\n";
  changelog = signal<
    {
      author: string;
      avatar: string;
      message: string;
      details: string;
      time: string;
      url: string;
      showDetails: boolean;
      isUpdated: boolean;
    }[]
  >([]);
  loaderId = uniqueId("changelog-loader-");
  updateDivideIndex = signal(-1);
  env = environment;
  branch = computed(() => {
    return environment.beta ? "next" : "master";
  });

  constructor(public dialogRef: MatDialogRef<ChangelogComponent, void>) {}

  ngOnInit() {
    this.getData();
  }

  private async getData() {
    const pageSize = this.pageSize();
    const branch = this.branch();
    const updateTime = await this.status.getUpdateTimeStamp();
    this.updateTime.set(updateTime);
    const changelogRaw = await this.http.getChangelog({page: 1, pageSize, branch}, {spinner: this.loaderId});
    let updateDivideIndex = -1;
    const changelog: ReturnType<typeof this.changelog> = [];
    for (const [i, item] of changelogRaw.entries()) {
      const [message, ...details] = item.commit.message.split(this.separator);
      const time = new Date(item.commit.author.date).getTime();
      const isUpdated = time <= updateTime;
      if (isUpdated && updateDivideIndex === -1) {
        updateDivideIndex = i;
      }
      changelog.push({
        author: item.author.login,
        avatar: item.author.avatar_url,
        message,
        details: details.join(this.separator),
        time: this.getTitle(time, true),
        url: item.html_url,
        showDetails: false,
        isUpdated: time <= updateTime
      });
    }
    this.updateDivideIndex.set(updateDivideIndex);
    this.changelog.set(changelog);
  }

  updateTime = signal(0);
  updateTimeTitle = computed(() => this.getTitle(this.updateTime(), true));

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
    window.open("https://github.com/xihongzhijian/ng-cad-mono/commits/master", "_blank");
  }

  openCommit(item: ReturnType<typeof this.changelog>[number]) {
    window.open(item.url, "_blank");
  }

  testMode = computed(() => this.config.config().testMode);
  async toggleEnvBeta() {
    this.status.setTestModeWarningIgnore(1000 * 60 * 60 * 24);
    this.status.toggleEnvBeta();
  }
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent, {
  width: "80vw",
  height: "80vh"
});
