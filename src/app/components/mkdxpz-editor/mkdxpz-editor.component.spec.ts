import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {VarNameItem} from "@components/var-names/var-names.types";
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
    const varNameItem: VarNameItem = {nameGroups: [{groupName: "test", varNames: ["a"]}], width: 100};
    ref.setInput("data", getEmpty模块大小配置());
    ref.setInput("varNameItem", varNameItem);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
