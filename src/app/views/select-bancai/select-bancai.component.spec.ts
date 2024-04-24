import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {SelectBancaiComponent} from "./select-bancai.component";

describe("SelectBancaiComponent", () => {
  let component: SelectBancaiComponent;
  let fixture: ComponentFixture<SelectBancaiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBancaiComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectBancaiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
