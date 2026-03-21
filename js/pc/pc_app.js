import { TreeModel } from "../core/tree_model.js";
import { downloadJsonFile, parseJsonFileContent, promptJsonFile } from "../core/file_io.js";
import { exportTreeToPdf } from "../core/pdf_exporter.js";
import { layoutTree } from "../core/layout_engine.js";
import { PcEditor } from "./pc_editor.js";
import { PcInteraction } from "./pc_interaction.js";

export function createPcApp(rootElement) {
  rootElement.innerHTML = `
    <main class="app-shell pc-shell">
      <header class="pc-topbar">
        <div class="pc-heading">
          <img class="pc-heading-icon" src="./image/icom64.png" alt="" aria-hidden="true">
          <h1>Why-Why Sheet</h1>
        </div>
        <div class="pc-toolbar" aria-label="\u30d5\u30a1\u30a4\u30eb\u64cd\u4f5c">
          <button class="action-button" type="button" data-action="load">\u8aad\u307f\u8fbc\u307f</button>
          <button class="action-button" type="button" data-action="save">json\u4fdd\u5b58</button>
          <button class="action-button" type="button" data-action="pdf">PDF\u51fa\u529b</button>
        </div>
      </header>
      <section class="pc-workspace" aria-label="\u306a\u305c\u306a\u305c\u5206\u6790\u30ef\u30fc\u30af\u30b9\u30da\u30fc\u30b9" data-panning="false">
        <div class="pc-drop-hint" data-drop-hint hidden>\u3053\u3053\u306b\u30c9\u30e9\u30c3\u30b0\u3057\u3066\u8aad\u307f\u8fbc\u307f</div>
        <div class="pc-stage">
          <div class="pc-canvas">
            <svg class="connection-layer" aria-hidden="true"></svg>
            <div class="branch-layer"></div>
            <div class="node-layer"></div>
          </div>
        </div>
      </section>
    </main>
  `;

  const treeModel = new TreeModel();
  const workspaceElement = rootElement.querySelector(".pc-workspace");
  const stageElement = rootElement.querySelector(".pc-stage");
  const canvasElement = rootElement.querySelector(".pc-canvas");
  const dropHintElement = rootElement.querySelector("[data-drop-hint]");
  const viewState = {
    scale: 1,
    minScale: 0.2,
    maxScale: 2.4
  };
  const panState = {
    active: false,
    startClientX: 0,
    startClientY: 0,
    startScrollLeft: 0,
    startScrollTop: 0
  };
  let loadMode = false;
  let dragDepth = 0;

  function clampScale(scale) {
    return Math.min(viewState.maxScale, Math.max(viewState.minScale, scale));
  }

  function getCanvasSize() {
    return {
      width: Number.parseFloat(canvasElement.style.width) || canvasElement.offsetWidth || 0,
      height: Number.parseFloat(canvasElement.style.height) || canvasElement.offsetHeight || 0
    };
  }

  function updateMinScale() {
    const { width, height } = getCanvasSize();
    if (width <= 0 || height <= 0) {
      viewState.minScale = 0.2;
      return;
    }

    const fitWidth = Math.max(workspaceElement.clientWidth - 32, 160) / width;
    const fitHeight = Math.max(workspaceElement.clientHeight - 32, 160) / height;
    const fitScale = Math.min(1, fitWidth, fitHeight);
    viewState.minScale = Math.max(0.08, fitScale);
  }

  function syncViewport() {
    updateMinScale();
    viewState.scale = clampScale(viewState.scale);
    const { width, height } = getCanvasSize();
    stageElement.style.width = `${Math.max(width * viewState.scale, workspaceElement.clientWidth)}px`;
    stageElement.style.height = `${Math.max(height * viewState.scale, workspaceElement.clientHeight)}px`;
    canvasElement.style.transform = `scale(${viewState.scale})`;
    workspaceElement.dataset.panning = panState.active ? "true" : "false";
  }

  const editor = new PcEditor({
    treeModel,
    canvasElement,
    branchLayerElement: rootElement.querySelector(".branch-layer"),
    nodeLayerElement: rootElement.querySelector(".node-layer"),
    connectionLayerElement: rootElement.querySelector(".connection-layer"),
    onRenderComplete: syncViewport
  });
  const interaction = new PcInteraction({
    treeModel,
    editor,
    confirmation: (message) => window.confirm(message)
  });

  interaction.render();
  syncViewport();

  function setLoadMode(active) {
    loadMode = active;
    dragDepth = active ? dragDepth : 0;
    workspaceElement.dataset.loadMode = active ? "true" : "false";
    workspaceElement.dataset.dragActive = active && dragDepth > 0 ? "true" : "false";
    dropHintElement.hidden = !active;
  }

  function zoomAt(clientX, clientY, nextScale) {
    const scale = clampScale(nextScale);
    if (Math.abs(scale - viewState.scale) < 0.001) {
      return;
    }

    const workspaceRect = workspaceElement.getBoundingClientRect();
    const stageRect = stageElement.getBoundingClientRect();
    const relativeX = clientX - workspaceRect.left;
    const relativeY = clientY - workspaceRect.top;
    const insetX = stageRect.left - workspaceRect.left + workspaceElement.scrollLeft;
    const insetY = stageRect.top - workspaceRect.top + workspaceElement.scrollTop;
    const contentX = (workspaceElement.scrollLeft + relativeX - insetX) / viewState.scale;
    const contentY = (workspaceElement.scrollTop + relativeY - insetY) / viewState.scale;

    viewState.scale = scale;
    syncViewport();
    workspaceElement.scrollLeft = contentX * scale - relativeX + insetX;
    workspaceElement.scrollTop = contentY * scale - relativeY + insetY;
  }

  function canStartPan(target) {
    const element =
      target instanceof Element ? target : target && target.parentElement instanceof Element ? target.parentElement : null;
    if (!element) {
      return true;
    }

    return !element.closest(
      '.why-node-card, .why-node, .node-delete-button, .node-finalize-button, .branch-slot, [data-branch-button="true"]'
    );
  }

  function stopPan() {
    panState.active = false;
    workspaceElement.dataset.panning = "false";
  }

  function applyFileContent(fileText) {
    const payload = parseJsonFileContent(fileText);
    treeModel.replaceFromSerializedTree(payload);
    interaction.render(treeModel.rootId);
    window.requestAnimationFrame(() => {
      interaction.render(treeModel.rootId);
    });
    setLoadMode(false);
  }

  function syncLayoutToModel() {
    const layout = layoutTree(treeModel.getNodes(), treeModel.rootId);
    treeModel.applyNodePositions(layout.nodes);
    return layout;
  }

  rootElement.querySelector('[data-action="save"]').addEventListener("click", () => {
    syncLayoutToModel();
    downloadJsonFile(treeModel.serialize());
  });

  rootElement.querySelector('[data-action="pdf"]').addEventListener("click", () => {
    try {
      syncLayoutToModel();
      exportTreeToPdf(treeModel, {
        title: "Why-Why Analysis Sheet"
      });
    } catch (error) {
      window.alert(error.message);
    }
  });

  rootElement.querySelector('[data-action="load"]').addEventListener("click", async () => {
    setLoadMode(true);
    try {
      const selectedFile = await promptJsonFile();
      if (!selectedFile) {
        return;
      }

      applyFileContent(selectedFile.text);
    } catch (error) {
      window.alert(error.message);
    } finally {
      if (loadMode) {
        setLoadMode(false);
      }
    }
  });

  workspaceElement.addEventListener("dragenter", (event) => {
    if (!loadMode || !Array.from(event.dataTransfer?.types || []).includes("Files")) {
      return;
    }

    event.preventDefault();
    dragDepth += 1;
    workspaceElement.dataset.dragActive = "true";
  });

  workspaceElement.addEventListener("dragover", (event) => {
    if (!loadMode || !Array.from(event.dataTransfer?.types || []).includes("Files")) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    workspaceElement.dataset.dragActive = "true";
  });

  workspaceElement.addEventListener("dragleave", (event) => {
    if (!loadMode || !Array.from(event.dataTransfer?.types || []).includes("Files")) {
      return;
    }

    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    workspaceElement.dataset.dragActive = dragDepth > 0 ? "true" : "false";
  });

  workspaceElement.addEventListener("drop", async (event) => {
    if (!loadMode || !Array.from(event.dataTransfer?.types || []).includes("Files")) {
      return;
    }

    event.preventDefault();
    dragDepth = 0;
    workspaceElement.dataset.dragActive = "false";

    try {
      const [file] = Array.from(event.dataTransfer?.files || []);
      if (!file) {
        setLoadMode(false);
        return;
      }

      const text = await file.text();
      applyFileContent(text);
    } catch (error) {
      setLoadMode(false);
      window.alert(error.message || "JSON\u30d5\u30a1\u30a4\u30eb\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
    }
  });

  const handleWheel = (event) => {
    if (loadMode) {
      return;
    }

    event.preventDefault();
    zoomAt(event.clientX, event.clientY, viewState.scale * Math.exp(-event.deltaY * 0.0015));
  };

  const handleMouseDown = (event) => {
    if (loadMode || event.button !== 0 || !canStartPan(event.target)) {
      return;
    }

    panState.active = true;
    panState.startClientX = event.clientX;
    panState.startClientY = event.clientY;
    panState.startScrollLeft = workspaceElement.scrollLeft;
    panState.startScrollTop = workspaceElement.scrollTop;
    workspaceElement.dataset.panning = "true";
    event.preventDefault();
  };

  const handleMouseMove = (event) => {
    if (!panState.active) {
      return;
    }

    workspaceElement.scrollLeft = panState.startScrollLeft - (event.clientX - panState.startClientX);
    workspaceElement.scrollTop = panState.startScrollTop - (event.clientY - panState.startClientY);
  };

  const handleMouseUp = () => {
    stopPan();
  };

  workspaceElement.addEventListener("wheel", handleWheel, { passive: false });
  workspaceElement.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("resize", syncViewport);

  return {
    destroy() {
      workspaceElement.removeEventListener("wheel", handleWheel);
      workspaceElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", syncViewport);
      editor.destroy();
    }
  };
}
