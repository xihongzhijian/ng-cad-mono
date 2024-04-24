import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CleanComponent} from "./clean.component";

describe("CleanComponent", () => {
  let component: CleanComponent;
  let fixture: ComponentFixture<CleanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CleanComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CleanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
