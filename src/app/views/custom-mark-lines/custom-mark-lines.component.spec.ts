import {ComponentFixture, TestBed} from "@angular/core/testing";
import {CustomMarkLinesComponent} from "./custom-mark-lines.component";

describe("CustomMarkLinesComponent", () => {
  let component: CustomMarkLinesComponent;
  let fixture: ComponentFixture<CustomMarkLinesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomMarkLinesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomMarkLinesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
