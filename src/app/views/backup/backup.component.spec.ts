import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import {provideRouter} from "@angular/router";
import {CadData} from "@lucilor/cad-viewer";
import {BackupComponent} from "./backup.component";

describe("BackupComponent", () => {
  let component: BackupComponent;
  let fixture: ComponentFixture<BackupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackupComponent],
      providers: [provideAnimationsAsync(), provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupComponent);
    component = fixture.componentInstance;
    const now = new Date();
    component.data = [{time: now.getTime(), title: now.toLocaleTimeString(), data: new CadData()}];
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
