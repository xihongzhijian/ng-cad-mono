import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import klkwpzData from "@assets/json/klkwpz.json";
import {KlkwpzDialogComponent, KlkwpzDialogData} from "./klkwpz-dialog.component";

const data: KlkwpzDialogData = {source: klkwpzData as any};

describe("KlkwpzDialogComponent", () => {
  let component: KlkwpzDialogComponent;
  let fixture: ComponentFixture<KlkwpzDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KlkwpzDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(KlkwpzDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
