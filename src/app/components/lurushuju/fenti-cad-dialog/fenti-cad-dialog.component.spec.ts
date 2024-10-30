import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FentiCadDialogComponent} from "./fenti-cad-dialog.component";
import {FentiCadDialogInput} from "./fenti-cad-dialog.types";

const data: FentiCadDialogInput = {
  data: {分体1: null, 分体2: null}
};

describe("FentiCadDialogComponent", () => {
  let component: FentiCadDialogComponent;
  let fixture: ComponentFixture<FentiCadDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FentiCadDialogComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MatDialogRef, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FentiCadDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
