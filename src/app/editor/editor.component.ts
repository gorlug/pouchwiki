import {Component, ElementRef, OnInit, ViewChild} from "@angular/core";
// https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929
import * as ace from "ace-builds";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-github";
import {PageService} from "../page.service";
import {BehaviorSubject, fromEvent, Observable, of, Subject, timer} from "rxjs";
import {DBValueWithLog, Logger, PouchDBWrapper, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {ActivatedRoute, Router} from "@angular/router";
import {PouchWikiPage, PouchWikiPageGenerator} from "../PouchWikiPage";
import {fromPromise} from "rxjs/internal-compatibility";
import {LoggingService} from "../logging.service";
import {catchError, concatMap, debounce, map} from "rxjs/operators";

const THEME = "ace/theme/github";
const LANG = "ace/mode/markdown";

const LOG_NAME = "EditorComponent";

@Component({
    selector: "app-editor",
    templateUrl: "./editor.component.html",
    styleUrls: ["./editor.component.sass"]
})
export class EditorComponent implements OnInit {

    protected readonly onChangeDebounceTime = 500;

    @ViewChild("codeEditor") codeEditorElmRef: ElementRef;
    @ViewChild("textareaEditor") textareEditorRef: ElementRef;
    private codeEditor: ace.Ace.Editor;
    private buffer: PouchDBWrapper;

    text$: BehaviorSubject<string> = new BehaviorSubject("");
    page: PouchWikiPage;

    mobileEditorChanges$: Subject<any> = new Subject();

    constructor(private pageService: PageService,
                private route: ActivatedRoute,
                private router: Router,
                private loggingService: LoggingService) {
        const log = loggingService.getLogger();
        this.loadBufferDB(log);
    }

    getLogger() {
        return this.loggingService.getLogger();
    }

    ngOnInit() {
        const log = this.getLogger();
        this.pageService.getPageFromRoute(this.route, log).subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.page = page;
            this.initEditorWithText(page, result.log);
        }, pageName => {
            this.page = new PouchWikiPage(pageName);
            this.initEditor("");
        });
    }

    private initEditor(text: string) {
        if (this.isAndroidOriOS()) {
            this.initAndroidiOSEditor(text);
            return;
        }
        const element = this.codeEditorElmRef.nativeElement;
        const editorOptions: Partial<ace.Ace.EditorOptions> = {
            highlightActiveLine: true,
            minLines: 10,
            maxLines: Infinity,

        };

        this.codeEditor = ace.edit(element, editorOptions);
        this.codeEditor.setTheme(THEME);
        const session = this.codeEditor.getSession();
        session.setMode(LANG);
        session.setValue(text);
        session.setUseWrapMode(true);
        this.codeEditor.focus();
        const onChangeObservable = this.getOnChangeObservable(session);
        this.bufferChanges(onChangeObservable);
    }

    private getOnChangeObservable(session) {
        return fromEvent(session, "change").pipe(
            debounce(() => timer(this.onChangeDebounceTime)),
            map(() => session.getValue())
        );
    }

    save() {
        const log = this.getLogger();
        const startLog = log.start(LOG_NAME, "save");
        const text = this.getEditorText();
        this.page.setText(text);
        this.pageService.getDB().saveDocument(this.page, log).subscribe(() => {
            this.navigateToCurrentPage(startLog);
        });
        this.clearBuffer(log);
    }

    private getEditorText() {
        if (this.isAndroidOriOS()) {
            return this.textareEditorRef.nativeElement.value;
        }
        return this.codeEditor.getSession().getValue();
    }

    cancel() {
        const log = this.getLogger();
        const startLog = log.start(LOG_NAME, "cancel");
        this.navigateToCurrentPage(startLog);
        this.clearBuffer(log);
    }

    private navigateToCurrentPage(startLog) {
        const url = "/page/" + this.page.getName();
        fromPromise(this.router.navigateByUrl(url)).subscribe(result => {
            startLog.complete();
        });
    }

    isAndroidOriOS() {
        const userAgent = navigator.userAgent || navigator.vendor;
        return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
    }

    private initAndroidiOSEditor(text: string) {
        this.textareEditorRef.nativeElement.value = text;
        const onChangeObservable = this.mobileEditorChanges$.pipe(
            debounce(() => timer(this.onChangeDebounceTime)),
            map(() => this.getEditorText())
        );
        this.bufferChanges(onChangeObservable);
    }

    private bufferChanges(onChangeObservable: Observable<string>) {
        onChangeObservable.pipe(
            concatMap(text => {
                const log = this.loggingService.getLogger();
                log.logMessage(LOG_NAME, "bufferChanges");
                return this.saveToBuffer(text, log);
        })).subscribe((result: ValueWithLogger) => result.log.complete());
    }

    private loadBufferDB(log: Logger) {
        PouchDBWrapper.loadLocalDB("editor", new PouchWikiPageGenerator(), log).subscribe(
            (result: DBValueWithLog) => this.buffer = result.value
        );
    }

    private initEditorWithText(page: PouchWikiPage, log: Logger) {
        this.getPageText(page, log).subscribe((result: ValueWithLogger) => {
            this.initEditor(result.value);
        });
    }

    private getPageText(page: PouchWikiPage, log: Logger) {
        return this.buffer.getDocument(page.getId(), log).pipe(
            concatMap((result: ValueWithLogger) => {
                const bufferPage: PouchWikiPage = result.value;
                return result.log.addTo(of(bufferPage.getText()));
            }),
            catchError(() => {
                return log.addTo(of(page.getText()));
            })
        );
    }

    private saveToBuffer(text: string, log: Logger) {
        return this.buffer.getDocument(this.page.getId(), log).pipe(
            catchError(error => {
                const page = new PouchWikiPage(this.page.getName());
                return log.addTo(of(page));
            }),
            concatMap((result: {value: PouchWikiPage, log: Logger}) => {
                const page = result.value;
                page.setText(text);
                return this.buffer.saveDocument(page, log);
            })
        );
    }

    private clearBuffer(log: Logger) {
        this.buffer.getDocument(this.page.getId(), log).pipe(
            concatMap((result: ValueWithLogger) => {
                return this.buffer.deleteDocument(result.value, result.log);
            })
        ).subscribe((result: ValueWithLogger) => (
            result.log.logMessage(LOG_NAME, "clearBuffer of: " + this.page.getId(),
                {page: this.page.getName()})
        ), error => {
            log.logError(LOG_NAME, "clearBuffer error", "" + error);
        });
    }

    androidAppleChange() {
        this.mobileEditorChanges$.next("change");
    }
}
