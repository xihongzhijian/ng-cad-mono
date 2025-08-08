import {DragDropModule} from "@angular/cdk/drag-drop";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadEditorComponent} from "./components/cad-editor/cad-editor.component";
import {CadPointsComponent} from "./components/cad-points/cad-points.component";
import {CadLayerComponent} from "./components/dialogs/cad-layer/cad-layer.component";
import {CadAssembleComponent} from "./components/menu/cad-assemble/cad-assemble.component";
import {CadDimensionComponent} from "./components/menu/cad-dimension/cad-dimension.component";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {CadLayerInputComponent} from "./components/menu/cad-layer-input/cad-layer-input.component";
import {CadLineComponent} from "./components/menu/cad-line/cad-line.component";
import {CadMtextComponent} from "./components/menu/cad-mtext/cad-mtext.component";
import {CadSplitComponent} from "./components/menu/cad-split/cad-split.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";

@NgModule({
  imports: [
    CadAssembleComponent,
    CadDimensionComponent,
    CadEditorComponent,
    CadInfoComponent,
    CadLayerComponent,
    CadLayerInputComponent,
    CadLineComponent,
    CadMtextComponent,
    CadPointsComponent,
    CadSplitComponent,
    ColorChromeModule,
    ColorCircleModule,
    CommonModule,
    DragDropModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    NgScrollbarModule,
    ReactiveFormsModule,
    SpinnerModule,
    SubCadsComponent,
    ToolbarComponent
  ],
  exports: [CadEditorComponent, CadPointsComponent]
})
export class CadEditorModule {}
