import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {get算料数据2} from "../xinghao-data";
import {SuanliaoDataDialogComponent} from "./suanliao-data-dialog.component";
import {SuanliaoDataInput} from "./suanliao-data-dialog.type";

const data: SuanliaoDataInput = {
  data: get算料数据2(),
  varNames: {names: {test: ["1"]}, width: 0},
  suanliaoDataParams: {
    选项: {
      型号: "1",
      产品分类: "2",
      工艺做法: "3",
      包边方向: "4",
      开启: "5",
      门铰锁边铰边: "6"
    }
  },
  key1: "包边在外+外开"
};

describe("SuanliaoDataDialogComponent", () => {
  let component: SuanliaoDataDialogComponent;
  let fixture: ComponentFixture<SuanliaoDataDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaoDataDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoDataDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
