import { renderConnections } from "../core/renderer_svg.js";

function getMobileNodeText(node) {
  const trimmedText = node.text.trim();
  if (trimmedText.length > 0) {
    return node.text;
  }

  if (node.type === "problem") {
    return "\u554f\u984c\u30fb\u73fe\u8c61";
  }

  return node.text;
}

export function renderMobileMapView(
  rootElement,
  { layout, onLoad, onSave, onPdf, onNodeSelect, onBranchAction, canBranchFromNode }
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
          <h1>Why-Why Sheet</h1>
        </div>
        <div class="mobile-toolbar">
          <button class="action-button" type="button" data-action="load">\u8aad\u307f\u8fbc\u307f</button>
          <button class="action-button" type="button" data-action="save">\u4fdd\u5b58</button>
          <button class="action-button" type="button" data-action="pdf">PDF</button>
        </div>
      </header>
      <section class="mobile-map-panel">
        <div class="mobile-map-stage" style="height:${previewHeight}px;">
          <div class="mobile-map-preview" style="width:${previewWidth}px;height:${previewHeight}px;">
            <svg class="mobile-map-lines" aria-hidden="true"></svg>
            <div class="mobile-map-nodes"></div>
          </div>
        </div>
        <p class="mobile-hint">\u30ce\u30fc\u30c9\u3092\u30bf\u30c3\u30d7\u3057\u3066\u7de8\u96c6\u3002</p>
      </section>
    </main>
  `;

  const preview = rootElement.querySelector(".mobile-map-preview");
  const lineLayer = rootElement.querySelector(".mobile-map-lines");
  const nodeLayer = rootElement.querySelector(".mobile-map-nodes");
  rootElement.querySelector('[data-action="load"]').addEventListener("click", onLoad);
  rootElement.querySelector('[data-action="save"]').addEventListener("click", onSave);
  rootElement.querySelector('[data-action="pdf"]').addEventListener("click", onPdf);

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
    nodeButton.style.left = `${node.x * scale}px`;
    nodeButton.style.top = `${node.y * scale}px`;
    nodeButton.style.width = `${metrics.nodeWidth * scale}px`;
    nodeButton.style.height = `${metrics.nodeHeight * scale}px`;
    nodeButton.textContent = getMobileNodeText(node);
    nodeButton.addEventListener("click", () => onNodeSelect(node.id));
    nodeLayer.appendChild(nodeButton);
  }
}
