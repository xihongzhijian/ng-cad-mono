import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {LurushujuNavComponent} from "./lurushuju-nav.component";

describe("LurushujuNavComponent", () => {
  let component: LurushujuNavComponent;
  let fixture: ComponentFixture<LurushujuNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LurushujuNavComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LurushujuNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
