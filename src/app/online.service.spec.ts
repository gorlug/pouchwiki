import {TestBed} from "@angular/core/testing";

import {OnlineService} from "./online.service";

describe("OnlineService", () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it("should be created", () => {
        const service: OnlineService = TestBed.get(OnlineService);
        expect(service).toBeTruthy();
    });

    it("online$ should be true", complete => {
        const service: OnlineService = TestBed.get(OnlineService);
        service.online$.subscribe(next => {
            expect(next).toBeTruthy();
            complete();
        });
    });
});
