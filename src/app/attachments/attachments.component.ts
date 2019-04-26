import {Component, ElementRef, OnInit, ViewChild} from "@angular/core";
import {LoggingService} from "../logging.service";
import {ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {BehaviorSubject} from "rxjs";
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
    attachments$: BehaviorSubject<PouchWikiAttachment[]> = new BehaviorSubject([]);

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
            this.loadAttachments();
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
        const attachment: PouchWikiAttachment = {
            name: file.name,
            content_type: file.type,
            data: file,
        };
        this.pageService.saveAttachment(this.page, attachment, log)
        .subscribe((result: ValueWithLogger) => {
            this.page = result.value;
            this.loadAttachments();
            startLog.complete();
        });
    }

    private fileChangeEventDoesNotHaveFile($event: any) {
        return !$event.target.files || $event.target.files.length === 0;
    }

    private loadAttachments() {
        const attachments = this.page.attachments.slice(0);
        console.log("load attachments", attachments);
        this.attachments$.next(attachments);
    }

    download(attachment: PouchWikiAttachment) {
        const log = this.loggingService.getLogger();
        const startLog = log.start(LOG_NAME, "download " + attachment.name + " on page " +
              this.page.getName(), {name: name, page: this.page.getName()});
        this.pageService.openAttachment(this.page, attachment, log).subscribe(next => {
            startLog.complete();
        });
    }

    delete(attachment: PouchWikiAttachment) {
        const log = this.loggingService.getLogger();
        const startLog = log.start(LOG_NAME, "delete " + attachment.name + " on page " +
            this.page.getName(), {name: name, page: this.page.getName()});
        if (confirm(`Delete attachment ${attachment.name}`)) {
            this.pageService.deleteAttachment(this.page, attachment, log).subscribe(
                (result: ValueWithLogger) => {
                    this.page = result.value;
                    this.loadAttachments();
                    startLog.complete();
            });
        }
    }
}
