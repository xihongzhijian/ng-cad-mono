import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {imgEmpty} from "@app/app.common";
import {CadData} from "@lucilor/cad-viewer";
import {DingdanbiaoqianComponent} from "./dingdanbiaoqian.component";
import {Order} from "./dingdanbiaoqian.types";

const orders: Order[] = [
  {
    code: "1",
    cads: [
      {
        houtaiId: "",
        data: new CadData({info: {标签信息: [{key: 1, value: 1}]}}),
        isLarge: true,
        img: imgEmpty,
        imgLarge: imgEmpty,
        imgSize: [100, 100],
        style: {},
        imgStyle: {},
        zhankai: [
          {width: "100", height: "100", num: "10"},
          {width: "200", height: "200", num: "20"}
        ]
      }
    ],
    positions: [],
    style: {},
    info: [{}, {}, {}]
  }
];

describe("DingdanbiaoqianComponent", () => {
  let component: DingdanbiaoqianComponent;
  let fixture: ComponentFixture<DingdanbiaoqianComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DingdanbiaoqianComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DingdanbiaoqianComponent);
    component = fixture.componentInstance;
    component.orders.set(orders);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
