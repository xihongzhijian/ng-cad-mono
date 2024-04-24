import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {ReplaceTextComponent} from "./replace-text.component";

describe("ReplaceTextComponent", () => {
  let component: ReplaceTextComponent;
  let fixture: ComponentFixture<ReplaceTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReplaceTextComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReplaceTextComponent);
    component = fixture.componentInstance;
    component.form.controls.replaceFrom.setValue("aaa");
    component.form.controls.replaceTo.setValue("bbb");
    component.toBeReplacedList = [{id: "123", name: "345", matchedTexts: ["123", "321"], checked: true}];
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
