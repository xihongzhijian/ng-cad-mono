import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadLayer} from "@lucilor/cad-viewer";
import {CadLayerComponent, CadLayerInput} from "./cad-layer.component";

describe("CadLayerComponent", () => {
  let component: CadLayerComponent;
  let fixture: ComponentFixture<CadLayerComponent>;
  const layer = new CadLayer("0");
  const layer1 = new CadLayer("1");
  const data: CadLayerInput = {layers: [layer, layer1], layersInUse: [layer]};

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CadLayerComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    });
    fixture = TestBed.createComponent(CadLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
