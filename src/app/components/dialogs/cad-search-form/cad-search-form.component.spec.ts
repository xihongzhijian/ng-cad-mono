import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {CadSearchFormComponent} from "./cad-search-form.component";

describe("CadSearchFormComponent", () => {
  let component: CadSearchFormComponent;
  let fixture: ComponentFixture<CadSearchFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadSearchFormComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: {}}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadSearchFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
