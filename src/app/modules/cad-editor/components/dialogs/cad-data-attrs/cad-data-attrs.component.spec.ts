import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadDataAttrsComponent, CadDataAttrsComponentData} from "./cad-data-attrs.component";

const data: CadDataAttrsComponentData = {a: "1", b: "2"};
describe("CadDataAttrsComponent", () => {
  let component: CadDataAttrsComponent;
  let fixture: ComponentFixture<CadDataAttrsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadDataAttrsComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadDataAttrsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
