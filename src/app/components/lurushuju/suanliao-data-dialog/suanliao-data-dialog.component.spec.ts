import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {SuanliaoDataDialogComponent} from "./suanliao-data-dialog.component";
import {SuanliaoDataInput} from "./suanliao-data-dialog.type";

const data: SuanliaoDataInput = {
  data: {算料公式: [], 测试用例: [], 算料CAD: [], 输入数据: []},
  varNames: {names: {test: ["1"]}, width: 0},
  suanliaoDataParams: {
    选项: {
      型号: "1",
      工艺做法: "2",
      包边方向: "3",
      开启: "4",
      门铰锁边铰边: "5"
    }
  },
  key1: "包边在外+外开"
};

describe("SuanliaoDataDialogComponent", () => {
  let component: SuanliaoDataDialogComponent;
  let fixture: ComponentFixture<SuanliaoDataDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, SuanliaoDataDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoDataDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
