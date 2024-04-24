import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadLineComponent} from "./cad-line.component";

describe("CadLineComponent", () => {
  let component: CadLineComponent;
  let fixture: ComponentFixture<CadLineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadLineComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadLineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
