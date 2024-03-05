import {CdkDrag, CdkDragPlaceholder, CdkDropList} from "@angular/cdk/drag-drop";
import {Component} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatOptionModule} from "@angular/material/core";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {ObjectOf} from "@lucilor/utils";
import {NgScrollbar} from "ngx-scrollbar";
import {SpinnerComponent} from "../../modules/spinner/components/spinner/spinner.component";

export const changelogTypes: ObjectOf<string> = {
  feat: "✨新特性",
  fix: "🐞bug修复",
  refactor: "🦄代码重构",
  perf: "🎈体验优化"
};

@Component({
  selector: "app-changelog-admin",
  templateUrl: "./changelog-admin.component.html",
  styleUrls: ["./changelog-admin.component.scss"],
  standalone: true,
  imports: [
    NgScrollbar,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    SpinnerComponent,
    CdkDropList,
    MatFormFieldModule,
    MatInputModule,
    CdkDrag,
    CdkDragPlaceholder,
    MatSelectModule,
    FormsModule,
    MatOptionModule,
    MatPaginatorModule
  ]
})
export class ChangelogAdminComponent {}
