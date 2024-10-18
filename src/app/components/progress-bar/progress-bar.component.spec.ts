import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ProgressBarComponent} from "./progress-bar.component";
import {ProgressBar} from "./progress-bar.utils";

describe("ProgressBarComponent", () => {
  let component: ProgressBarComponent;
  let fixture: ComponentFixture<ProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressBarComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgressBarComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("progressBar", new ProgressBar(100));
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
