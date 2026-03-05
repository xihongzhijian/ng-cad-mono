import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {BujuComponent} from "./buju.component";

describe("BujuComponent", () => {
  let component: BujuComponent;
  let fixture: ComponentFixture<BujuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BujuComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BujuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
