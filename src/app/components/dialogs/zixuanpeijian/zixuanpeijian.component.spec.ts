import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {timeout} from "@lucilor/utils";
import {ZixuanpeijianComponent} from "./zixuanpeijian.component";
import {getTestData} from "./zixuanpeijian.utils";

const data = getTestData();

describe("ZixuanpeijianComponent", () => {
  let component: ZixuanpeijianComponent;
  let fixture: ComponentFixture<ZixuanpeijianComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZixuanpeijianComponent],
      providers: [{provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: data}, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ZixuanpeijianComponent);
    component = fixture.componentInstance;
    await timeout(200);
    component.setStep(3);
    await timeout(200);
    component.setStep(2);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
