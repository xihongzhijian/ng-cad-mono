import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadLayer} from "packages/cad-viewer/lib";
import {CadLayerComponent, CadLayerInput} from "./cad-layer.component";

describe("CadLayerComponent", () => {
  let component: CadLayerComponent;
  let fixture: ComponentFixture<CadLayerComponent>;
  const layer = new CadLayer("0");
  const layer1 = new CadLayer("1");
  const data: CadLayerInput = {layers: [layer, layer1], layersInUse: [layer]};

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadLayerComponent],
      imports: [BrowserAnimationsModule, InputModule, MatIconModule, MessageModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    });
    fixture = TestBed.createComponent(CadLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  fit("should create", () => {
    expect(component).toBeTruthy();
  });
});
