import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {AnchorSelectorComponent} from "./anchor-selector.component";

describe("AnchorSelectorComponent", () => {
  let component: AnchorSelectorComponent;
  let fixture: ComponentFixture<AnchorSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnchorSelectorComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnchorSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
