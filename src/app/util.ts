import {CouchDBConf, CouchDBWrapper, DBValueWithLog, Logger, PouchDBWrapper, RxjsUtil, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {Observable, of} from "rxjs";
import {catchError, concatMap} from "rxjs/operators";

const LOG_DB_CONF = new CouchDBConf();
LOG_DB_CONF.setDBName("dev-log");
LOG_DB_CONF.setPort(5984);
LOG_DB_CONF.setHost("couchdb-test");
LOG_DB_CONF.setHttp();
LOG_DB_CONF.setCredentials({
    username: "loggingUser",
    password: "somepassword"
});

const LOG_NAME = "Util";

declare const CI_RUN: boolean;

export class Util {


    static loadLogDB(): Observable<DBValueWithLog> {
        const log = Logger.getLoggerTrace();
        return Util.getLogDBConf(log).pipe(
            concatMap((result: {value: CouchDBConf, log: Logger}) => {
                return PouchDBWrapper.loadExternalDB(result.value, result.log);
            })
        );
    }

    private static getLogDBConf(log: Logger): Observable<{value: CouchDBConf, log: Logger}> {
        if (!CI_RUN) {
            return log.addTo(of(LOG_DB_CONF));
        }
        LOG_DB_CONF.setCredentials({
            username: "admin",
            password: "admin"
        });
        LOG_DB_CONF.setDBName("ci-dev-log");
        return Util.resetLogDB(LOG_DB_CONF, log);
    }

    private static resetLogDB(conf: CouchDBConf, log: Logger) {
        const steps = [
            Util.deleteExternalDB(conf),
            Util.createExternalDB(conf),
            concatMap((result: ValueWithLogger) => {
                return result.log.addTo(of(LOG_DB_CONF));
            })
        ];
        return RxjsUtil.operatorsToObservable(steps, log);
    }

    static getExternalDBName(username: string, dbName: string) {
        return dbName + "_" + username;
    }

    static deleteExternalDB(conf: CouchDBConf) {
        let log: Logger;
        return [
            concatMap((result: ValueWithLogger) => {
                log = result.log;
                return CouchDBWrapper.deleteCouchDBDatabase(conf, result.log);
            }),
            catchError(error => {
                log.logError(LOG_NAME, "destroy of local db went wrong. probably didn't exist",
                    "" + error, {
                        conf: conf.getDebugInfo(),
                        error: error + ""
                    });
                return log.addTo(of(true));
            })
        ];
    }

    static createExternalDB(conf: CouchDBConf) {
        return concatMap((result: ValueWithLogger) => {
            return CouchDBWrapper.createCouchDBDatabase(conf, result.log);
        });
    }
}
