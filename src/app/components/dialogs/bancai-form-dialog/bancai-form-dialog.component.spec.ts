import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import bancaifenzuIndexData from "@assets/json/bancaifenzuIndex.json";
import {BancaiFormDialogComponent, BancaiFormInput} from "./bancai-form-dialog.component";

const data: BancaiFormInput = {data: {bancai: "", cailiao: "", houdu: ""}, bancaiList: bancaifenzuIndexData.bancaiList};

describe("BancaiFormDialogComponent", () => {
  let component: BancaiFormDialogComponent;
  let fixture: ComponentFixture<BancaiFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BancaiFormDialogComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BancaiFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
