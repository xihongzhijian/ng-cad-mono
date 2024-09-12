import {TestBed} from "@angular/core/testing";
import {provideRouter} from "@angular/router";
import {OptionsService} from "./options.service";

describe("OptionsService", () => {
  let service: OptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([])]});
    service = TestBed.inject(OptionsService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
