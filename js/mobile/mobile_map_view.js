import { renderConnections } from "../core/renderer_svg.js";

const PROBLEM_LABEL = "\u554f\u984c\u30fb\u73fe\u8c61";
const LOAD_LABEL = "\u8aad\u307f\u8fbc\u307f";
const SAVE_LABEL = "\u4fdd\u5b58";
const FOOTER_CAPTION =
  "WhyWhy Sheet\u306f\u3001\u306a\u305c\u306a\u305c\u5206\u6790\u3092\u30d6\u30e9\u30a6\u30b6\u3067\u7121\u6599\u4f5c\u6210\u3067\u304d\u308b\u539f\u56e0\u5206\u6790\u30c4\u30fc\u30eb\u3067\u3059\u3002 " +
  "\u30c9\u30e9\u30c3\u30b0\u64cd\u4f5c\u30675Why\u3092\u6574\u7406\u3001\u7d19\u3088\u308a\u901f\u304f\u66f8\u304d\u76f4\u3057\u30bc\u30ed\u3002 " +
  "PC\u30fb\u30b9\u30de\u30db\u5bfe\u5fdc\u3001\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u4e0d\u8981\u3001for PC\u306f PDF\u51fa\u529b\u5bfe\u5fdc\u3002";

function getMobileNodeText(node) {
  const trimmedText = node.text.trim();
  if (trimmedText.length > 0) {
    return node.text;
  }

  if (node.type === "problem") {
    return PROBLEM_LABEL;
  }

  return node.text;
}

export function renderMobileMapView(
  rootElement,
  { layout, onLoad, onSave, onNodeSelect, onBranchAction, canBranchFromNode, shouldAnimateLoadButton, shouldAnimateProblemNode }
) {
  const { nodes, metrics } = layout;
  const scale = 0.34;
  const previewWidth = Math.max(320, Math.round(metrics.width * scale));
  const previewHeight = Math.max(240, Math.round(metrics.height * scale));

  rootElement.innerHTML = `
    <main class="app-shell mobile-flow mobile-map-screen">
      <header class="mobile-header">
        <div class="mobile-title-group">
          <img class="mobile-title-icon" src="./image/icom64.png" alt="" aria-hidden="true">
          <h1>WhyWhy Sheet&#12288;<span class="app-title-suffix">for SP</span></h1>
        </div>
        <div class="mobile-toolbar">
          <button class="action-button${shouldAnimateLoadButton ? " action-button-blink" : ""}" type="button" data-action="load">${LOAD_LABEL}</button>
          <button class="action-button" type="button" data-action="save">${SAVE_LABEL}</button>
        </div>
      </header>
      <section class="mobile-map-panel">
        <div class="mobile-map-stage" style="height:${previewHeight}px;">
          <div class="mobile-map-preview" style="width:${previewWidth}px;height:${previewHeight}px;">
            <svg class="mobile-map-lines" aria-hidden="true"></svg>
            <div class="mobile-map-nodes"></div>
          </div>
        </div>
      </section>
      <div class="mobile-footer-caption" aria-hidden="true">${FOOTER_CAPTION}</div>
    </main>
  `;

  const preview = rootElement.querySelector(".mobile-map-preview");
  const lineLayer = rootElement.querySelector(".mobile-map-lines");
  const nodeLayer = rootElement.querySelector(".mobile-map-nodes");
  rootElement.querySelector('[data-action="load"]').addEventListener("click", onLoad);
  rootElement.querySelector('[data-action="save"]').addEventListener("click", onSave);

  preview.style.setProperty("--map-scale", scale);
  renderConnections(lineLayer, nodes, metrics, {
    onBranchSlotClick: onBranchAction,
    canBranchFromNode
  });
  lineLayer.style.transform = `scale(${scale})`;
  lineLayer.style.transformOrigin = "top left";
  lineLayer.style.pointerEvents = "all";

  for (const node of nodes) {
    const nodeButton = document.createElement("button");
    nodeButton.className = "mobile-map-node";
    nodeButton.type = "button";
    nodeButton.dataset.type = node.type;
    if (node.type === "problem" && !shouldAnimateProblemNode?.(node.id)) {
      nodeButton.classList.add("mobile-problem-animation-stopped");
    }
    nodeButton.style.left = `${node.x * scale}px`;
    nodeButton.style.top = `${node.y * scale}px`;
    nodeButton.style.width = `${metrics.nodeWidth * scale}px`;
    nodeButton.style.height = `${metrics.nodeHeight * scale}px`;
    nodeButton.textContent = getMobileNodeText(node);
    nodeButton.addEventListener("click", () => onNodeSelect(node.id));
    nodeLayer.appendChild(nodeButton);
  }
}
