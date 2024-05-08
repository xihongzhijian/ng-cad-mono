import {session} from "@app/app.common";
import {AppStatusService} from "@app/services/app-status.service";
import {ImportCache} from "./import.types";

export const openImportPage = (status: AppStatusService, data: ImportCache) => {
  const key = new Date().getTime().toString(16);
  session.save("importParams-" + key, data);
  status.openInNewTab(["import"], {queryParams: {key}});
};
