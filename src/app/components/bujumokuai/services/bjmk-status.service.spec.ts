import {TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {BjmkStatusService} from "./bjmk-status.service";

describe("BjmkStatusService", () => {
  let service: BjmkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
    service = TestBed.inject(BjmkStatusService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
