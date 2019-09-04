import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON, PouchDBDocumentList} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import {AppVersion} from "./app.version";
import * as moment from "moment";
import {Moment} from "moment";

export interface PouchDBAttachment {
    content_type: string;
    digest: string;
    length: number;
    revpos: number;
    stub: boolean;
}

export interface PouchWikiDocument extends PouchDBDocumentJSON {
    text: string;
    lastModified: string,
    _attachments: {
        [filename: string]: PouchDBAttachment;
    };
}

export interface PouchWikiAttachment {
    name: string;
    content_type: string;
    data: any;
}

export class PouchWikiPage extends PouchDBDocument<PouchWikiDocument> {

    text: string;
    lastModified: Moment;
    attachments = {};

    constructor(name: string) {
        super();
        name = PouchWikiPageToHtmlRenderer.sanitizeName(name);
        this.docVersion = AppVersion.VERSION;
        this.docName = "PouchWikiPage";
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

    getAttachmentNames(): string[] {
        if (this.attachments === undefined) {
            return [];
        }
        return Object.keys(this.attachments);
    }

    hasAttachment(name: string) {
        return this.attachments !== undefined && this.attachments[name] !== undefined;
    }

    protected addValuesToJSONDocument(json: PouchWikiDocument): any {
        json.text = this.text;
        json._attachments = this.attachments;
        json.lastModified = this.lastModified.toISOString(true);
    }

    protected getNameOfDoc(): string {
        return "PouchWikiPage";
    }

    copyToNewPage(name: string) {
        const newPage = new PouchWikiPage(name);
        newPage.setText(this.getText());
        newPage.attachments = this.attachments;
        return newPage;
    }

    getLastModifiedString() {
        return this.lastModified.toLocaleString();
    }

}

export class PouchWikiPageGenerator extends PouchDBDocumentGenerator<PouchWikiPage> {

    protected createDocument(json: PouchWikiDocument): PouchWikiPage {
        console.log("load page", json);
        const page = new PouchWikiPage(json._id);
        page.text = json.text;
        page.attachments = json._attachments;
        if (json.lastModified === undefined) {
            page.lastModified = moment();
        } else {
            page.lastModified = moment(json.lastModified);
        }

        return page;
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
