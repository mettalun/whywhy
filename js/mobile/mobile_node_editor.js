function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getGradientStep(node) {
  if (node.type === "problem") {
    return 1;
  }

  if (node.type === "countermeasure") {
    return 7;
  }

  return Math.min(7, Math.max(2, node.level + 1));
}

export function renderMobileNodeEditor(
  rootElement,
  {
    treeModel,
    nodeId,
    onLoad,
    onSave,
    onPdf,
    onBack,
    onCreateNext,
    onCreateBranch,
    onFinalizeCountermeasure,
    onDelete
  }
) {
  rootElement.__mobileEditorCleanup?.();

  const node = treeModel.getNodeSnapshot(nodeId);
  if (!node) {
    onBack();
    return;
  }

  const canCreateNext = Boolean(treeModel.getNextDefinition(node)) && !node.nextId;
  const canFinalizeCountermeasure = node.type === "why" && treeModel.isTerminalNode(node.id);
  const canCreateBranch = treeModel.canCreateSiblingBranchFromNode(node.id);
  const gradientStep = getGradientStep(node);
  const { baseLabel, branchSuffix } = treeModel.getDisplayLabelParts(node.id);
  const displayText = treeModel.getEditableText(node.id);
  const placeholderText = `${baseLabel}${branchSuffix}`;
  const branchHint = canCreateBranch
    ? ""
    : node.type !== "why"
      ? "\u5206\u5c90\u3092\u8ffd\u52a0\u3067\u304d\u308b\u306e\u306f\u3001\u6b21\u306e\u30ce\u30fc\u30c9\u3092\u8ffd\u52a0\u6e08\u307f\u306e\u30ce\u30fc\u30c9\u3060\u3051\u3067\u3059\u3002"
      : "\u5206\u5c90\u3092\u8ffd\u52a0\u3059\u308b\u306b\u306f\u3001\u89aa\u306b\u3042\u305f\u308b\u524d\u6bb5\u306e\u4e3b\u7cfb\u5217\u30ce\u30fc\u30c9\u3092\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002";

  rootElement.innerHTML = `
    <main class="app-shell mobile-flow mobile-editor-screen" data-gradient-step="${gradientStep}">
      <header class="mobile-header mobile-editor-header">
        <div class="mobile-editor-heading">
          <button class="action-button" type="button" data-action="back">\u30e1\u30a4\u30f3\u3078</button>
          <div class="mobile-editor-title-wrap">
            <h1>Why-Why Sheet</h1>
          </div>
        </div>
        <div class="mobile-toolbar">
          <button class="action-button" type="button" data-action="load">\u8aad\u307f\u8fbc\u307f</button>
          <button class="action-button" type="button" data-action="save">\u4fdd\u5b58</button>
          <button class="action-button" type="button" data-action="pdf">PDF</button>
        </div>
      </header>
      <section class="mobile-editor-card" data-type="${node.type}">
        <div class="mobile-editor-label-row">
          <label class="mobile-editor-label" for="mobile-node-text">\u5185\u5bb9</label>
          <div class="mobile-editor-label-meta">${escapeHtml(baseLabel)}<span class="mobile-editor-label-suffix">${escapeHtml(branchSuffix)}</span></div>
        </div>
        <textarea id="mobile-node-text" class="mobile-editor-textarea" rows="1" placeholder="${escapeHtml(placeholderText)}">${escapeHtml(displayText)}</textarea>
        <div class="mobile-editor-actions">
          <button class="action-button" type="button" data-action="next" ${canCreateNext ? "" : "disabled"}>\u6b21\u3092\u8ffd\u52a0 \u2192</button>
          <button class="action-button" type="button" data-action="branch" ${canCreateBranch ? "" : "disabled"}>\u5206\u5c90\u3092\u8ffd\u52a0 \u2193</button>
          <button class="action-button" type="button" data-action="finalize" ${canFinalizeCountermeasure ? "" : "disabled"}>\u5bfe\u7b56\u306b\u78ba\u5b9a</button>
          <button class="action-button" type="button" data-action="delete" ${treeModel.isTerminalNode(node.id) && node.id !== treeModel.rootId ? "" : "disabled"}>\u524a\u9664</button>
        </div>
        ${branchHint ? `<p class="mobile-inline-hint">${escapeHtml(branchHint)}</p>` : ""}
        <p class="mobile-hint">Enter\u76f8\u5f53\u306e\u64cd\u4f5c\u306f\u300c\u6b21\u3092\u8ffd\u52a0\u300d\u3067\u3059\u3002Why5\u306e\u6b21\u306f\u81ea\u52d5\u3067\u5bfe\u7b56\u306b\u306a\u308a\u307e\u3059\u3002</p>
      </section>
    </main>
  `;

  const textarea = rootElement.querySelector("#mobile-node-text");
  const backButton = rootElement.querySelector('[data-action="back"]');
  const titleWrap = rootElement.querySelector(".mobile-editor-title-wrap");

  const syncEditorTitleOffset = () => {
    const backButtonWidth = backButton.getBoundingClientRect().width;
    const titleShift = Math.max(10, Math.round(backButtonWidth * 0.12));
    titleWrap.style.setProperty("--mobile-editor-title-shift", `${titleShift}px`);
  };

  textarea.addEventListener("input", (event) => {
    treeModel.updateNodeText(node.id, event.currentTarget.value);
  });

  const handleHeaderResize = () => syncEditorTitleOffset();
  window.addEventListener("resize", handleHeaderResize);
  window.visualViewport?.addEventListener("resize", handleHeaderResize);

  rootElement.__mobileEditorCleanup = () => {
    window.removeEventListener("resize", handleHeaderResize);
    window.visualViewport?.removeEventListener("resize", handleHeaderResize);
    delete rootElement.__mobileEditorCleanup;
  };

  syncEditorTitleOffset();
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  rootElement.querySelector('[data-action="back"]').addEventListener("click", onBack);
  rootElement.querySelector('[data-action="load"]').addEventListener("click", onLoad);
  rootElement.querySelector('[data-action="save"]').addEventListener("click", onSave);
  rootElement.querySelector('[data-action="pdf"]').addEventListener("click", onPdf);
  rootElement.querySelector('[data-action="next"]').addEventListener("click", onCreateNext);
  rootElement.querySelector('[data-action="branch"]').addEventListener("click", onCreateBranch);
  rootElement.querySelector('[data-action="finalize"]').addEventListener("click", onFinalizeCountermeasure);
  rootElement.querySelector('[data-action="delete"]').addEventListener("click", onDelete);
}
