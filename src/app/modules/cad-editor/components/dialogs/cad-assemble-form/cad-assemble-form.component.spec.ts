import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadAssembleFormComponent, CadAssembleFormInput} from "./cad-assemble-form.component";

const data: CadAssembleFormInput = {x: 1, y: 2};

describe("CadAssembleFormComponent", () => {
  let component: CadAssembleFormComponent;
  let fixture: ComponentFixture<CadAssembleFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadAssembleFormComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CadAssembleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
