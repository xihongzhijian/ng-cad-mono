import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {EditFormulasDialogComponent, EditFormulasInput} from "./edit-formulas-dialog.component";

const data: EditFormulasInput = {formulas: {a: 1, b: 2}};

describe("EditFormulasDialogComponent", () => {
  let component: EditFormulasDialogComponent;
  let fixture: ComponentFixture<EditFormulasDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditFormulasDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(EditFormulasDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
