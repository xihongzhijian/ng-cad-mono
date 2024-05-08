import {session} from "@app/app.common";
import {AppStatusService} from "@app/services/app-status.service";
import {ExportCache} from "./export.types";

export const openExportPage = (status: AppStatusService, data: ExportCache) => {
  const key = new Date().getTime().toString(16);
  session.save("exportParams-" + key, data);
  status.openInNewTab(["export"], {queryParams: {key}});
};
