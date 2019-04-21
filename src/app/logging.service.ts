import {Injectable} from "@angular/core";
import {Logger} from "@gorlug/pouchdb-rxjs";

@Injectable({
    providedIn: "root"
})
export class LoggingService {

    constructor() {
    }

    getLogger() {
        return Logger.getLoggerTrace();
    }
}
