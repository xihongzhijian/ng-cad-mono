import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef} from "@angular/material/dialog";
import {provideRouter} from "@angular/router";
import {ChangelogComponent} from "./changelog.component";

describe("ChangelogComponent", () => {
  let component: ChangelogComponent;
  let fixture: ComponentFixture<ChangelogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogComponent],
      providers: [{provide: MatDialogRef, useValue: {}}, provideRouter([])]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
