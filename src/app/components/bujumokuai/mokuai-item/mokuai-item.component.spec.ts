import {ComponentFixture, TestBed} from "@angular/core/testing";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideRouter} from "@angular/router";
import bancaifenzuIndex from "@assets/json/bancaifenzuIndex.json";
import {MokuaiItemComponent} from "./mokuai-item.component";

describe("MokuaiItemComponent", () => {
  let component: MokuaiItemComponent;
  let fixture: ComponentFixture<MokuaiItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MokuaiItemComponent],
      providers: [provideAnimations(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MokuaiItemComponent);
    component = fixture.componentInstance;
    const ref = fixture.componentRef;
    ref.setInput("id", 0);
    ref.setInput("bancaiListData", bancaifenzuIndex.bancaiList);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
