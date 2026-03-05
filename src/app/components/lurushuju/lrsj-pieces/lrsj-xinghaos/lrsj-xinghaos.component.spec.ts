import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {LrsjXinghaosComponent} from "./lrsj-xinghaos.component";

describe("LrsjXinghaosComponent", () => {
  let component: LrsjXinghaosComponent;
  let fixture: ComponentFixture<LrsjXinghaosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LrsjXinghaosComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LrsjXinghaosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
