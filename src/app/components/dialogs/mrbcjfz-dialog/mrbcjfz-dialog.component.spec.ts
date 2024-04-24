import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {MrbcjfzDialogComponent, MrbcjfzDialogInput} from "./mrbcjfz-dialog.component";

const data: MrbcjfzDialogInput = {id: 1, table: "p_xinghao"};

describe("MrbcjfzDialogComponent", () => {
  let component: MrbcjfzDialogComponent;
  let fixture: ComponentFixture<MrbcjfzDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrbcjfzDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MrbcjfzDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
