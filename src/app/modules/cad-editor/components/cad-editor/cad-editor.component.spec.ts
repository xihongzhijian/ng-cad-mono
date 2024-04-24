import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadEditorComponent} from "./cad-editor.component";

describe("CadEditorComponent", () => {
  let component: CadEditorComponent;
  let fixture: ComponentFixture<CadEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadEditorComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CadEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
