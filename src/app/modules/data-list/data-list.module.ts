import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {DataListComponent} from "./components/data-list/data-list.component";
import {DataListItemsDirective} from "./directives/data-list-items.directive";
import {DataListToolbarDirective} from "./directives/data-list-toolbar.directive";

@NgModule({
  imports: [CommonModule, DataListComponent, DataListItemsDirective, DataListToolbarDirective],
  exports: [DataListComponent, DataListItemsDirective, DataListToolbarDirective]
})
export class DataListModule {}
