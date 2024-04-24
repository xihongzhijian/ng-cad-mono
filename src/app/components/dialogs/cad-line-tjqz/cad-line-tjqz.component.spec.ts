import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {CadLineTjqzComponent} from "./cad-line-tjqz.component";

describe("CadLineTjqzComponent", () => {
  let component: CadLineTjqzComponent;
  let fixture: ComponentFixture<CadLineTjqzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadLineTjqzComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: {}}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadLineTjqzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
