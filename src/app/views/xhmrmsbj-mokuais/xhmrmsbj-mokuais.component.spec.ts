import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisInput} from "./xhmrmsbj-mokuais.component";

const data: XhmrmsbjMokuaisInput = {
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
        varNames: []
      },
      output: {
        fulfilled: true,
        materialResult: {},
        materialResultDiff: {},
        配件模块CAD: [],
        门扇布局CAD: []
      }
    },
    mokuaidaxiaoResults: {}
  }
};

describe("XhmrmsbjMokuaisComponent", () => {
  let component: XhmrmsbjMokuaisComponent;
  let fixture: ComponentFixture<XhmrmsbjMokuaisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XhmrmsbjMokuaisComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MatDialogRef, useValue: {}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjMokuaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
