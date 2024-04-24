import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {getXinghaoData, getXinghaoGongyi, getXinghaoMenchuang} from "../lurushuju-index/lurushuju-index.utils";
import {SelectGongyiDialogComponent} from "./select-gongyi-dialog.component";
import {SelectGongyiInput} from "./select-gongyi-dialog.types";

const data: SelectGongyiInput = {
  xinghaoMenchuangs: {
    items: [getXinghaoMenchuang({gongyis: {items: [getXinghaoGongyi({xinghaos: {items: [getXinghaoData()], count: 0}})], count: 0}})],
    count: 0
  },
  xinghaoOptions: {}
};

describe("SelectGongyiDialogComponent", () => {
  let component: SelectGongyiDialogComponent;
  let fixture: ComponentFixture<SelectGongyiDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectGongyiDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectGongyiDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
