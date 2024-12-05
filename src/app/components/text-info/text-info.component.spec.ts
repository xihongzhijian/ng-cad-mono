import {ComponentFixture, TestBed} from "@angular/core/testing";
import {TextInfoComponent} from "./text-info.component";
import {TextInfo} from "./text-info.types";

describe("TextInfoComponent", () => {
  let component: TextInfoComponent;
  let fixture: ComponentFixture<TextInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextInfoComponent],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(TextInfoComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("infos", [{name: "a", text: "123"}] satisfies TextInfo[]);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
