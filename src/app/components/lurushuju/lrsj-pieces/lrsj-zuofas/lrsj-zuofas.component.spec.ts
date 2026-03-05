import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {LrsjZuofasComponent} from "./lrsj-zuofas.component";

describe("LrsjGongyisComponent", () => {
  let component: LrsjZuofasComponent;
  let fixture: ComponentFixture<LrsjZuofasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LrsjZuofasComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LrsjZuofasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
