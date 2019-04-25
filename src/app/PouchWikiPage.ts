import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON, PouchDBDocumentList} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {AppVersion} from "./app.version";
import {__values} from "tslib";

export interface PouchWikiDocument extends PouchDBDocumentJSON {
    text: string;
    _attachments: {
        [filename: string]: {
            content_type: string,
            data: any
        }
    };
}

export interface PouchWikiAttachment {
    name: string;
    content_type: string;
    data: any;
}

export class PouchWikiPage extends PouchDBDocument<PouchWikiDocument> {

    text: string;
    renderer = new PouchWikiPageToHtmlRenderer();
    attachments: PouchWikiAttachment[] = [];

    constructor(name: string) {
        super();
        name = PouchWikiPageToHtmlRenderer.sanitizeName(name);
        this.docVersion = AppVersion.VERSION;
        this.setId(name);
    }

    getName() {
        return this.getId();
    }

    getText() {
        return this.text;
    }

    setText(text: string) {
        this.text = text;
    }

    toHtml() {
        return this.renderer.render(this.text);
    }

    addAttachment(attachment: PouchWikiAttachment) {
        this.attachments.push(attachment);
    }

    protected addValuesToJSONDocument(json: PouchWikiDocument): any {
        json.text = this.text;
        json._attachments = {};
        this.attachments.forEach(attachment => {
            json._attachments[attachment.name] = {
                content_type: attachment.content_type,
                data: attachment.data
            };
        });
    }

    protected getNameOfDoc(): string {
        return "PouchWikiPage";
    }

}

export class PouchWikiPageGenerator extends PouchDBDocumentGenerator<PouchWikiPage> {

    protected createDocument(json: PouchWikiDocument): PouchWikiPage {
        console.log("createDocument", json);
        const page = new PouchWikiPage(json._id);
        page.text = json.text;
        this.addAttachments(page, json);
        console.log("page", page);
        return page;
    }

    private addAttachments(page: PouchWikiPage, json: PouchWikiDocument) {
        if (json._attachments === undefined) {
            return;
        }
        // tslint:disable-next-line:forin
        for (const name in json._attachments) {
            const value = json._attachments[name];
            page.addAttachment({
                name: name,
                content_type: value.content_type,
                data: undefined
            });
        }
    }
}

export class PouchWikiPageList extends PouchDBDocumentList<PouchWikiPage> {

    protected sort(): void {
        super.sort();
        this.items.sort((a: PouchWikiPage, b: PouchWikiPage) => {
            return a.getName().localeCompare(b.getName());
        });
    }
}
