import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {XhmrmsbjComponent} from "./xhmrmsbj.component";

describe("XhmrmsbjComponent", () => {
  let component: XhmrmsbjComponent;
  let fixture: ComponentFixture<XhmrmsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XhmrmsbjComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
