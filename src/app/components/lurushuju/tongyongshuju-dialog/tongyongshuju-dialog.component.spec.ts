import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {TongyongshujuDialogComponent} from "./tongyongshuju-dialog.component";
import {TongyongshujuInput} from "./tongyongshuju-dialog.types";

const data: TongyongshujuInput | null = null;

describe("TongyongshujuDialogComponent", () => {
  let component: TongyongshujuDialogComponent;
  let fixture: ComponentFixture<TongyongshujuDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TongyongshujuDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TongyongshujuDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
