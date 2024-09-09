import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {SuanliaogongshiComponent} from "./suanliaogongshi.component";
import {SuanliaogongshiInfo} from "./suanliaogongshi.types";

describe("SuanliaogongshiComponent", () => {
  let component: SuanliaogongshiComponent;
  let fixture: ComponentFixture<SuanliaogongshiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaogongshiComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaogongshiComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("info", {
      data: {算料公式: [], 输入数据: [{名字: "a", 可以修改: true, 取值范围: "1-1", 默认值: "1"}]}
    } satisfies SuanliaogongshiInfo);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
