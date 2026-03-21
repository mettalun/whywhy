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
          <h1>Why-Why Sheet　<span class="app-title-suffix">for SP</span></h1>
        </div>
        <div class="mobile-toolbar">
          <button class="action-button${shouldAnimateLoadButton ? " action-button-blink" : ""}" type="button" data-action="load">\u8aad\u307f\u8fbc\u307f</button>
          <button class="action-button" type="button" data-action="save">\u4fdd\u5b58</button>
        </div>
      </header>
      <section class="mobile-map-panel">
        <div class="mobile-map-stage" style="height:${previewHeight}px;">
          <div class="mobile-map-preview" style="width:${previewWidth}px;height:${previewHeight}px;">
            <svg class="mobile-map-lines" aria-hidden="true"></svg>
            <div class="mobile-map-nodes"></div>
          </div>
        </div>
        <p class="mobile-hint">WhyWhy Sheetは、なぜなぜ分析をブラウザで無料作成できる原因分析ツールです。</p>
        <p class="mobile-hint">ドラッグ操作で5Whyを整理、紙より速く書き直しゼロ。</p>
        <p class="mobile-hint mobile-hint-warning">PC・スマホ対応、インストール不要、for PCは PDF出力対応。</p>
      </section>
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
