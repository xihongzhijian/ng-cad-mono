import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {CadZhankaiComponent} from "./cad-zhankai.component";

const item = new CadZhankai();
item.chai = true;
item.conditions = ["asd", "qdqwd"];
item.flip = [{kaiqi: "a", chanpinfenlei: "b", fanzhuanfangshi: "vh"}];
item.flipChai = {1: "h", 2: "v"};
const data: CadData["zhankai"] = [item];
describe("CadZhankaiComponent", () => {
  let component: CadZhankaiComponent;
  let fixture: ComponentFixture<CadZhankaiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadZhankaiComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadZhankaiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
