import {enableProdMode, Injectable, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from "@angular/core";
import {MAT_DATE_LOCALE} from "@angular/material/core";
import {MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig} from "@angular/material/dialog";
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions} from "@angular/material/form-field";
import {MAT_ICON_DEFAULT_OPTIONS, MatIconDefaultOptions} from "@angular/material/icon";
import {MatPaginatorIntl} from "@angular/material/paginator";
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions} from "@angular/material/tooltip";
import {bootstrapApplication} from "@angular/platform-browser";
import {provideRouter} from "@angular/router";
import {appRoutes} from "@app/routing/app-routing";
import {environment} from "@env";
import {provideScrollbarPolyfill} from "ngx-scrollbar";
import {AppComponent} from "./app/app.component";

@Injectable()
class MyMatPaginatorIntl extends MatPaginatorIntl {
  itemsPerPageLabel = "每页条数";
  previousPageLabel = "上一页";
  nextPageLabel = "下一页";
  firstPageLabel = "首页";
  lastPageLabel = "尾页";

  getRangeLabel = (page: number, pageSize: number, length: number) => {
    const totalPage = Math.ceil(length / pageSize);
    return `第${page + 1}/${totalPage}页，共${length}条`;
  };
}

const matDialogOptions: MatDialogConfig = {
  disableClose: true
};
const matFormFieldOptions: MatFormFieldDefaultOptions = {
  floatLabel: "always"
};
const matIconDefaultOptions: MatIconDefaultOptions = {fontSet: "material-symbols-rounded"};
const matTooltipOptions: MatTooltipDefaultOptions = {
  showDelay: 500,
  hideDelay: 0,
  touchendHideDelay: 0
};

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    {provide: MatPaginatorIntl, useClass: MyMatPaginatorIntl},
    {provide: MAT_DATE_LOCALE, useValue: "zh-CN"},
    {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: matDialogOptions},
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: matFormFieldOptions},
    {provide: MAT_ICON_DEFAULT_OPTIONS, useValue: matIconDefaultOptions},
    {provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: matTooltipOptions},
    provideBrowserGlobalErrorListeners(),
    provideScrollbarPolyfill("assets/scroll-timeline-polyfill.js"),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes)
  ]
}).catch((err) => {
  console.error(err);
});
