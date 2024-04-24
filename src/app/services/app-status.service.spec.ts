import {TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {AppStatusService} from "./app-status.service";

describe("AppStatusService", () => {
  let service: AppStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
    service = TestBed.inject(AppStatusService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
