import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisInput} from "./xhmrmsbj-mokuais.component";

const data: XhmrmsbjMokuaisInput = {
  xhmrmsbj: new XhmrmsbjData({vid: 0, mingzi: "1"}, [], {}, []),
  xinghao: new MrbcjfzXinghaoInfo("", {vid: 0, mingzi: "1"}),
  data: {
    lastSuanliao: {
      input: {
        materialResult: {},
        gongshi: {},
        tongyongGongshi: {},
        inputResult: {},
        型号选中门扇布局: {},
        配件模块CAD: {},
        门扇布局CAD: [],
        bujuNames: [],
        varNames: [],
        xhmrmsbj: {vid: 1, mingzi: "1"},
        msbjs: []
      },
      output: {
        fulfilled: true,
        materialResult: {},
        输出变量公式计算结果: {},
        配件模块CAD: [],
        门扇布局CAD: []
      }
    }
  },
  isVersion2024: true
};

describe("XhmrmsbjMokuaisComponent", () => {
  let component: XhmrmsbjMokuaisComponent;
  let fixture: ComponentFixture<XhmrmsbjMokuaisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XhmrmsbjMokuaisComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjMokuaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
