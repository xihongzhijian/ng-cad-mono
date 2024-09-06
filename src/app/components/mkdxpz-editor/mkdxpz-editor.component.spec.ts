import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {getEmpty模块大小配置} from "@views/msbj/msbj.utils";
import {MkdxpzEditorComponent} from "./mkdxpz-editor.component";

describe("MkdxpzEditorComponent", () => {
  let component: MkdxpzEditorComponent;
  let fixture: ComponentFixture<MkdxpzEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MkdxpzEditorComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MkdxpzEditorComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("data", getEmpty模块大小配置());
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
