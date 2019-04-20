import {PouchWikiPageToHtmlRenderer} from "./renderer";

describe("renderer", () => {

    it("should convert a single [link] to [link](/#/page/link)", () => {
        const renderer = new PouchWikiPageToHtmlRenderer();
        const text = renderer.convertPageLinks("some text [link] some more text");
        expect(text).toBe("some text [link](/#/page/link) some more text");
    });

    it("should not change links of type [link](http://google.com)", () => {
        const renderer = new PouchWikiPageToHtmlRenderer();
        const input = "some text [link](http://google.com) some more text";
        const text = renderer.convertPageLinks(input);
        expect(input).toBe(text);
    });
});
