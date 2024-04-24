import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadInfoComponent} from "./cad-info.component";

describe("CadInfoComponent", () => {
  let component: CadInfoComponent;
  let fixture: ComponentFixture<CadInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadInfoComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
