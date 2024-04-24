import {TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {CadDataService} from "./cad-data.service";

describe("CadDataService", () => {
  let service: CadDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([])]});
    service = TestBed.inject(CadDataService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
