import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadMtextComponent} from "./cad-mtext.component";

describe("CadMtextComponent", () => {
  let component: CadMtextComponent;
  let fixture: ComponentFixture<CadMtextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadMtextComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadMtextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
