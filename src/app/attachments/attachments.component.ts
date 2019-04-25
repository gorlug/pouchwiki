import {Component, ElementRef, OnInit, ViewChild} from "@angular/core";
import {LoggingService} from "../logging.service";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {Observable, of, Subject} from "rxjs";
import {concatMap} from "rxjs/operators";
import {PageService} from "../page.service";
import {PouchWikiAttachment, PouchWikiPage} from "../PouchWikiPage";
import {ActivatedRoute} from "@angular/router";
import {DomSanitizer} from "@angular/platform-browser";

const LOG_NAME = "AttachmentsComponent";

@Component({
    selector: "app-attachments",
    templateUrl: "./attachments.component.html",
    styleUrls: ["./attachments.component.sass"]
})
export class AttachmentsComponent implements OnInit {

    page: PouchWikiPage;
    url$: Subject<any> = new Subject();
    url;

    @ViewChild("file") fileInput: ElementRef;

    constructor(private loggingService: LoggingService,
                private pageService: PageService,
                private route: ActivatedRoute,
                private sanitizer: DomSanitizer) {
    }

    ngOnInit() {
        const log = this.loggingService.getLogger();
        log.logMessage(LOG_NAME, "ngOnInit load page");
        this.pageService.getPageFromRoute(this.route, log).subscribe((result: ValueWithLogger) => {
            this.page = result.value;
            this.pageService.getAttachmentData(this.page, "anzeige_ist_raus.jpg", log)
                .subscribe((dataResult: ValueWithLogger) => {
                    const url = this.sanitizer.bypassSecurityTrustUrl(dataResult.value);
                    console.log("dataResult", url);
                    this.url$.next(url);
                    this.url = url;
                });
        });
    }

    onFileChange($event: any) {
        const log = this.loggingService.getLogger();
        const startLog = log.start(LOG_NAME, "onFileChange");
        if (this.fileChangeEventDoesNotHaveFile($event)) {
            log.logMessage(LOG_NAME, "event did not contain file");
            startLog.complete();
            return;
        }
        const file = $event.target.files[0];
        console.log(file);
        const attachment: PouchWikiAttachment = {
            name: file.name,
            content_type: file.type,
            data: file,
        };
        this.page.addAttachment(attachment);
        this.pageService.getDB().saveDocument(this.page, log).subscribe((result: ValueWithLogger) => {
            result.log.complete();
            console.log("result", result.value);
        });
        // this.readInFile($event, log);
    }

    private fileChangeEventDoesNotHaveFile($event: any) {
        return !$event.target.files || $event.target.files.length === 0;
    }

    // private readInFile($event: any, log: Logger) {
    //     const file = $event.target.files[0];
    //     console.log(file);
    //     this.getFileData(file).pipe(
    //         concatMap(data => {
    //             return of(this.createAttachmentValues(file, data, log));
    //         }),
    //         concatMap((values: AttachmentValues) => {
    //             return this.pageService.storeAttachment(this.page, values, log);
    //         })
    //     ).subscribe((result: ValueWithLogger) => {
    //         console.log("result", result);
    //     });
    // }
    //
    // private getFileData(file: any): Observable<string> {
    //     return Observable.create(subscriber => {
    //         const reader = new FileReader();
    //         reader.readAsDataURL(file);
    //         reader.onload = () => {
    //             subscriber.next(reader.result);
    //             subscriber.complete();
    //         };
    //     });
    // }
    //
    // private createAttachmentValues(file: any, data: string, log: Logger): AttachmentValues {
    //     const values: AttachmentValues = {
    //         name: file.name,
    //         type: file.type,
    //         data: data
    //     };
    //     log.logMessage(LOG_NAME, "createAttachmentValues of attachment " + values.name, {
    //         name: values.name, type: values.type
    //     });
    //     return values;
    // }
}
