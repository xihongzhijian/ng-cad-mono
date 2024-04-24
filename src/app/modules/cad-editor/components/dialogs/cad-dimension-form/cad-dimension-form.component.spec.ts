import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadDimensionLinear} from "@lucilor/cad-viewer";
import {CadDimensionData, CadDimensionFormComponent} from "./cad-dimension-form.component";

const data: CadDimensionData = {data: new CadDimensionLinear()};
describe("CadDimensionFormComponent", () => {
  let component: CadDimensionFormComponent;
  let fixture: ComponentFixture<CadDimensionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadDimensionFormComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadDimensionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
