import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {MsbjComponent} from "./msbj.component";

describe("MsbjComponent", () => {
  let component: MsbjComponent;
  let fixture: ComponentFixture<MsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MsbjComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MsbjComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
