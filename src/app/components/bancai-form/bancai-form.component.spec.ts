import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {BancaiFormComponent} from "./bancai-form.component";

describe("BancaiFormComponent", () => {
  let component: BancaiFormComponent;
  let fixture: ComponentFixture<BancaiFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BancaiFormComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BancaiFormComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("key", "");
    ref.setInput("bancaiList", []);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
