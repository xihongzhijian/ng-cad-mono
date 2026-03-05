import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {YahuabanTestComponent} from "./yahuaban-test.component";

describe("YahuabanTestComponent", () => {
  let component: YahuabanTestComponent;
  let fixture: ComponentFixture<YahuabanTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YahuabanTestComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(YahuabanTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
