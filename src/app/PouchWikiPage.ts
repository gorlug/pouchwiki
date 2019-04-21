import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON} from "@gorlug/pouchdb-rxjs";
import {PouchWikiPageToHtmlRenderer} from "./renderer";
import * as camelCase from "camelcase";

export interface PouchWikiDocument extends PouchDBDocumentJSON {
    text: string;
}

export class PouchWikiPage extends PouchDBDocument<PouchWikiDocument> {

    text: string;
    renderer = new PouchWikiPageToHtmlRenderer();

    static sanitizeName(name: string) {
        return camelCase(name, {pascalCase: true});
    }

    constructor(name: string) {
        super();
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

    protected addValuesToJSONDocument(json: PouchWikiDocument): any {
        json.text = this.text;
    }

    protected getNameOfDoc(): string {
        return "PouchWikiPage";
    }

}

export class PouchWikiPageGenerator extends PouchDBDocumentGenerator<PouchWikiPage> {

    protected createDocument(json: PouchWikiDocument): PouchWikiPage {
        const page = new PouchWikiPage(json._id);
        page.text = json.text;
        return page;
    }

}
