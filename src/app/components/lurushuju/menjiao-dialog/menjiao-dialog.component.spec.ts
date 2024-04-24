import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {MenjiaoDialogComponent} from "./menjiao-dialog.component";
import {MenjiaoInput} from "./menjiao-dialog.types";

const data: MenjiaoInput = {};

describe("MenjiaoDialogComponent", () => {
  let component: MenjiaoDialogComponent;
  let fixture: ComponentFixture<MenjiaoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenjiaoDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MenjiaoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
