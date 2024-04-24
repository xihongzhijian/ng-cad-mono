import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {get算料数据2} from "../xinghao-data";
import {SuanliaoTestDialogComponent} from "./suanliao-test-dialog.component";
import {SuanliaoTestInput} from "./suanliao-test-dialog.types";

const data: SuanliaoTestInput = {
  data: get算料数据2({
    测试用例: [
      {名字: "测试用例1", 时间: 0, 测试数据: {a: 1}, 测试正确: false},
      {名字: "测试用例2", 时间: 0, 测试数据: {a: 2}, 测试正确: true}
    ]
  }),
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
  }
};

describe("SuanliaoTestDialogComponent", () => {
  let component: SuanliaoTestDialogComponent;
  let fixture: ComponentFixture<SuanliaoTestDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaoTestDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoTestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
