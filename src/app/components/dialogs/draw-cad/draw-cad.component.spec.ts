import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {CadData} from "@lucilor/cad-viewer";
import {DrawCadComponent, DrawCadInput} from "./draw-cad.component";

const data: DrawCadInput = {collection: "cad", cads: [new CadData({name: "test"})]};
describe("DrawCadComponent", () => {
  let component: DrawCadComponent;
  let fixture: ComponentFixture<DrawCadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawCadComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DrawCadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
