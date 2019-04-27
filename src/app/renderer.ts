import * as marked from "marked";
import * as camelCase from "camelcase";
import {PouchWikiPage} from "./PouchWikiPage";
import {PageService} from "./page.service";
import {of, Subject, zip} from "rxjs";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {concatMap} from "rxjs/operators";
import {DomSanitizer} from "@angular/platform-browser";

interface AttachmentUrl {
    name: string;
    url: string;
}

export class PouchWikiPageToHtmlRenderer {

    renderer: any;
    uniqueImageAttachments = {};
    imageAttachments: string[] = [];

    static sanitizeName(name: string) {
        return camelCase(name, {pascalCase: true});
    }

    constructor(private pageService: PageService,
                private page: PouchWikiPage,
                private sanitizer: DomSanitizer) {
        this.initRenderer();
    }

    private initRenderer() {
        this.renderer = new marked.Renderer();
        const originalImage = this.renderer.image;
        this.renderer.image = (href: string, title: string, text: string) => {
            console.log("image", href, title, text);
            this.checkForImageAttachment(href);
            return originalImage.call(this.renderer, href, title, text);
        };
    }

    render(subject: Subject<string>, log: Logger) {
        let text = this.page.getText();
        text = this.convertPageLinks(text);
        const html = marked(text, {renderer: this.renderer});
        this.replaceAttachmentImageLinks(html, log).subscribe((result: ValueWithLogger) => {
            const sanitizedHtml: any = this.sanitizer.bypassSecurityTrustHtml(result.value);
            subject.next(sanitizedHtml);
        });
    }

    convertPageLinks(text: string) {
        return text.replace(/\[([^\]]+)\](?!\()/g, (match, pageName) => {
            pageName = PouchWikiPageToHtmlRenderer.sanitizeName(pageName);
            match += `(/#/page/${pageName})`;
            return match;
        });
    }

    private checkForImageAttachment(href: string) {
        if (this.page.hasAttachment(href)) {
            this.uniqueImageAttachments[href] = true;
        }
    }

    private replaceAttachmentImageLinks(html: string, log: Logger) {
        this.imageAttachments = Object.keys(this.uniqueImageAttachments);
        if (this.imageAttachments.length === 0) {
            return log.addTo(of(html));
        }
        const getAttachmentDataObservables = this.createArrayOfGetAttachmentDatabObservables(log);
        const attachmentDataObservable = zip.apply(undefined, getAttachmentDataObservables);
        return attachmentDataObservable.pipe(
            concatMap( (resultArray: {value: AttachmentUrl, log: Logger}[]) => {
                return this.extracted(resultArray, html, log);
            })
        );
    }

    private createArrayOfGetAttachmentDatabObservables(log: Logger) {
        const getAttachmentDataObservables = [];
        this.imageAttachments.forEach(name => {
            getAttachmentDataObservables.push(
                this.createGetAttachmentDataObservable(name, log)
            );
        });
        return getAttachmentDataObservables;
    }

    private createGetAttachmentDataObservable(name, log: Logger) {
        return this.pageService.getAttachmentData(this.page, name, log).pipe(
            concatMap((result: ValueWithLogger) => {
                return result.log.addTo(of({
                    name: name,
                    url: result.value
                }));
            })
        );
    }

    private extracted(resultArray: { value: AttachmentUrl; log: Logger }[], html: string, log: Logger) {
        resultArray.forEach(result => {
            html = this.replaceImageAttachmentWithUrl(html, result.value);
        });
        return log.addTo(of(html));
    }

    private replaceImageAttachmentWithUrl(html: string, value: AttachmentUrl) {
        return html.replace(new RegExp(value.name, "g"), value.url);
    }
}
