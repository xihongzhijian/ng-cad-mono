import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import xhmrmsbj from "@assets/json/xhmrmsbj.json";
import step1Data from "@assets/json/zixuanpeijianTypesInfo.json";
import {XhmrmsbjData} from "@views/xhmrmsbj/xhmrmsbj.utils";
import {XhmrmsbjXinghaoConfigComponent} from "./xhmrmsbj-xinghao-config.component";
import {XhmrmsbjXinghaoConfigComponentType} from "./xhmrmsbj-xinghao-config.types";

describe("XhmrmsbjXinghaoConfigComponent", () => {
  let component: XhmrmsbjXinghaoConfigComponent;
  let fixture: ComponentFixture<XhmrmsbjXinghaoConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XhmrmsbjXinghaoConfigComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjXinghaoConfigComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("data", new XhmrmsbjData(xhmrmsbj, ["锁扇正面", "锁扇背面"], step1Data.typesInfo, []));
    ref.setInput("type", "型号配置" satisfies XhmrmsbjXinghaoConfigComponentType);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
