import * as marked from "marked";
import * as camelCase from "camelcase";

export class PouchWikiPageToHtmlRenderer {

    renderer: any;

    static sanitizeName(name: string) {
        return camelCase(name, {pascalCase: true});
    }

    constructor() {
        this.initRenderer();
    }

    private initRenderer() {
        this.renderer = new marked.Renderer();
        // console.log("renderer link", this.renderer.link);
        // const originalLink = this.renderer.link;
        // this.renderer.link = (href: string, title: string, text: string) => {
        //     console.log("href", href, "title", title, "text", text);
        //     return originalLink.call(this.renderer, href, title, text);
        // };
    }

    render(text: string) {
        text = this.convertPageLinks(text);
        return marked(text, {renderer: this.renderer});
    }

    convertPageLinks(text: string) {
        return text.replace(/\[([^\]]+)\](?!\()/g, (match, pageName) => {
            pageName = PouchWikiPageToHtmlRenderer.sanitizeName(pageName);
            match += `(/#/page/${pageName})`;
            return match;
        });
    }
}
