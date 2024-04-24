import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadData} from "@lucilor/cad-viewer";
import {CadEditorDialogComponent, CadEditorInput} from "./cad-editor-dialog.component";

const data: CadEditorInput = {data: new CadData({name: "test"}), collection: "cad"};

describe("CadEditorDialogComponent", () => {
  let component: CadEditorDialogComponent;
  let fixture: ComponentFixture<CadEditorDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadEditorDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CadEditorDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
