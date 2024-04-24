import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {SelectCadsComponent} from "./select-cads.component";

describe("SelectCadsComponent", () => {
  let component: SelectCadsComponent;
  let fixture: ComponentFixture<SelectCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectCadsComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
