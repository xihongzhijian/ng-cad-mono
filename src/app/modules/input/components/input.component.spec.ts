import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {timeout} from "@lucilor/utils";
import {InputComponent} from "./input.component";

describe("InputComponent", () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    const label = "test";
    component.info = {type: "string", label, textarea: {autosize: {minRows: 1, maxRows: 3}}};
    await timeout(0);
    component.info = {type: "number", label};
    await timeout(0);
    component.info = {type: "boolean", label};
    await timeout(0);
    component.info = {type: "object", label};
    await timeout(0);
    component.info = {type: "array", label};
    await timeout(0);
    component.info = {type: "select", label: "test", options: ["a", "b", "c"]};
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
