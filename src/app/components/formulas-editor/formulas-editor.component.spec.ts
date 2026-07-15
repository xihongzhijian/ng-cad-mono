import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {FormulasEditorComponent} from "./formulas-editor.component";

describe("FormulasEditorComponent", () => {
  let component: FormulasEditorComponent;
  let fixture: ComponentFixture<FormulasEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormulasEditorComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(FormulasEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
