import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {PrintCadComponent} from "./print-cad.component";

describe("PrintCADComponent", () => {
  let component: PrintCadComponent;
  let fixture: ComponentFixture<PrintCadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintCadComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintCadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
