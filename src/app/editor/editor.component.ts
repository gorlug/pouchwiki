import {Component, ElementRef, OnInit, ViewChild} from "@angular/core";
// https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929
import * as ace from "ace-builds";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-github";
import {PageService} from "../page.service";
import {BehaviorSubject} from "rxjs";
import {ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {ActivatedRoute, Router} from "@angular/router";
import {PouchWikiPage} from "../PouchWikiPage";
import {fromPromise} from "rxjs/internal-compatibility";
import {LoggingService} from "../logging.service";

const THEME = "ace/theme/github";
const LANG = "ace/mode/markdown";

const LOG_NAME = "EditorComponent";

@Component({
    selector: "app-editor",
    templateUrl: "./editor.component.html",
    styleUrls: ["./editor.component.sass"]
})
export class EditorComponent implements OnInit {

    @ViewChild("codeEditor") codeEditorElmRef: ElementRef;
    @ViewChild("textareaEditor") textareEditorRef: ElementRef;
    private codeEditor: ace.Ace.Editor;

    text$: BehaviorSubject<string> = new BehaviorSubject("");
    page: PouchWikiPage;

    constructor(private pageService: PageService,
                private route: ActivatedRoute,
                private router: Router,
                private loggingService: LoggingService) {
    }

    getLogger() {
        return this.loggingService.getLogger();
    }

    ngOnInit() {
        const log = this.getLogger();
        this.pageService.getPageFromRoute(this.route, log).subscribe((result: ValueWithLogger) => {
            const page: PouchWikiPage = result.value;
            this.page = page;
            this.initEditor(page.getText());
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
        this.codeEditor.getSession().setMode(LANG);
        this.codeEditor.getSession().setValue(text);
        this.codeEditor.getSession().setUseWrapMode(true);
    }

    save() {
        const log = this.getLogger();
        const startLog = log.start(LOG_NAME, "save");
        const text = this.getEditorText();
        this.page.setText(text);
        this.pageService.getDB().saveDocument(this.page, log).subscribe(() => {
            this.navigateToCurrentPage(startLog);
        });
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
    }
}
