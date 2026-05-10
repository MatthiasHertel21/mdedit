import { JSDOM } from "jsdom";
const dom = new JSDOM(\`
  <p>[[MDLAYOUT:columns-open;count=2]]</p>
  <p>Content</p>
  <p>[[MDLAYOUT:columns-close]]</p>
\`);
const doc = dom.window.document;
doc.body.querySelectorAll("p").forEach(p => {
  if (p.textContent.includes("columns-open")) {
    const marker = doc.createElement("div");
    marker.className = "md-columns-token-start";
    p.replaceWith(marker);
  } else if (p.textContent.includes("columns-close")) {
    const marker = doc.createElement("div");
    marker.className = "md-columns-token-end";
    p.replaceWith(marker);
  }
});
console.log("DOM: " + doc.body.innerHTML);
