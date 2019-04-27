import * as marked from "marked";
import * as camelCase from "camelcase";
import {PouchWikiPage} from "./PouchWikiPage";
import {PageService} from "./page.service";
import {of, Subject} from "rxjs";
import {Logger, ValueWithLogger} from "@gorlug/pouchdb-rxjs";
import {concatMap} from "rxjs/operators";
import {DomSanitizer} from "@angular/platform-browser";

export class PouchWikiPageToHtmlRenderer {

    renderer: any;
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
            this.imageAttachments.push(href);
        }
    }

    private replaceAttachmentImageLinks(html: string, log: Logger) {
        if (this.imageAttachments.length === 0) {
            return log.addTo(of(html));
        }
        const attachment = this.imageAttachments[0];
        return this.pageService.getAttachmentData(this.page, attachment, log).pipe(
            concatMap((result: ValueWithLogger) => {
                const url = result.value;
                html = html.replace(attachment, url);
                return log.addTo(of(html));
            })
        );
    }
}
