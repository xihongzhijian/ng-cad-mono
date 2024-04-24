import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {DakongSummaryComponent} from "./dakong-summary.component";
import {DakongSummaryInput} from "./dakong-summary.types";

const data: DakongSummaryInput = {
  data: {
    aaa: [
      {
        cadId: "123",
        cadName: "abc",
        peizhiName: "def",
        summary: [
          {peizhiId: "1", kongId: "2", kongName: "edf1", face: "zzz1", count: 0, error: "123"},
          {peizhiId: "3", kongId: "4", kongName: "edf2", face: "zzz2", count: 2, error: ""}
        ]
      }
    ]
  }
};

describe("DakongSummaryComponent", () => {
  let component: DakongSummaryComponent;
  let fixture: ComponentFixture<DakongSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DakongSummaryComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    });
    fixture = TestBed.createComponent(DakongSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
