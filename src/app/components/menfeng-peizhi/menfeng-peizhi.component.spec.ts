import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {XhmrmsbjSbjbItem} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.types";
import {getXhmrmsbjSbjbItemSbjb} from "@components/xhmrmsbj-sbjb/xhmrmsbj-sbjb.utils";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.utils";
import {MenfengPeizhiComponent} from "./menfeng-peizhi.component";

describe("MenfengPeizhiComponent", () => {
  let component: MenfengPeizhiComponent;
  let fixture: ComponentFixture<MenfengPeizhiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenfengPeizhiComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MenfengPeizhiComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    const sbjbItems: XhmrmsbjSbjbItem[] = [{产品分类: "单门", 锁边铰边数据: [getXhmrmsbjSbjbItemSbjb()]}];
    ref.setInput("xinghao", new MrbcjfzXinghaoInfo("table", {vid: 1, mingzi: "test"}));
    ref.setInput("sbjbItems", sbjbItems);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
