import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import bancaifenzuIndexData from "@assets/testData/bancaifenzuIndex.json";
import {BancaiFormComponent} from "@components/bancai-form/bancai-form.component";
import {BancaiFormDialogComponent, BancaiFormInput} from "./bancai-form-dialog.component";

const data: BancaiFormInput = {data: {bancai: "", cailiao: "", houdu: ""}, bancaiList: bancaifenzuIndexData.bancaiList};

describe("BancaiFormDialogComponent", () => {
  let component: BancaiFormDialogComponent;
  let fixture: ComponentFixture<BancaiFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BancaiFormComponent, BancaiFormDialogComponent, BrowserAnimationsModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BancaiFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
