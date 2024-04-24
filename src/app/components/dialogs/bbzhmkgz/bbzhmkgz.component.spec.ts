import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import {BbzhmkgzComponent, BbzhmkgzComponentData} from "./bbzhmkgz.component";

const data: BbzhmkgzComponentData = {value: "test", vars: {a: "1", b: "2"}};
describe("BbzhmkgzComponent", () => {
  let component: BbzhmkgzComponent;
  let fixture: ComponentFixture<BbzhmkgzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BbzhmkgzComponent],
      providers: [{provide: MAT_DIALOG_DATA, useValue: data}, {provide: MatDialogRef, useValue: {}}, provideAnimations(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BbzhmkgzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
