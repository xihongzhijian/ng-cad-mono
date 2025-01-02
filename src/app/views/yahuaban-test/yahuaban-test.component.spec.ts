import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {YahuabanTestComponent} from "./yahuaban-test.component";

describe("YahuabanTestComponent", () => {
  let component: YahuabanTestComponent;
  let fixture: ComponentFixture<YahuabanTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YahuabanTestComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(YahuabanTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
