import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {CadData} from "@lucilor/cad-viewer";
import {CadKailiaoConfigComponent} from "./cad-kailiao-config.component";
import {CadKailiaoConfigInput} from "./cad-kailiao-config.types";

const data: CadKailiaoConfigInput = {cad: new CadData()};
describe("CadKailiaoConfigComponent", () => {
  let component: CadKailiaoConfigComponent;
  let fixture: ComponentFixture<CadKailiaoConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadKailiaoConfigComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CadKailiaoConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
