import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {LvxingcaiyouhuaComponent} from "./lvxingcaiyouhua.component";

describe("LvxingcaiyouhuaComponent", () => {
  let component: LvxingcaiyouhuaComponent;
  let fixture: ComponentFixture<LvxingcaiyouhuaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LvxingcaiyouhuaComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LvxingcaiyouhuaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
