import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {SuanliaodanFlipComponent} from "./suanliaodan-flip.component";
import {SuanliaodanFlipInput} from "./suanliaodan-flip.types";

const data: SuanliaodanFlipInput = {items: [{kaiqi: "", chanpinfenlei: "", fanzhuanfangshi: ""}]};
describe("SuanliaodanFlipComponent", () => {
  let component: SuanliaodanFlipComponent;
  let fixture: ComponentFixture<SuanliaodanFlipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuanliaodanFlipComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaodanFlipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
