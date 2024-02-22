import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {HttpModule} from "@modules/http/http.module";
import {SuanliaogongshiDialogComponent} from "./suanliaogongshi-dialog.component";
import {SuanliaogongshiDialogInput} from "./suanliaogongshi-dialog.types";

const data: SuanliaogongshiDialogInput = {
  info: {
    data: {算料公式: [], 输入数据: [], 测试用例: []}
  }
};
describe("SuanliaogongshiDialogComponent", () => {
  let component: SuanliaogongshiDialogComponent;
  let fixture: ComponentFixture<SuanliaogongshiDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpModule, SuanliaogongshiDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaogongshiDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
