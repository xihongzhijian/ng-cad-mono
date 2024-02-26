import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {SuanliaoTestDialogComponent} from "./suanliao-test-dialog.component";
import {SuanliaoTestInput} from "./suanliao-test-dialog.types";

const data: SuanliaoTestInput = {
  data: {
    测试用例: [
      {名字: "测试用例1", 时间: 0, 测试数据: {a: 1}, 测试正确: false},
      {名字: "测试用例2", 时间: 0, 测试数据: {a: 2}, 测试正确: true}
    ]
  }
};

describe("SuanliaoTestDialogComponent", () => {
  let component: SuanliaoTestDialogComponent;
  let fixture: ComponentFixture<SuanliaoTestDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaoTestDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoTestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
