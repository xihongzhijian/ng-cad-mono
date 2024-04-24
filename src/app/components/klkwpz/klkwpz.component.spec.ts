import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {KlkwpzComponent} from "./klkwpz.component";

describe("KlkwpzComponent", () => {
  let component: KlkwpzComponent;
  let fixture: ComponentFixture<KlkwpzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KlkwpzComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(KlkwpzComponent);
    component = fixture.componentInstance;
    component.data = {test: [{face: "123"}]};
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
