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
    uniqueAttachments = {};
    attachments: string[] = [];
    readonly attachmentLinkSuffix = "_attachment_link";

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
        this.overwriteRendererImage();
        this.overwriteRendererLink();
    }

    private overwriteRendererImage() {
        const originalImage = this.renderer.image;
        this.renderer.image = (href: string, title: string, text: string) => {
            this.checkForAttachment(href);
            return originalImage.call(this.renderer, href, title, text);
        };
    }

    private overwriteRendererLink() {
        const originalLink = this.renderer.link;
        this.renderer.link = (href: string, title: string, text: string) => {
            this.checkForAttachment(href);
            return originalLink.call(this.renderer, href, title, text);
        };
    }

    render(subject: Subject<string>, log: Logger) {
        let text = this.page.getText();
        text = this.convertPageLinks(text);
        const html = marked(text, {renderer: this.renderer});
        this.replaceAttachmentLinks(html, log).subscribe((result: ValueWithLogger) => {
            const sanitizedHtml: any = this.sanitizer.bypassSecurityTrustHtml(result.value);
            subject.next(sanitizedHtml);
        });
    }

    convertPageLinks(text: string) {
        return text.replace(/\[([^\]]+)\](?!\()/g, (match, pageName) => {
            if (this.page.hasAttachment(pageName)) {
                return this.handleAttachmentLink(pageName, match);
            }
            return this.handlePageLink(pageName, match);
        });
    }

    private handleAttachmentLink(name: any, match: string) {
        this.uniqueAttachments[name] = true;
        return `[${name}${this.attachmentLinkSuffix}](${name})`;
    }

    private handlePageLink(pageName, match) {
        pageName = PouchWikiPageToHtmlRenderer.sanitizeName(pageName);
        return match + `(/#/page/${pageName})`;
    }

    private checkForAttachment(href: string) {
        if (this.page.hasAttachment(href)) {
            this.uniqueAttachments[href] = true;
        }
    }

    private replaceAttachmentLinks(html: string, log: Logger) {
        this.attachments = Object.keys(this.uniqueAttachments);
        if (this.attachments.length === 0) {
            return log.addTo(of(html));
        }
        const getAttachmentDataObservables = this.createArrayOfGetAttachmentDatabObservables(log);
        const attachmentDataObservable = zip.apply(undefined, getAttachmentDataObservables);
        return attachmentDataObservable.pipe(
            concatMap( (resultArray: {value: AttachmentUrl, log: Logger}[]) => {
                return this.replaceAllAttachmentsWithUrl(resultArray, html, log);
            })
        );
    }

    private createArrayOfGetAttachmentDatabObservables(log: Logger) {
        const getAttachmentDataObservables = [];
        this.attachments.forEach(name => {
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

    private replaceAllAttachmentsWithUrl(resultArray: { value: AttachmentUrl; log: Logger }[], html: string, log: Logger) {
        resultArray.forEach(result => {
            html = this.replaceAttachmentWithUrl(html, result.value);
        });
        resultArray.forEach(result => {
            html = this.revertAttachmentLinks(html, result.value);
        });
        return log.addTo(of(html));
    }

    private replaceAttachmentWithUrl(html: string, value: AttachmentUrl) {
        return html.replace(new RegExp(value.name, "g"), value.url);
    }

    private revertAttachmentLinks(html: string, value: AttachmentUrl) {
        return html.replace(new RegExp(value.url + this.attachmentLinkSuffix, "g"), value.name);
    }
}
