import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {CadMenfengConfigComponent} from "./cad-menfeng-config.component";
import {CadMenfengConfigInput} from "./cad-menfeng-config.utils";

const data: CadMenfengConfigInput = {items: [], type: "test"};

describe("CadMenfengConfigComponent", () => {
  let component: CadMenfengConfigComponent;
  let fixture: ComponentFixture<CadMenfengConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadMenfengConfigComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CadMenfengConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
